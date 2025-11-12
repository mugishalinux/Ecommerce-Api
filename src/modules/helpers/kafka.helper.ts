import { Injectable } from "@nestjs/common";
const { Kafka } = require("kafkajs");
require("dotenv").config();

@Injectable()
export class KafkaHelper {
  private producer;
  public consumer;
  
  constructor() {
    const kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
    });

    this.producer = kafka.producer();
    this.producer.connect().then(() => {
      console.log("Kafka producer connected successfully");
    });

    const consumer = kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID,
    });

    consumer.connect().then(() => {
      this.consumer = consumer;
      console.log("Kafka consumer connected successfully");
    });
  }
  
  async send(data: any, transactionName: string, topic: string) {
    const messageToBeSent = JSON.stringify(data);

    try {
      await this.producer.send({
        topic: topic,
        messages: [
          {
            value: messageToBeSent,
            headers: { appName: process.env.APPLICATION_NAME },
          },
        ],
      });

      return { isMessageSent: true };
    } catch (error) {
      console.log("Error while sending Kafka request:", error);
    }
  }
}
