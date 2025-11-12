import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ResponseService } from '../../response/response.service';
import { FilterHelper } from '../../helpers/filter.helper';
import { RedisHelper } from '../../helpers/redis-helper';
import { Product } from '../entity/product.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  mockResponseService,
  mockFilterHelper,
  mockRedisHelper,
  createMockProduct,
  createMockUser,
  resetAllMocks,
} from '../../../test/test-helpers';

// Mock the Product entity
jest.mock('../entity/product.entity');

describe('ProductService', () => {
  let service: ProductService;
  let responseService: ResponseService;
  let filterHelper: FilterHelper;
  let redisHelper: RedisHelper;

  beforeEach(async () => {
    resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ResponseService,
          useValue: mockResponseService,
        },
        {
          provide: FilterHelper,
          useValue: mockFilterHelper,
        },
        {
          provide: RedisHelper,
          useValue: mockRedisHelper,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    responseService = module.get<ResponseService>(ResponseService);
    filterHelper = module.get<FilterHelper>(FilterHelper);
    redisHelper = module.get<RedisHelper>(RedisHelper);
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    const createProductDto = {
      name: 'Test Product',
      description: 'Test Description for the product',
      price: 99.99,
      stock: 10,
      category: 'Electronics',
    };
    const userId = 'user-id-123';

    it('should create a product successfully', async () => {
      const mockProduct = createMockProduct({ id: 'new-product-id' });
      mockProduct.save = jest.fn().mockResolvedValue(mockProduct);

      (Product as any).mockImplementation(() => mockProduct);
      mockRedisHelper.del.mockResolvedValue(1);

      const result = await service.createProduct(createProductDto, userId);

      expect(mockProduct.save).toHaveBeenCalled();
      expect(redisHelper.del).toHaveBeenCalled();
      expect(responseService.postResponse).toHaveBeenCalledWith('new-product-id');
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException on save failure', async () => {
      const mockProduct = createMockProduct();
      mockProduct.save = jest.fn().mockRejectedValue(new Error('Database error'));

      (Product as any).mockImplementation(() => mockProduct);

      await expect(service.createProduct(createProductDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllProducts', () => {
    it('should return cached products if available', async () => {
      const mockCachedData = {
        success: true,
        object: [createMockProduct()],
        pageNumber: 1,
        pageSize: 10,
        totalSize: 1,
        totalPages: 1,
      };

      mockRedisHelper.get.mockResolvedValue(mockCachedData);

      const result = await service.getAllProducts(10, 1);

      expect(redisHelper.get).toHaveBeenCalled();
      expect(result).toEqual(mockCachedData);
    });

    it('should fetch and cache products when cache miss', async () => {
      mockRedisHelper.get.mockResolvedValue(null);
      
      const mockProduct = createMockProduct();
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      };

      (Product.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue(mockQueryBuilder);
      mockRedisHelper.set.mockResolvedValue(undefined);

      const result = await service.getAllProducts(10, 1);

      expect(Product.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(redisHelper.set).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.object).toHaveLength(1);
    });

    it('should apply search filter correctly', async () => {
      mockRedisHelper.get.mockResolvedValue(null);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      (Product.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.getAllProducts(10, 1, { search: 'laptop' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.name LIKE :search',
        { search: '%laptop%' },
      );
    });

    it('should apply category filter correctly', async () => {
      mockRedisHelper.get.mockResolvedValue(null);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      (Product.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.getAllProducts(10, 1, { category: 'Electronics' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: 'Electronics' },
      );
    });

    it('should apply price range filters correctly', async () => {
      mockRedisHelper.get.mockResolvedValue(null);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      (Product.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.getAllProducts(10, 1, { minPrice: 50, maxPrice: 200 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 50 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 200 },
      );
    });

    it('should apply in-stock filter correctly', async () => {
      mockRedisHelper.get.mockResolvedValue(null);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      (Product.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.getAllProducts(10, 1, { inStock: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.stock > 0');
    });
  });

  describe('getProductById', () => {
    it('should return product if found', async () => {
      const mockProduct = createMockProduct();
      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockProduct);

      const result = await service.getProductById('product-id-123');

      expect(Product.findOne).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
        relations: ['user'],
      });
      expect(responseService.fetchResponse).toHaveBeenCalledWith(mockProduct);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(service.getProductById('invalid-id')).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });
  });

  describe('updateProduct', () => {
    const updateProductDto = {
      name: 'Updated Product',
      price: 149.99,
    };
    const productId = 'product-id-123';
    const userId = 'user-id-123';

    it('should update product successfully', async () => {
      const mockProduct = createMockProduct({ id: productId });
      mockProduct.user = createMockUser({ id: userId });
      mockProduct.save = jest.fn().mockResolvedValue(mockProduct);

      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockProduct);
      mockRedisHelper.del.mockResolvedValue(1);

      const result = await service.updateProduct(productId, updateProductDto, userId);

      expect(mockProduct.save).toHaveBeenCalled();
      expect(mockProduct.name).toBe(updateProductDto.name);
      expect(mockProduct.price).toBe(updateProductDto.price);
      expect(redisHelper.del).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateProduct(productId, updateProductDto, userId),
      ).rejects.toThrow(new NotFoundException('Product not found'));
    });

    it('should throw BadRequestException if user is not the owner', async () => {
      const mockProduct = createMockProduct({ id: productId });
      mockProduct.user = createMockUser({ id: 'different-user-id' });

      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockProduct);

      await expect(
        service.updateProduct(productId, updateProductDto, userId),
      ).rejects.toThrow(new BadRequestException('You can only update your own products'));
    });
  });

  describe('deleteProduct', () => {
    const productId = 'product-id-123';
    const userId = 'user-id-123';
    const userRole = 'seller';

    it('should delete product successfully by owner', async () => {
      const mockProduct = createMockProduct({ id: productId });
      mockProduct.user = createMockUser({ id: userId });
      mockProduct.remove = jest.fn().mockResolvedValue(mockProduct);

      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockProduct);
      mockRedisHelper.del.mockResolvedValue(1);

      const result = await service.deleteProduct(productId, userId, userRole);

      expect(mockProduct.remove).toHaveBeenCalled();
      expect(redisHelper.del).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should delete product successfully by admin', async () => {
      const mockProduct = createMockProduct({ id: productId });
      mockProduct.user = createMockUser({ id: 'different-user-id' });
      mockProduct.remove = jest.fn().mockResolvedValue(mockProduct);

      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockProduct);
      mockRedisHelper.del.mockResolvedValue(1);

      const result = await service.deleteProduct(productId, userId, 'admin');

      expect(mockProduct.remove).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(service.deleteProduct(productId, userId, userRole)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('should throw BadRequestException if non-admin tries to delete others product', async () => {
      const mockProduct = createMockProduct({ id: productId });
      mockProduct.user = createMockUser({ id: 'different-user-id' });

      (Product.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockProduct);

      await expect(service.deleteProduct(productId, userId, userRole)).rejects.toThrow(
        new BadRequestException('You can only delete your own products'),
      );
    });
  });

  describe('getProductsByUser', () => {
    const userId = 'user-id-123';

    it('should return products for user', async () => {
      const mockProducts = [createMockProduct(), createMockProduct()];
      (Product.find as jest.Mock) = jest.fn().mockResolvedValue(mockProducts);

      const result = await service.getProductsByUser(userId);

      expect(Product.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        relations: ['user'],
      });
      expect(responseService.fetchResponse).toHaveBeenCalledWith(mockProducts);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if no products found', async () => {
      (Product.find as jest.Mock) = jest.fn().mockResolvedValue([]);

      await expect(service.getProductsByUser(userId)).rejects.toThrow(
        new NotFoundException('No products found for this user'),
      );
    });
  });
});
