"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisher = void 0;
const kafkajs_1 = require("kafkajs");
const types_1 = require("./types");
const uuid_1 = require("uuid");
class EventPublisher {
    constructor(kafkaBrokers = ['localhost:9092'], serviceName = 'unknown-service') {
        this.serviceName = serviceName;
        this.kafka = new kafkajs_1.Kafka({
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
    async connect() {
        try {
            await this.producer.connect();
            console.log(`✅ [${this.serviceName}] Kafka Producer 연결 완료`);
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] Kafka Producer 연결 실패:`, error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.producer.disconnect();
            console.log(`✅ [${this.serviceName}] Kafka Producer 연결 종료`);
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] Kafka Producer 종료 실패:`, error);
            throw error;
        }
    }
    async publish(event, topic) {
        try {
            const targetTopic = topic || this.getTopicForEvent(event.eventType);
            const enrichedEvent = this.enrichEvent(event);
            const producerRecord = {
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
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] 이벤트 발행 실패:`, {
                eventType: event.eventType,
                eventId: event.eventId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async publishBatch(events, topic) {
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
            const targetTopic = topic || this.getTopicForEvent(events[0].eventType);
            const producerRecord = {
                topic: targetTopic,
                messages,
            };
            await this.producer.send(producerRecord);
            console.log(`🚀 [${this.serviceName}] 배치 이벤트 발행 완료:`, {
                count: events.length,
                topic: targetTopic,
                eventTypes: events.map(e => e.eventType),
            });
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] 배치 이벤트 발행 실패:`, {
                count: events.length,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async publishTransaction(events) {
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
        }
        catch (error) {
            await transaction.abort();
            console.error(`❌ [${this.serviceName}] 트랜잭션 이벤트 발행 실패:`, {
                count: events.length,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    getTopicForEvent(eventType) {
        if (eventType.startsWith('User')) {
            return types_1.KAFKA_TOPICS.USER_EVENTS;
        }
        if (eventType.startsWith('Product') || eventType.startsWith('Stock') || eventType.startsWith('LowStock')) {
            return types_1.KAFKA_TOPICS.PRODUCT_EVENTS;
        }
        if (eventType.startsWith('Order')) {
            return types_1.KAFKA_TOPICS.ORDER_EVENTS;
        }
        if (eventType.startsWith('Cart')) {
            return types_1.KAFKA_TOPICS.CART_EVENTS;
        }
        if (eventType.startsWith('Service')) {
            return types_1.KAFKA_TOPICS.SYSTEM_EVENTS;
        }
        console.warn(`⚠️ [${this.serviceName}] 알 수 없는 이벤트 타입: ${eventType}, system-events 토픽 사용`);
        return types_1.KAFKA_TOPICS.SYSTEM_EVENTS;
    }
    enrichEvent(event) {
        return {
            ...event,
            eventId: event.eventId || (0, uuid_1.v4)(),
            timestamp: event.timestamp || new Date().toISOString(),
            correlationId: event.correlationId || (0, uuid_1.v4)(),
            causationId: event.causationId || event.eventId || (0, uuid_1.v4)(),
        };
    }
    async isConnected() {
        try {
            await this.kafka.admin().fetchTopicMetadata({
                topics: [types_1.KAFKA_TOPICS.SYSTEM_EVENTS]
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async sendToDeadLetterQueue(originalEvent, error, retryCount = 0) {
        try {
            const dlqEvent = {
                ...originalEvent,
                eventType: `DeadLetter_${originalEvent.eventType}`,
                eventId: (0, uuid_1.v4)(),
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
            await this.publish(dlqEvent, types_1.KAFKA_TOPICS.DEAD_LETTER_QUEUE);
        }
        catch (dlqError) {
            console.error(`❌ [${this.serviceName}] Dead Letter Queue 전송 실패:`, {
                originalEvent: originalEvent.eventType,
                error: dlqError instanceof Error ? dlqError.message : 'Unknown error',
            });
        }
    }
}
exports.EventPublisher = EventPublisher;
//# sourceMappingURL=EventPublisher.js.map