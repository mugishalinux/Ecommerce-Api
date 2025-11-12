import { Body, Controller, Post, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../service/user.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { LoginOtpDto } from '../dto/login-otp.dto';
import { AuthGuarded } from 'src/modules/auth/roles.decorator';
import { RoleEnum } from '../enums/role.enum';

@ApiTags('Authentication')
@Controller({ version: '1', path: '/auth' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed or email/username already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.userService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Request login - sends OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent to email successfully' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and complete login' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT token returned' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() loginOtpDto: LoginOtpDto) {
    return this.userService.verifyLoginOtp(loginOtpDto);
  }

  @Post('logout')
  @AuthGuarded(RoleEnum.USER, RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async logout(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new Error('Authorization header is required');
    }
    const token = authorization.split(' ')[1];
    return this.userService.logout(token);
  }
}
