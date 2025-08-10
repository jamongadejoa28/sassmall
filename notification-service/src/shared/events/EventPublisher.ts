// ========================================
// Event Publisher - Kafka Producer 추상화
// ========================================

import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { DomainEvent, KAFKA_TOPICS } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Kafka Event Publisher
 * 도메인 이벤트를 Kafka로 발행하는 기본 클래스
 */
export class EventPublisher {
  private producer: Producer;
  private kafka: Kafka;
  private serviceName: string;

  constructor(
    kafkaBrokers: string[] = ['localhost:9092'],
    serviceName: string = 'unknown-service'
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

  /**
   * Producer 연결 시작
   */
  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log(`✅ [${this.serviceName}] Kafka Producer 연결 완료`);
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Kafka Producer 연결 실패:`, error);
      throw error;
    }
  }

  /**
   * Producer 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log(`✅ [${this.serviceName}] Kafka Producer 연결 종료`);
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Kafka Producer 종료 실패:`, error);
      throw error;
    }
  }

  /**
   * 도메인 이벤트 발행
   * @param event 발행할 도메인 이벤트
   * @param topic 대상 토픽 (선택사항, 자동 추론 가능)
   */
  async publish<T extends DomainEvent>(
    event: T,
    topic?: string
  ): Promise<void> {
    try {
      // 토픽 자동 선택 로직
      const targetTopic = topic || this.getTopicForEvent(event.eventType);
      
      // 이벤트 메타데이터 보강
      const enrichedEvent = this.enrichEvent(event);
      
      const producerRecord: ProducerRecord = {
        topic: targetTopic,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify(enrichedEvent),
            headers: {
              eventType: event.eventType,
              version: event.version,
              source: this.serviceName,
              timestamp: event.timestamp,
            },
          },
        ],
      };

      await this.producer.send(producerRecord);

      console.log(`🚀 [${this.serviceName}] 이벤트 발행 완료:`, {
        eventType: event.eventType,
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        topic: targetTopic,
      });

    } catch (error) {
      console.error(`❌ [${this.serviceName}] 이벤트 발행 실패:`, {
        eventType: event.eventType,
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 배치로 여러 이벤트 발행
   * @param events 발행할 이벤트들
   * @param topic 대상 토픽 (선택사항)
   */
  async publishBatch(
    events: DomainEvent[], 
    topic?: string
  ): Promise<void> {
    try {
      const messages = events.map(event => {
        const enrichedEvent = this.enrichEvent(event);
        return {
          key: event.aggregateId,
          value: JSON.stringify(enrichedEvent),
          headers: {
            eventType: event.eventType,
            version: event.version,
            source: this.serviceName,
            timestamp: event.timestamp,
          },
        };
      });

      // 모든 이벤트가 같은 토픽인 경우에만 배치 처리
      const targetTopic = topic || this.getTopicForEvent(events[0].eventType);

      const producerRecord: ProducerRecord = {
        topic: targetTopic,
        messages,
      };

      await this.producer.send(producerRecord);

      console.log(`🚀 [${this.serviceName}] 배치 이벤트 발행 완료:`, {
        count: events.length,
        topic: targetTopic,
        eventTypes: events.map(e => e.eventType),
      });

    } catch (error) {
      console.error(`❌ [${this.serviceName}] 배치 이벤트 발행 실패:`, {
        count: events.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 트랜잭션을 사용한 이벤트 발행
   * 여러 이벤트를 원자적으로 처리해야 할 때 사용
   */
  async publishTransaction(events: DomainEvent[]): Promise<void> {
    const transaction = await this.producer.transaction();

    try {
      for (const event of events) {
        const topic = this.getTopicForEvent(event.eventType);
        const enrichedEvent = this.enrichEvent(event);

        await transaction.send({
          topic,
          messages: [
            {
              key: event.aggregateId,
              value: JSON.stringify(enrichedEvent),
              headers: {
                eventType: event.eventType,
                version: event.version,
                source: this.serviceName,
                timestamp: event.timestamp,
              },
            },
          ],
        });
      }

      await transaction.commit();

      console.log(`🚀 [${this.serviceName}] 트랜잭션 이벤트 발행 완료:`, {
        count: events.length,
        eventTypes: events.map(e => e.eventType),
      });

    } catch (error) {
      await transaction.abort();
      
      console.error(`❌ [${this.serviceName}] 트랜잭션 이벤트 발행 실패:`, {
        count: events.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 이벤트 타입에 따른 토픽 자동 선택
   */
  private getTopicForEvent(eventType: string): string {
    // User Service Events
    if (eventType.startsWith('User')) {
      return KAFKA_TOPICS.USER_EVENTS;
    }
    
    // Product Service Events  
    if (eventType.startsWith('Product') || eventType.startsWith('Stock') || eventType.startsWith('LowStock')) {
      return KAFKA_TOPICS.PRODUCT_EVENTS;
    }
    
    // Order Service Events
    if (eventType.startsWith('Order')) {
      return KAFKA_TOPICS.ORDER_EVENTS;
    }
    
    // Cart Service Events
    if (eventType.startsWith('Cart')) {
      return KAFKA_TOPICS.CART_EVENTS;
    }
    
    // System Events
    if (eventType.startsWith('Service')) {
      return KAFKA_TOPICS.SYSTEM_EVENTS;
    }

    // 기본값: system-events
    console.warn(`⚠️ [${this.serviceName}] 알 수 없는 이벤트 타입: ${eventType}, system-events 토픽 사용`);
    return KAFKA_TOPICS.SYSTEM_EVENTS;
  }

  /**
   * 이벤트 메타데이터 보강
   * 누락된 필드 자동 생성 및 표준화
   */
  private enrichEvent<T extends DomainEvent>(event: T): T {
    return {
      ...event,
      eventId: event.eventId || uuidv4(),
      timestamp: event.timestamp || new Date().toISOString(),
      correlationId: event.correlationId || uuidv4(),
      causationId: event.causationId || event.eventId || uuidv4(),
    };
  }

  /**
   * Kafka 연결 상태 확인
   */
  async isConnected(): Promise<boolean> {
    try {
      // Producer의 연결 상태를 직접 확인하는 방법이 없으므로
      // 간단한 메타데이터 요청으로 연결 상태 확인
      await this.kafka.admin().fetchTopicMetadata({ 
        topics: [KAFKA_TOPICS.SYSTEM_EVENTS] 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dead Letter Queue로 실패한 이벤트 전송
   */
  async sendToDeadLetterQueue(
    originalEvent: DomainEvent,
    error: Error,
    retryCount: number = 0
  ): Promise<void> {
    try {
      const dlqEvent = {
        ...originalEvent,
        eventType: `DeadLetter_${originalEvent.eventType}`,
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: {
          ...originalEvent.payload,
          __dlq_metadata: {
            originalEventId: originalEvent.eventId,
            originalTimestamp: originalEvent.timestamp,
            errorMessage: error.message,
            errorStack: error.stack,
            retryCount,
            failedAt: new Date().toISOString(),
            source: this.serviceName,
          },
        },
      };

      await this.publish(dlqEvent as any, KAFKA_TOPICS.DEAD_LETTER_QUEUE);

    } catch (dlqError) {
      console.error(`❌ [${this.serviceName}] Dead Letter Queue 전송 실패:`, {
        originalEvent: originalEvent.eventType,
        error: dlqError instanceof Error ? dlqError.message : 'Unknown error',
      });
      // DLQ 전송 실패는 별도 로그 시스템으로 기록해야 함
    }
  }
}