import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginOtpDto {
  @ApiProperty({ 
    example: '123456', 
    description: '6-digit OTP code sent to email',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}
