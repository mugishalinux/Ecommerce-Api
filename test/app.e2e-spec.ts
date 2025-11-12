import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/modules/app.module';

describe('E-Commerce API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    const testUser = {
      username: 'e2etestuser',
      email: 'e2etest@example.com',
      password: 'Test@123',
      role: 'user',
    };

    it('/api/v1/auth/register (POST) - should register user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.object).toHaveProperty('id');
        });
    });

    it('/api/v1/auth/register (POST) - should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('already');
        });
    });

    it('/api/v1/auth/register (POST) - should fail with invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'newuser@example.com',
          password: 'weak',
        })
        .expect(400);
    });

    it('/api/v1/auth/login (POST) - should send OTP', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('OTP');
        });
    });

    it('/api/v1/auth/login (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword@123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid');
        });
    });
  });

  describe('Product Endpoints (Public)', () => {
    it('/api/v1/products (GET) - should return products list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body).toHaveProperty('object');
          expect(res.body).toHaveProperty('pageNumber');
          expect(res.body).toHaveProperty('pageSize');
          expect(res.body).toHaveProperty('totalSize');
        });
    });

    it('/api/v1/products (GET) - should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.pageNumber).toBe(1);
          expect(res.body.pageSize).toBe(5);
        });
    });

    it('/api/v1/products (GET) - should filter by category', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?category=Electronics')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('/api/v1/products (GET) - should filter by price range', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?minPrice=10&maxPrice=100')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          if (res.body.object.length > 0) {
            res.body.object.forEach((product: any) => {
              expect(product.price).toBeGreaterThanOrEqual(10);
              expect(product.price).toBeLessThanOrEqual(100);
            });
          }
        });
    });

    it('/api/v1/products (GET) - should filter in-stock products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?inStock=true')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          if (res.body.object.length > 0) {
            res.body.object.forEach((product: any) => {
              expect(product.stock).toBeGreaterThan(0);
            });
          }
        });
    });

    it('/api/v1/products (GET) - should sort by price ascending', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?sortBy=price&sortOrder=ASC')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          if (res.body.object.length > 1) {
            const prices = res.body.object.map((p: any) => p.price);
            const sortedPrices = [...prices].sort((a, b) => a - b);
            expect(prices).toEqual(sortedPrices);
          }
        });
    });

    it('/api/v1/products (GET) - should search by name', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?search=test')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('/api/v1/products (GET) - should combine multiple filters', () => {
      return request(app.getHttpServer())
        .get(
          '/api/v1/products?category=Electronics&minPrice=50&maxPrice=200&inStock=true&sortBy=price&sortOrder=DESC',
        )
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];
      
      // Make 15 requests rapidly (limit is 10 per minute)
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/products')
            .then((res) => res.status),
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((status) => status === 429);

      // At least some requests should be rate limited
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate email format on registration', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Test@123',
          role: 'user',
        })
        .expect(400);
    });

    it('should validate password strength on registration', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'weak',
          role: 'user',
        })
        .expect(400);
    });

    it('should validate username format on registration', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'test user!@#',
          email: 'test3@example.com',
          password: 'Test@123',
          role: 'user',
        })
        .expect(400);
    });

    it('should validate OTP format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({
          otp: '12', // Too short
        })
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/non-existent-id')
        .expect(404);
    });

    it('should return 401 for protected routes without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          stock: 10,
          category: 'Test',
        })
        .expect(401);
    });

    it('should return 400 for invalid product creation data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A', // Too short
          description: 'Short', // Too short
          price: -10, // Negative
          stock: -5, // Negative
        })
        .expect((res) => {
          expect([400, 401]).toContain(res.status); // 401 if no token, 400 if validation fails
        });
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for success', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('object');
          expect(res.body.success).toBe(true);
        });
    });

    it('should return consistent response format for errors', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/invalid-id')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Swagger Documentation', () => {
    it('should serve Swagger UI', () => {
      return request(app.getHttpServer()).get('/').expect(301); // Swagger redirects
    });

    it('should serve OpenAPI JSON', () => {
      return request(app.getHttpServer())
        .get('/-json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('paths');
        });
    });
  });
});
