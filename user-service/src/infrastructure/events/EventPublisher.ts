// Kafka Event Publisher for User Service
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { DomainEvent } from './types';

export class EventPublisher {
  private kafka: Kafka;
  private producer: Producer;
  private serviceName: string;

  constructor(
    kafkaBrokers: string[] = ['localhost:9092'],
    serviceName: string = 'user-service'
  ) {
    this.serviceName = serviceName;
    
    this.kafka = new Kafka({
      clientId: `${serviceName}-producer`,
      brokers: kafkaBrokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log(`✅ [${this.serviceName}] Kafka Producer 연결 완료`);
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Kafka Producer 연결 실패:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log(`✅ [${this.serviceName}] Kafka Producer 연결 종료`);
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Kafka Producer 연결 종료 실패:`, error);
      throw error;
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      const topic = 'user-events';
      
      const producerRecord: ProducerRecord = {
        topic: topic,
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event),
            headers: {
              eventType: event.type,
              timestamp: event.timestamp,
              serviceName: this.serviceName,
            },
          },
        ],
      };

      await this.producer.send(producerRecord);
      
      console.log(`🚀 [${this.serviceName}] 이벤트 발행 완료:`, {
        eventType: event.type,
        eventId: event.id,
        topic: topic
      });
    } catch (error) {
      console.error(`❌ [${this.serviceName}] 이벤트 발행 실패:`, {
        eventType: event.type,
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  isConnected(): boolean {
    // Mock connection status
    return true;
  }

  async sendToDeadLetterQueue(event: DomainEvent, error: Error, retryCount: number): Promise<void> {
    // Mock dead letter queue
    console.log(`[${this.serviceName}] Sending event to DLQ:`, {
      eventId: event.id,
      error: error.message,
      retryCount
    });
  }
}