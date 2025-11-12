import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { RoleEnum } from '../enums/role.enum'; 

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Username (alphanumeric only)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'Username must be alphanumeric (letters and numbers only, no special characters or spaces)',
  })
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePass@123',
    description: 'Password (min 8 chars, must include uppercase, lowercase, number, and special character)'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
  })
  password: string;

  @ApiProperty({
    example: RoleEnum.USER,
    enum: [RoleEnum.USER, RoleEnum.SELLER],
    description: 'User role (must be either user or seller)',
  })
  @IsIn([RoleEnum.USER, RoleEnum.SELLER], {
    message: 'Role must be either user or seller',
  })
  @IsNotEmpty()
  role: RoleEnum;
}