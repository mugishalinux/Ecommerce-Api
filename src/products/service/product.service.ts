import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Product } from "../entity/product.entity";
import { CreateProductDto } from "../dto/create-product.dto";
import { UpdateProductDto } from "../dto/update-product.dto";
import { Like } from "typeorm";
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

  async getAllProducts(pageSize: number, pageNumber: number, search?: string) {
    try {
      const cacheKey = `products-page-${pageNumber}-size-${pageSize}-search-${search || 'all'}`;
      const cachedData = await this.redisHelper.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Returning cached products for: ${cacheKey}`);
        return cachedData;
      }

      let whereCondition = {};

      if (search && search.trim() !== '') {
        whereCondition = {
          name: Like(`%${search}%`),
        };
      }

      const products = await this.filter.paginate(
        Product,
        pageSize || 10,
        pageNumber || 1,
        whereCondition,
        ['user'],
      );

      await this.redisHelper.set(cacheKey, products, 300);
      this.logger.log(`Cached products for: ${cacheKey}`);

      return products;
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
      await this.redisHelper.del('products-page-*');
    } catch (e) {
      this.logger.warn("Failed to invalidate product cache", e);
    }
  }

  async getProductsByUser(userId: string) {
    console.log("iiiiiii ", userId);
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
