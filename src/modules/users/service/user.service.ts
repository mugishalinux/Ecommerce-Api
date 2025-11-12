import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { User } from "../entity/user.entity";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { LoginOtpDto } from "../dto/login-otp.dto";
import { RoleEnum } from "../enums/role.enum";
import { JwtService } from "@nestjs/jwt";
import { ResponseService } from "src/modules/response/response.service";
import { RedisHelper } from "src/modules/helpers/redis-helper";
import { EventHelper } from "src/modules/helpers/events.helper";
import { SendEmailDto } from "../dto/send-email.dto";
const otpGenerator = require("otp-generator");

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly response: ResponseService,
    private readonly jwtService: JwtService,
    private readonly redisHelper: RedisHelper,
    private readonly eventHelper: EventHelper,
  ) { }

  async register(registerDto: RegisterDto) {
    const foundUserEmail = await this.findUserByEmail(registerDto.email);
    if (foundUserEmail) {
      this.logger.warn(`Email already used: ${registerDto.email}`);
      throw new BadRequestException("Email has already been used");
    }

    const foundUsername = await this.findUserByUsername(registerDto.username);
    if (foundUsername) {
      this.logger.warn(`Username already used: ${registerDto.username}`);
      throw new BadRequestException("Username has already been used");
    }

    try {
      const user = new User();
      user.username = registerDto.username;
      user.email = registerDto.email;
      user.password = registerDto.password;
      user.role = registerDto.role;

      const data = await user.save();
      this.logger.log(`User successfully registered with ID: ${data.id}`);
      return this.response.postResponse(data.id);
    } catch (e) {
      this.logger.error("Registration failed", e);
      throw new BadRequestException("Registration failed: " + e.message);
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new BadRequestException("Invalid credentials");
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      digits: true,
      lowerCaseAlphabets: false,
    });

    this.logger.log(`Generated OTP for ${user.email}: ${otp}`);
    
    await this.redisHelper.set(`login-otp-${otp}`, user, 600);

    const emailDto: SendEmailDto = {
      email: user.email,
      message: `Your login verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`,
      username: user.username,
    };

    try {
      await this.eventHelper.sendEvent(
        "Send Login OTP",
        emailDto,
        process.env.SEND_EMAIL_REQUEST_TOPIC!,
      );
    } catch (e) {
      this.logger.warn("Failed to send email via Kafka", e);
    }

    return this.response.customRespose(
      "OTP sent to your email. Please verify to complete login.",
      HttpStatus.OK,
      { 
        email: user.email,
        message: "Check your console logs for OTP in development mode"
      }
    );
  }

  async verifyLoginOtp(loginOtpDto: LoginOtpDto) {
    const user = await this.redisHelper.get(`login-otp-${loginOtpDto.otp}`);
    
    if (!user) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    await this.redisHelper.del(`login-otp-${loginOtpDto.otp}`);

    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRATION || '7d',
    });

    await this.redisHelper.set(`active-token-${token}`, user.id, 604800);

    this.logger.log(`User ${user.email} logged in successfully with OTP verification`);

    return this.response.fetchResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  }

  async logout(token: string) {
    try {
      await this.redisHelper.del(`active-token-${token}`);
      this.logger.log(`User logged out, token invalidated`);
      
      return this.response.customRespose(
        "Logged out successfully",
        HttpStatus.OK
      );
    } catch (e) {
      this.logger.error("Logout failed", e);
      throw new BadRequestException("Logout failed: " + e.message);
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }

  async findUserByEmail(email: string) {
    return User.findOne({ where: { email } });
  }

  async findUserByUsername(username: string) {
    return User.findOne({ where: { username } });
  }

  async findById(id: string) {
    return User.findOne({ where: { id } });
  }

  async seedAdmin() {
    const adminData: RegisterDto = {
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@ecommerce.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: RoleEnum.ADMIN
    };

    try {
      const existingAdmin = await User.findOne({
        where: { username: adminData.username }
      });

      if (existingAdmin) {
        this.logger.log('Admin user already exists, skipping seeding.');
        return;
      }

      const user = new User();
      user.username = adminData.username;
      user.email = adminData.email;
      user.password = adminData.password;
      user.role = RoleEnum.ADMIN;

      const data = await user.save();
      this.logger.log(`Admin user seeded successfully with ID: ${data.id}`);
      return this.response.postResponse(data.id);
    } catch (e) {
      this.logger.error("Admin seeding failed", e);
    }
  }
}
