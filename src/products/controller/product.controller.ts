import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductService } from '../service/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AuthGuarded } from '../../auth/roles.decorator';
import { RoleEnum } from '../../users/enums/role.enum';

@ApiTags('Products')
@Controller({ version: '1', path: '/products' })
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @AuthGuarded(RoleEnum.SELLER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async createProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productService.createProduct(createProductDto, req.user.id);
  }

  @Put(':id')
  @AuthGuarded(RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiOperation({ summary: 'Update an existing product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productService.updateProduct(id, updateProductDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and search' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search products by name' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getAllProducts(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.productService.getAllProducts(limit, page, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Get('/by-user-id')
  @AuthGuarded(RoleEnum.SELLER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Get all products created by user' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No products found for this user' })
  async getProductsByUser(@Request() req) {
    return this.productService.getProductsByUser(req.user.id);
  }


  @Delete(':id')
  @AuthGuarded(RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiOperation({ summary: 'Delete a product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async deleteProduct(@Param('id') id: string, @Request() req) {
    return this.productService.deleteProduct(id, req.user.id, req.user.role);
  }
}
