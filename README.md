# E-Commerce REST API
## Features

- Multi-Factor Authentication (OTP via email)
- Product Management with Advanced Filtering
- Order Processing
- Rate Limiting Protection
- Comprehensive API Documentation (Swagger)
- Unit and E2E Test Coverage

## Technical Stack

- **Framework:** NestJS 10.x
- **Database:** MySQL 8.0
- **Cache:** Redis 7.x
- **Message Queue:** Apache Kafka
- **Authentication:** JWT + Passport
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest + Supertest

## Prerequisites

### Docker Deployment (Recommended)
- Docker 20.x or higher
- Docker Compose 2.x or higher

### Manual Deployment
- Node.js 18 or higher
- MySQL 8.0 or higher
- Redis 7.x or higher
- Apache Kafka 3.x (optional, for email notifications)

## Installation

### Docker Deployment

**Step 1: Clone and Configure**

```bash
git clone proect-repository-url
cd ecommerce-api
cp .env.example .env
```

**Step 2: Configure Environment Variables**

Create the `.env` file with below environment. Replace all placeholder values:

```env
NODE_PORT=7070
APPLICATION_NAME=ecommerce-api

# Database Configuration
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=<your-secure-password>
DATABASE_DB=ecommerce_db

# Kafka Configuration
KAFKA_BROKER_URL=kafka:29092
KAFKA_GROUP_ID=ecommerce-service

# JWT Configuration
JWT_SECRET=<your-secret-key-minimum-32-characters>
JWT_EXPIRATION=7d

# Kafka Topics
SEND_EMAIL_REQUEST_TOPIC=email-notifications

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_NAME=ecommerce-queue
QUEUE_RETRIES=3
QUEUE_DELAY=1000
QUEUE_MAX_REQUESTS=1000
QUEUE_DURATION=1000
QUEUE_CONCURRENCY=200

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<your-secure-password>
```

**Step 3: Start Services**

```bash
docker-compose up -d
```

**Step 4: Verify Deployment**

```bash
docker-compose ps
```

**Step 5: Access Application**

- API Endpoint: http://localhost:3000
- API Documentation: http://localhost:3000
- Kafka UI (Kafdrop): http://localhost:9001 (for view messeages passed like otp messages)

**Step 6: View Logs**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

**Step 7: Stop Services**

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Manual Deployment

**Step 1: Install Dependencies**

```bash
npm install
```

**Step 2: Configure Environment**

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
NODE_PORT=3000
APPLICATION_NAME=ecommerce-api

# Database Configuration (Local)
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=<your-mysql-password>
DATABASE_DB=ecommerce_db

# Kafka Configuration (Local)
KAFKA_BROKER_URL=localhost:9092
KAFKA_GROUP_ID=ecommerce-service

# JWT Configuration
JWT_SECRET=<your-secret-key-minimum-32-characters>
JWT_EXPIRATION=7d

# Kafka Topics
SEND_EMAIL_REQUEST_TOPIC=email-notifications

# Redis Configuration (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_NAME=ecommerce-queue
QUEUE_RETRIES=3
QUEUE_DELAY=1000
QUEUE_MAX_REQUESTS=1000
QUEUE_DURATION=1000
QUEUE_CONCURRENCY=200

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<your-secure-password>
```

**Step 3: Initialize Database**

```bash
mysql -u root -p
CREATE DATABASE ecommerce_db;
exit;
```

**Step 4: Start Required Services**

```bash
# Start Redis
redis-server

# Start Kafka (optional)
# Terminal 1: Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Terminal 2: Start Kafka
bin/kafka-server-start.sh config/server.properties
```

**Step 5: Run Application**

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

The API documentation is automatically generated using Swagger/OpenAPI and is available at:

**Swagger UI:** http://localhost:3000

All endpoints include detailed descriptions, request/response schemas, and example payloads.

## User Roles and Permissions

### Administrator
The administrator account is automatically created on application startup using credentials from the `.env` file.


## License

MIT License