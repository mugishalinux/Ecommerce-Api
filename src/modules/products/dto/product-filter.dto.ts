import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ProductFilterDto {
  @ApiProperty({ 
    required: false, 
    description: 'Search by product name (case-insensitive partial match)',
    example: 'laptop'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Filter by exact category name',
    example: 'Electronics'
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Minimum price filter',
    example: 50,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Minimum price cannot be negative' })
  minPrice?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Maximum price filter',
    example: 500,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Maximum price cannot be negative' })
  maxPrice?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Show only products in stock (stock > 0)',
    example: true,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @ApiProperty({ 
    required: false, 
    description: 'Sort by field: name, price, stock, created_at',
    example: 'price',
    default: 'created_at',
    enum: ['name', 'price', 'stock', 'created_at']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Sort order: ASC or DESC',
    example: 'ASC',
    default: 'DESC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
