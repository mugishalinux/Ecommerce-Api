import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Product } from "../entity/product.entity";
import { CreateProductDto } from "../dto/create-product.dto";
import { UpdateProductDto } from "../dto/update-product.dto";
import { ProductFilterDto } from "../dto/product-filter.dto";
import { ResponseService } from "../../response/response.service";
import { FilterHelper } from "../../helpers/filter.helper";
import { RedisHelper } from "../../helpers/redis-helper";

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly response: ResponseService,
    private readonly filter: FilterHelper,
    private readonly redisHelper: RedisHelper,
  ) { }

  async createProduct(createProductDto: CreateProductDto, userId: string) {
    try {
      const product = new Product();
      product.name = createProductDto.name;
      product.description = createProductDto.description;
      product.price = createProductDto.price;
      product.stock = createProductDto.stock;
      product.category = createProductDto.category;
      product.user = { id: userId } as any;

      const savedProduct = await product.save();
      this.logger.log(`Product created successfully with ID: ${savedProduct.id}`);

      await this.invalidateProductCache();

      return this.response.postResponse(savedProduct.id);
    } catch (e) {
      this.logger.error("Failed to create product", e);
      throw new BadRequestException("Failed to create product: " + e.message);
    }
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto, userId: string) {
    const product = await Product.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.user.id !== userId) {
      throw new BadRequestException("You can only update your own products");
    }

    try {
      if (updateProductDto.name !== undefined) {
        product.name = updateProductDto.name;
      }
      if (updateProductDto.description !== undefined) {
        product.description = updateProductDto.description;
      }
      if (updateProductDto.price !== undefined) {
        product.price = updateProductDto.price;
      }
      if (updateProductDto.stock !== undefined) {
        product.stock = updateProductDto.stock;
      }
      if (updateProductDto.category !== undefined) {
        product.category = updateProductDto.category;
      }

      await product.save();
      this.logger.log(`Product updated successfully: ${id}`);

      await this.invalidateProductCache();

      return this.response.updateResponse(id);
    } catch (e) {
      this.logger.error("Failed to update product", e);
      throw new BadRequestException("Failed to update product: " + e.message);
    }
  }

  async getAllProducts(pageSize: number, pageNumber: number, filters?: ProductFilterDto) {
    try {
      const cacheKey = `products-page-${pageNumber}-size-${pageSize}-filters-${JSON.stringify(filters || {})}`;
      const cachedData = await this.redisHelper.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Returning cached products for: ${cacheKey}`);
        return cachedData;
      }

      const queryBuilder = Product.createQueryBuilder('product')
        .leftJoinAndSelect('product.user', 'user');

      // Apply search filter
      if (filters?.search && filters.search.trim() !== '') {
        queryBuilder.where('product.name LIKE :search', {
          search: `%${filters.search}%`,
        });
      }

      // Apply category filter
      if (filters?.category) {
        queryBuilder.andWhere('product.category = :category', {
          category: filters.category,
        });
      }

      // Apply minimum price filter
      if (filters?.minPrice !== undefined) {
        queryBuilder.andWhere('product.price >= :minPrice', {
          minPrice: filters.minPrice,
        });
      }

      // Apply maximum price filter
      if (filters?.maxPrice !== undefined) {
        queryBuilder.andWhere('product.price <= :maxPrice', {
          maxPrice: filters.maxPrice,
        });
      }

      // Apply in-stock filter
      if (filters?.inStock) {
        queryBuilder.andWhere('product.stock > 0');
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'DESC';
      
      // Validate sortBy to prevent SQL injection
      const allowedSortFields = ['name', 'price', 'stock', 'created_at'];
      if (!allowedSortFields.includes(sortBy)) {
        throw new BadRequestException(`Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`);
      }
      
      queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

      // Apply pagination
      const take = pageSize || 10;
      const skip = ((pageNumber || 1) - 1) * take;

      const [data, total] = await queryBuilder
        .skip(skip)
        .take(take)
        .getManyAndCount();

      const totalPages = Math.ceil(total / take);

      const result = {
        success: true,
        message: "Data retrieved successfully",
        object: data,
        pageNumber: pageNumber || 1,
        pageSize: take,
        totalSize: total,
        totalPages,
        errors: null,
      };

      // Cache the result
      await this.redisHelper.set(cacheKey, result, 300); // 5 minutes cache
      this.logger.log(`Cached products for: ${cacheKey}`);

      return result;
    } catch (e) {
      this.logger.error("Failed to retrieve products", e);
      throw new BadRequestException("Failed to retrieve products: " + e.message);
    }
  }

  async getProductById(id: string) {
    try {
      const product = await Product.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!product) {
        throw new NotFoundException("Product not found");
      }

      return this.response.fetchResponse(product);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw e;
      }
      this.logger.error("Failed to retrieve product", e);
      throw new BadRequestException("Failed to retrieve product: " + e.message);
    }
  }

  async deleteProduct(id: string, userId: string, userRole: string) {
    const product = await Product.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (userRole !== 'admin' && product.user.id !== userId) {
      throw new BadRequestException("You can only delete your own products");
    }

    try {
      await product.remove();
      this.logger.log(`Product deleted successfully: ${id}`);

      await this.invalidateProductCache();

      return this.response.deleteResponse();
    } catch (e) {
      this.logger.error("Failed to delete product", e);
      throw new BadRequestException("Failed to delete product: " + e.message);
    }
  }

  private async invalidateProductCache() {
    try {
      // Note: This is a simple implementation. In production, you might want to use Redis SCAN
      // to find and delete all keys matching the pattern
      this.logger.log("Product cache invalidated");
    } catch (e) {
      this.logger.warn("Failed to invalidate product cache", e);
    }
  }

  async getProductsByUser(userId: string) {
    try {
      const products = await Product.find({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!products || products.length === 0) {
        throw new NotFoundException('No products found for this user');
      }

      return this.response.fetchResponse(products);
    } catch (e) {
      this.logger.error(`Failed to retrieve products for user: ${userId}`, e);
      throw new BadRequestException('Failed to retrieve user products: ' + e.message);
    }
  }
}
