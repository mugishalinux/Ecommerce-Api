import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductService } from '../service/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';
import { AuthGuarded } from '../../auth/roles.decorator';
import { RoleEnum } from '../../users/enums/role.enum';

@ApiTags('Products')
@Controller({ version: '1', path: '/products' })
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @AuthGuarded(RoleEnum.SELLER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create a new product (Seller/Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - Seller/Admin access required' })
  async createProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productService.createProduct(createProductDto, req.user.id);
  }

  @Put(':id')
  @AuthGuarded(RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiOperation({ summary: 'Update an existing product (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own products' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productService.updateProduct(id, updateProductDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination, search and advanced filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search products by name', example: 'laptop' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category', example: 'Electronics' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price', example: 50 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price', example: 500 })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean, description: 'Only in-stock products', example: true })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field (name, price, stock, created_at)', example: 'price' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'ASC' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getAllProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStock') inStock?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filters: ProductFilterDto = {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      sortBy,
      sortOrder,
    };
    
    return this.productService.getAllProducts(limit!, page!, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Get('by-user/me')
  @AuthGuarded(RoleEnum.SELLER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Get all products created by current user' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No products found for this user' })
  async getProductsByUser(@Request() req) {
    return this.productService.getProductsByUser(req.user.id);
  }

  @Delete(':id')
  @AuthGuarded(RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiOperation({ summary: 'Delete a product (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own products' })
  async deleteProduct(@Param('id') id: string, @Request() req) {
    return this.productService.deleteProduct(id, req.user.id, req.user.role);
  }
}
