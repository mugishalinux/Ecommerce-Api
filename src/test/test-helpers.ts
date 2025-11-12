import { JwtService } from '@nestjs/jwt';
import { ResponseService } from '../modules/response/response.service';
import { RedisHelper } from '../modules/helpers/redis-helper';
import { EventHelper } from '../modules/helpers/events.helper';
import { FilterHelper } from '../modules/helpers/filter.helper';
import { DataSource, QueryRunner } from 'typeorm';

// Mock JWT Service
export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-id', email: 'test@example.com' }),
  decode: jest.fn(),
};

// Mock Response Service
export const mockResponseService = {
  postResponse: jest.fn().mockReturnValue({
    success: true,
    message: 'Record created successfully',
    object: { id: 'mock-id' },
    errors: undefined,
  }),
  fetchResponse: jest.fn().mockReturnValue({
    success: true,
    message: 'Resource retrieved successfully',
    object: {},
    errors: undefined,
  }),
  updateResponse: jest.fn().mockReturnValue({
    success: true,
    message: 'Record updated successfully',
    object: { id: 'mock-id' },
    errors: undefined,
  }),
  deleteResponse: jest.fn().mockReturnValue({
    success: true,
    message: 'Record deleted successfully',
    object: null,
    errors: undefined,
  }),
  customRespose: jest.fn().mockImplementation((message, status, data) => ({
    success: status >= 200 && status < 300,
    message,
    object: data || null,
    errors: undefined,
  })),
};

// Mock Redis Helper
export const mockRedisHelper = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(1),
  unlink: jest.fn().mockResolvedValue(1),
};

// Mock Event Helper
export const mockEventHelper = {
  sendEvent: jest.fn().mockResolvedValue(undefined),
};

// Mock Filter Helper
export const mockFilterHelper = {
  paginate: jest.fn().mockResolvedValue({
    success: true,
    message: 'Data retrieved successfully',
    object: [],
    pageNumber: 1,
    pageSize: 10,
    totalSize: 0,
    totalPages: 0,
    errors: null,
  }),
};

// Mock Query Runner
export const createMockQueryRunner = (): Partial<QueryRunner> => ({
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as any,
});

// Mock DataSource
export const mockDataSource = {
  createQueryRunner: jest.fn().mockImplementation(createMockQueryRunner),
  getRepository: jest.fn(),
  manager: {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  },
};

// Helper function to create mock user
export const createMockUser = (overrides = {}) => ({
  id: 'user-id-123',
  username: 'testuser',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  role: 'user',
  created_at: new Date(),
  updated_at: new Date(),
  save: jest.fn().mockResolvedValue(this),
  remove: jest.fn().mockResolvedValue(this),
  ...overrides,
});

// Helper function to create mock product
export const createMockProduct = (overrides = {}) => ({
  id: 'product-id-123',
  name: 'Test Product',
  description: 'Test Description',
  price: 99.99,
  stock: 10,
  category: 'Electronics',
  user: createMockUser(),
  created_at: new Date(),
  updated_at: new Date(),
  save: jest.fn().mockResolvedValue(this),
  remove: jest.fn().mockResolvedValue(this),
  ...overrides,
});

// Helper function to create mock order
export const createMockOrder = (overrides = {}) => ({
  id: 'order-id-123',
  user: createMockUser(),
  description: 'Test Order',
  totalPrice: 199.99,
  status: 'pending',
  products: [],
  created_at: new Date(),
  updated_at: new Date(),
  save: jest.fn().mockResolvedValue(this),
  ...overrides,
});

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  Object.values(mockJwtService).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockResponseService).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockRedisHelper).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockEventHelper).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
  Object.values(mockFilterHelper).forEach(mock => {
    if (typeof mock === 'function') mock.mockClear();
  });
};
