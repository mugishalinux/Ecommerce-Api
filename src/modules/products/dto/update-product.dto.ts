import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @ApiProperty({ example: 'Wireless Headphones Pro', description: 'Product name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  name?: string;

  @ApiProperty({ 
    example: 'Premium wireless headphones with advanced noise cancellation', 
    description: 'Product description',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description?: string;

  @ApiProperty({ example: 129.99, description: 'Product price', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price?: number;

  @ApiProperty({ example: 30, description: 'Available stock quantity', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Stock must be a non-negative integer' })
  stock?: number;

  @ApiProperty({ example: 'Audio', description: 'Product category', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
