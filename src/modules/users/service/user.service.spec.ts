import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { ResponseService } from '../../response/response.service';
import { RedisHelper } from '../../helpers/redis-helper';
import { EventHelper } from '../../helpers/events.helper';
import { User } from '../entity/user.entity';
import { BadRequestException } from '@nestjs/common';
import { RoleEnum } from '../enums/role.enum';
import * as bcrypt from 'bcrypt';
import {
  mockJwtService,
  mockResponseService,
  mockRedisHelper,
  mockEventHelper,
  createMockUser,
  resetAllMocks,
} from '../../../test/test-helpers';

// Mock the User entity
jest.mock('../entity/user.entity');

// Mock bcrypt
jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let jwtService: JwtService;
  let responseService: ResponseService;
  let redisHelper: RedisHelper;
  let eventHelper: EventHelper;

  beforeEach(async () => {
    resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ResponseService,
          useValue: mockResponseService,
        },
        {
          provide: RedisHelper,
          useValue: mockRedisHelper,
        },
        {
          provide: EventHelper,
          useValue: mockEventHelper,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    responseService = module.get<ResponseService>(ResponseService);
    redisHelper = module.get<RedisHelper>(RedisHelper);
    eventHelper = module.get<EventHelper>(EventHelper);
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test@123',
      role: RoleEnum.USER,
    };

    it('should register a new user successfully', async () => {
      jest.spyOn(service, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(service, 'findUserByUsername').mockResolvedValue(null);

      const mockUser = createMockUser({ id: 'new-user-id' });
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      (User as any).mockImplementation(() => mockUser);

      const result = await service.register(registerDto);

      expect(service.findUserByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(service.findUserByUsername).toHaveBeenCalledWith(registerDto.username);
      expect(mockUser.save).toHaveBeenCalled();
      expect(responseService.postResponse).toHaveBeenCalledWith('new-user-id');
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException if email already exists', async () => {
      const existingUser = createMockUser();
      jest.spyOn(service, 'findUserByEmail').mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('Email has already been used'),
      );
    });

    it('should throw BadRequestException if username already exists', async () => {
      const existingUser = createMockUser();
      jest.spyOn(service, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(service, 'findUserByUsername').mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('Username has already been used'),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Test@123',
    };

    it('should send OTP on successful credentials', async () => {
      const mockUser = createMockUser();
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      mockRedisHelper.set.mockResolvedValue(undefined);
      mockEventHelper.sendEvent.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(redisHelper.set).toHaveBeenCalled();
      expect(eventHelper.sendEvent).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('OTP sent');
    });

    it('should throw BadRequestException for invalid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('Invalid credentials'),
      );
    });
  });

  describe('verifyLoginOtp', () => {
    const loginOtpDto = { otp: '123456' };

    it('should return JWT token for valid OTP', async () => {
      const mockUser = createMockUser();
      mockRedisHelper.get.mockResolvedValue(mockUser);
      mockRedisHelper.del.mockResolvedValue(1);
      mockRedisHelper.set.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.verifyLoginOtp(loginOtpDto);

      expect(redisHelper.get).toHaveBeenCalledWith(`login-otp-${loginOtpDto.otp}`);
      expect(redisHelper.del).toHaveBeenCalledWith(`login-otp-${loginOtpDto.otp}`);
      expect(jwtService.sign).toHaveBeenCalled();
      expect(redisHelper.set).toHaveBeenCalledWith(
        'active-token-mock-jwt-token',
        mockUser.id,
        604800,
      );
      expect(result.success).toBe(true);
      expect(result.object).toHaveProperty('token');
      expect(result.object).toHaveProperty('user');
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      mockRedisHelper.get.mockResolvedValue(null);

      await expect(service.verifyLoginOtp(loginOtpDto)).rejects.toThrow(
        new BadRequestException('Invalid or expired OTP'),
      );
    });
  });

  describe('logout', () => {
    const token = 'mock-jwt-token';

    it('should logout user successfully', async () => {
      mockRedisHelper.del.mockResolvedValue(1);

      const result = await service.logout(token);

      expect(redisHelper.del).toHaveBeenCalledWith(`active-token-${token}`);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });

    it('should throw BadRequestException on logout failure', async () => {
      mockRedisHelper.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.logout(token)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const mockUser = createMockUser();
      jest.spyOn(service, 'findUserByEmail').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'Test@123');

      expect(result).toEqual(mockUser);
      expect(bcrypt.compare).toHaveBeenCalledWith('Test@123', mockUser.password);
    });

    it('should return null for invalid email', async () => {
      jest.spyOn(service, 'findUserByEmail').mockResolvedValue(null);

      const result = await service.validateUser('invalid@example.com', 'Test@123');

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const mockUser = createMockUser();
      jest.spyOn(service, 'findUserByEmail').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'WrongPass@123');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = createMockUser();
      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findUserByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserByUsername', () => {
    it('should find user by username', async () => {
      const mockUser = createMockUser();
      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findUserByUsername('testuser');

      expect(User.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockUser = createMockUser();
      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      const result = await service.findById('user-id-123');

      expect(User.findOne).toHaveBeenCalledWith({ where: { id: 'user-id-123' } });
      expect(result).toEqual(mockUser);
    });
  });
});
