import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { ResponseService } from '../../response/response.service';
import { DataSource } from 'typeorm';
import { Order } from '../entity/order.entity';
import { Product } from '../../products/entity/product.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  mockResponseService,
  mockDataSource,
  createMockQueryRunner,
  createMockProduct,
  createMockOrder,
  createMockUser,
  resetAllMocks,
} from '../../../test/test-helpers';

// Mock entities
jest.mock('../entity/order.entity');
jest.mock('../entity/order.item.entity');
jest.mock('../../products/entity/product.entity');

describe('OrderService', () => {
  let service: OrderService;
  let responseService: ResponseService;
  let dataSource: DataSource;

  beforeEach(async () => {
    resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: ResponseService,
          useValue: mockResponseService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    responseService = module.get<ResponseService>(ResponseService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('placeOrder', () => {
    const placeOrderDto = {
      products: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
    };
    const userId = 'user-id-123';

    it('should place order with transaction successfully', async () => {
      const mockProduct1 = createMockProduct({
        id: 'product-1',
        price: 50,
        stock: 10,
        name: 'Product 1',
      });
      const mockProduct2 = createMockProduct({
        id: 'product-2',
        price: 30,
        stock: 5,
        name: 'Product 2',
      });

      const mockOrder = createMockOrder({
        id: 'new-order-id',
        totalPrice: 130, // (50 * 2) + (30 * 1)
      });

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);
      mockQueryRunner.manager.save = jest
        .fn()
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValue({});

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      (Order.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockOrder,
        products: [
          {
            product: mockProduct1,
            quantity: 2,
            price: 50,
          },
          {
            product: mockProduct2,
            quantity: 1,
            price: 30,
          },
        ],
      });

      const result = await service.placeOrder(placeOrderDto, userId);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(null);

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      await expect(service.placeOrder(placeOrderDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const mockProduct = createMockProduct({
        id: 'product-1',
        stock: 1, // Insufficient for quantity 2
      });

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(mockProduct);

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      await expect(service.placeOrder(placeOrderDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on any error', async () => {
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      await expect(service.placeOrder(placeOrderDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should calculate total price correctly', async () => {
      const mockProduct1 = createMockProduct({
        id: 'product-1',
        price: 99.99,
        stock: 10,
      });
      const mockProduct2 = createMockProduct({
        id: 'product-2',
        price: 49.99,
        stock: 5,
      });

      const mockOrder = createMockOrder({
        id: 'new-order-id',
        totalPrice: 249.97, // (99.99 * 2) + (49.99 * 1)
      });

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);
      mockQueryRunner.manager.save = jest.fn().mockResolvedValue(mockOrder);

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      (Order.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockOrder,
        products: [],
      });

      await service.placeOrder(placeOrderDto, userId);

      // Verify that save was called with correct total price
      const saveCalls = mockQueryRunner.manager.save.mock.calls;
      const orderSaveCall = saveCalls.find((call) => call[0].totalPrice);
      expect(orderSaveCall[0].totalPrice).toBe(249.97);
    });

    it('should update product stock correctly', async () => {
      const mockProduct = createMockProduct({
        id: 'product-1',
        price: 50,
        stock: 10,
      });

      const placeOrderDtoSingle = {
        products: [{ productId: 'product-1', quantity: 3 }],
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(mockProduct);
      mockQueryRunner.manager.save = jest.fn().mockResolvedValue({});

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      (Order.findOne as jest.Mock) = jest.fn().mockResolvedValue(createMockOrder());

      await service.placeOrder(placeOrderDtoSingle, userId);

      // Verify that save was called with updated stock
      const saveCalls = mockQueryRunner.manager.save.mock.calls;
      const productSaveCall = saveCalls.find((call) => call[0].stock !== undefined);
      expect(productSaveCall[0].stock).toBe(7); // 10 - 3
    });
  });

  describe('getMyOrders', () => {
    const userId = 'user-id-123';

    it('should return user orders successfully', async () => {
      const mockOrders = [createMockOrder(), createMockOrder()];
      (Order.find as jest.Mock) = jest.fn().mockResolvedValue(mockOrders);

      const result = await service.getMyOrders(userId);

      expect(Order.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        relations: ['products', 'products.product'],
        order: { created_at: 'DESC' },
      });
      expect(result.success).toBe(true);
    });

    it('should return empty array if no orders found', async () => {
      (Order.find as jest.Mock) = jest.fn().mockResolvedValue([]);

      const result = await service.getMyOrders(userId);

      expect(result.success).toBe(true);
      expect(result.object).toEqual([]);
    });

    it('should throw BadRequestException on database error', async () => {
      (Order.find as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(service.getMyOrders(userId)).rejects.toThrow(BadRequestException);
    });

    it('should format order response correctly', async () => {
      const mockProduct = createMockProduct({
        id: 'product-123',
        name: 'Test Product',
      });

      const mockOrder = createMockOrder({
        id: 'order-123',
        totalPrice: 99.99,
        status: 'pending',
        products: [
          {
            product: mockProduct,
            quantity: 2,
            price: 49.99,
          },
        ],
      });

      (Order.find as jest.Mock) = jest.fn().mockResolvedValue([mockOrder]);

      const result = await service.getMyOrders(userId);

      expect(result.object[0]).toHaveProperty('orderId');
      expect(result.object[0]).toHaveProperty('status');
      expect(result.object[0]).toHaveProperty('totalPrice');
      expect(result.object[0]).toHaveProperty('products');
      expect(result.object[0].products[0]).toHaveProperty('productName');
      expect(result.object[0].products[0]).toHaveProperty('quantity');
    });
  });
});
