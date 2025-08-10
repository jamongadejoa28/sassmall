// ========================================
// Event Consumer - Kafka Consumer 추상화  
// ========================================

import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { DomainEvent, EventTypeMap, KAFKA_TOPICS } from './types';

/**
 * 이벤트 핸들러 타입 정의
 */
export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void>;

/**
 * 이벤트 핸들러 맵 타입
 */
export type EventHandlerMap = {
  [K in keyof EventTypeMap]?: EventHandler<EventTypeMap[K]>;
};

/**
 * Consumer 설정 옵션
 */
export interface ConsumerOptions {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
}

/**
 * Retry 설정
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
}

/**
 * Kafka Event Consumer
 * 도메인 이벤트를 Kafka에서 구독하고 처리하는 기본 클래스
 */
export class EventConsumer {
  private consumer: Consumer;
  private kafka: Kafka;
  private serviceName: string;
  private eventHandlers: Map<string, EventHandler<any>>;
  private retryConfig: RetryConfig;

  constructor(
    options: ConsumerOptions,
    kafkaBrokers: string[] = ['localhost:9092'],
    serviceName: string = 'unknown-service',
    retryConfig: RetryConfig = {
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
    }
  ) {
    this.serviceName = serviceName;
    this.eventHandlers = new Map();
    this.retryConfig = retryConfig;

    this.kafka = new Kafka({
      clientId: `${serviceName}-consumer`,
      brokers: kafkaBrokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: options.groupId,
      sessionTimeout: options.sessionTimeout || 30000,
      heartbeatInterval: options.heartbeatInterval || 3000,
      allowAutoTopicCreation: false,
    });
  }

  /**
   * Consumer 연결 및 구독 시작
   */
  async connect(topics: string[], fromBeginning: boolean = false): Promise<void> {
    try {
      await this.consumer.connect();
      console.log(`✅ [${this.serviceName}] Kafka Consumer 연결 완료`);

      // 토픽 구독
      await this.consumer.subscribe({ 
        topics, 
        fromBeginning 
      });
      console.log(`✅ [${this.serviceName}] 토픽 구독 완료:`, topics);

      // 메시지 처리 시작
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this),
      });

      console.log(`🚀 [${this.serviceName}] 이벤트 처리 시작`);

    } catch (error) {
      console.error(`❌ [${this.serviceName}] Kafka Consumer 연결 실패:`, error);
      throw error;
    }
  }

  /**
   * Consumer 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect();
      console.log(`✅ [${this.serviceName}] Kafka Consumer 연결 종료`);
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Kafka Consumer 종료 실패:`, error);
      throw error;
    }
  }

  /**
   * 특정 이벤트 타입에 대한 핸들러 등록
   */
  on<K extends keyof EventTypeMap>(
    eventType: K,
    handler: EventHandler<EventTypeMap[K]>
  ): void {
    this.eventHandlers.set(eventType as string, handler);
    console.log(`📋 [${this.serviceName}] 이벤트 핸들러 등록: ${eventType}`);
  }

  /**
   * 여러 이벤트 핸들러를 한번에 등록
   */
  registerHandlers(handlers: EventHandlerMap): void {
    Object.entries(handlers).forEach(([eventType, handler]) => {
      if (handler) {
        this.eventHandlers.set(eventType, handler);
        console.log(`📋 [${this.serviceName}] 이벤트 핸들러 등록: ${eventType}`);
      }
    });
  }

  /**
   * Kafka 메시지 처리 (내부 메소드)
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      // 메시지 파싱
      const event = this.parseMessage(message);
      if (!event) {
        console.warn(`⚠️ [${this.serviceName}] 메시지 파싱 실패:`, {
          topic,
          partition,
          offset: message.offset,
        });
        return;
      }

      console.log(`📨 [${this.serviceName}] 이벤트 수신:`, {
        eventType: event.eventType,
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        topic,
        partition,
        offset: message.offset,
      });

      // 이벤트 핸들러 실행
      await this.processEvent(event);

    } catch (error) {
      console.error(`❌ [${this.serviceName}] 메시지 처리 실패:`, {
        topic,
        partition,
        offset: message.offset,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 재시도 로직
      await this.handleProcessingError(message, error as Error);
    }
  }

  /**
   * Kafka 메시지를 도메인 이벤트로 파싱
   */
  private parseMessage(message: KafkaMessage): DomainEvent | null {
    try {
      if (!message.value) {
        console.warn(`⚠️ [${this.serviceName}] 빈 메시지`);
        return null;
      }

      const eventData = JSON.parse(message.value.toString());
      
      // 기본 이벤트 구조 검증
      if (!eventData.eventType || !eventData.aggregateId) {
        console.warn(`⚠️ [${this.serviceName}] 잘못된 이벤트 구조:`, eventData);
        return null;
      }

      return eventData as DomainEvent;

    } catch (error) {
      console.error(`❌ [${this.serviceName}] 메시지 파싱 오류:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageValue: message.value?.toString(),
      });
      return null;
    }
  }

  /**
   * 이벤트 처리 실행
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    const handler = this.eventHandlers.get(event.eventType);
    
    if (!handler) {
      console.log(`🔄 [${this.serviceName}] 핸들러 없음, 이벤트 무시: ${event.eventType}`);
      return;
    }

    const startTime = Date.now();
    
    try {
      await handler(event);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [${this.serviceName}] 이벤트 처리 완료:`, {
        eventType: event.eventType,
        eventId: event.eventId,
        duration: `${duration}ms`,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${this.serviceName}] 이벤트 처리 실패:`, {
        eventType: event.eventType,
        eventId: event.eventId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 처리 실패 시 재시도 및 에러 핸들링
   */
  private async handleProcessingError(
    message: KafkaMessage, 
    error: Error
  ): Promise<void> {
    // 재시도 횟수 확인 (헤더에서 추출)
    const retryCountHeader = message.headers?.retryCount;
    const retryCount = retryCountHeader ? 
      parseInt(retryCountHeader.toString()) : 0;

    if (retryCount < this.retryConfig.maxRetries) {
      // 재시도
      const delay = this.calculateRetryDelay(retryCount);
      
      console.log(`🔄 [${this.serviceName}] 재시도 예정:`, {
        retryCount: retryCount + 1,
        maxRetries: this.retryConfig.maxRetries,
        delayMs: delay,
      });

      await this.sleep(delay);
      
      // 재시도 로직 (실제로는 별도 토픽이나 스케줄러 필요)
      // 여기서는 로깅만 수행
      console.log(`🔄 [${this.serviceName}] 재시도 실행 필요 - 별도 구현 필요`);

    } else {
      // Dead Letter Queue로 전송
      console.error(`💀 [${this.serviceName}] 최대 재시도 초과, DLQ 전송 필요:`, {
        retryCount,
        maxRetries: this.retryConfig.maxRetries,
        error: error.message,
      });

      // 실제 DLQ 전송은 EventPublisher가 필요
      // 여기서는 로깅만 수행
    }
  }

  /**
   * 재시도 지연 시간 계산
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.retryConfig.retryDelayMs;
    
    if (this.retryConfig.exponentialBackoff) {
      return baseDelay * Math.pow(2, retryCount);
    }
    
    return baseDelay;
  }

  /**
   * Sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Consumer 상태 확인
   */
  async isConnected(): Promise<boolean> {
    try {
      // Consumer의 연결 상태를 직접 확인하는 방법이 제한적이므로
      // 간접적으로 확인
      return true; // 실제로는 더 정교한 확인 필요
    } catch {
      return false;
    }
  }

  /**
   * 등록된 핸들러 목록 조회
   */
  getRegisteredHandlers(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  /**
   * Consumer 그룹 정보 조회
   */
  async getConsumerGroupInfo(): Promise<any> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const groups = await admin.listGroups();
      const groupInfo = groups.groups.find(g => 
        g.groupId === `${this.serviceName}-consumer`
      );
      
      await admin.disconnect();
      return groupInfo;
      
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Consumer 그룹 정보 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 수동 오프셋 커밋
   * autoCommit: false인 경우 사용
   */
  async commitOffsets(topicPartitions: Array<{
    topic: string;
    partition: number;
    offset: string;
  }> = []): Promise<void> {
    try {
      await this.consumer.commitOffsets(topicPartitions);
      console.log(`✅ [${this.serviceName}] 오프셋 커밋 완료`);
    } catch (error) {
      console.error(`❌ [${this.serviceName}] 오프셋 커밋 실패:`, error);
      throw error;
    }
  }

  /**
   * Consumer 일시정지
   */
  pause(topics: Array<{ topic: string; partitions?: number[] }> = []): void {
    this.consumer.pause(topics);
    console.log(`⏸️ [${this.serviceName}] Consumer 일시정지`);
  }

  /**
   * Consumer 재시작
   */
  resume(topics: Array<{ topic: string; partitions?: number[] }> = []): void {
    this.consumer.resume(topics);
    console.log(`▶️ [${this.serviceName}] Consumer 재시작`);
  }
}