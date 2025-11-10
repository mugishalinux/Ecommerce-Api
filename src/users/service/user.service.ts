import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { User } from "../entity/user.entity";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { RoleEnum } from "../enums/role.enum";
import { JwtService } from "@nestjs/jwt";
import { ResponseService } from "src/response/response.service";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly response: ResponseService,
    private readonly jwtService: JwtService,
  ) {}

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
      user.role = RoleEnum.USER;

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

    const payload = { 
      userId: user.id, 
      username: user.username, 
      email: user.email,
      role: user.role 
    };
    
    const token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRATION || '7d',
    });

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
