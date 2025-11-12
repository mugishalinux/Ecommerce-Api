#!/bin/bash

echo "Creating Kafka topic: email-notifications..."

docker exec ecommerce-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic email-notifications \
  --partitions 1 \
  --replication-factor 1 \
  --if-not-exists

echo ""
echo "Topic created!"
echo ""
echo "Listing all topics:"
docker exec ecommerce-kafka kafka-topics --list --bootstrap-server localhost:9092

