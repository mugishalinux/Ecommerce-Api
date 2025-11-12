#!/bin/bash

echo "Starting E-Commerce API with Docker..."
echo ""

# Start all services
echo "📦 Starting services..."
docker-compose up -d



# Create Kafka topic
echo ""
echo "Creating Kafka topic..."
docker exec ecommerce-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic email-notifications 2>/dev/null || echo "Topic already exists"

echo ""
echo " Everything is ready!"
