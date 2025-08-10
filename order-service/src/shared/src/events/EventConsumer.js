"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventConsumer = void 0;
const kafkajs_1 = require("kafkajs");
class EventConsumer {
    constructor(options, kafkaBrokers = ['localhost:9092'], serviceName = 'unknown-service', retryConfig = {
        maxRetries: 3,
        retryDelayMs: 1000,
        exponentialBackoff: true,
    }) {
        this.serviceName = serviceName;
        this.eventHandlers = new Map();
        this.retryConfig = retryConfig;
        this.kafka = new kafkajs_1.Kafka({
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
    async connect(topics, fromBeginning = false) {
        try {
            await this.consumer.connect();
            console.log(`✅ [${this.serviceName}] Kafka Consumer 연결 완료`);
            await this.consumer.subscribe({
                topics,
                fromBeginning
            });
            console.log(`✅ [${this.serviceName}] 토픽 구독 완료:`, topics);
            await this.consumer.run({
                eachMessage: this.handleMessage.bind(this),
            });
            console.log(`🚀 [${this.serviceName}] 이벤트 처리 시작`);
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] Kafka Consumer 연결 실패:`, error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.consumer.disconnect();
            console.log(`✅ [${this.serviceName}] Kafka Consumer 연결 종료`);
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] Kafka Consumer 종료 실패:`, error);
            throw error;
        }
    }
    on(eventType, handler) {
        this.eventHandlers.set(eventType, handler);
        console.log(`📋 [${this.serviceName}] 이벤트 핸들러 등록: ${eventType}`);
    }
    registerHandlers(handlers) {
        Object.entries(handlers).forEach(([eventType, handler]) => {
            if (handler) {
                this.eventHandlers.set(eventType, handler);
                console.log(`📋 [${this.serviceName}] 이벤트 핸들러 등록: ${eventType}`);
            }
        });
    }
    async handleMessage(payload) {
        const { topic, partition, message } = payload;
        try {
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
            await this.processEvent(event);
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] 메시지 처리 실패:`, {
                topic,
                partition,
                offset: message.offset,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            await this.handleProcessingError(message, error);
        }
    }
    parseMessage(message) {
        try {
            if (!message.value) {
                console.warn(`⚠️ [${this.serviceName}] 빈 메시지`);
                return null;
            }
            const eventData = JSON.parse(message.value.toString());
            if (!eventData.eventType || !eventData.aggregateId) {
                console.warn(`⚠️ [${this.serviceName}] 잘못된 이벤트 구조:`, eventData);
                return null;
            }
            return eventData;
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] 메시지 파싱 오류:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                messageValue: message.value?.toString(),
            });
            return null;
        }
    }
    async processEvent(event) {
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
        }
        catch (error) {
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
    async handleProcessingError(message, error) {
        const retryCountHeader = message.headers?.retryCount;
        const retryCount = retryCountHeader ?
            parseInt(retryCountHeader.toString()) : 0;
        if (retryCount < this.retryConfig.maxRetries) {
            const delay = this.calculateRetryDelay(retryCount);
            console.log(`🔄 [${this.serviceName}] 재시도 예정:`, {
                retryCount: retryCount + 1,
                maxRetries: this.retryConfig.maxRetries,
                delayMs: delay,
            });
            await this.sleep(delay);
            console.log(`🔄 [${this.serviceName}] 재시도 실행 필요 - 별도 구현 필요`);
        }
        else {
            console.error(`💀 [${this.serviceName}] 최대 재시도 초과, DLQ 전송 필요:`, {
                retryCount,
                maxRetries: this.retryConfig.maxRetries,
                error: error.message,
            });
        }
    }
    calculateRetryDelay(retryCount) {
        const baseDelay = this.retryConfig.retryDelayMs;
        if (this.retryConfig.exponentialBackoff) {
            return baseDelay * Math.pow(2, retryCount);
        }
        return baseDelay;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async isConnected() {
        try {
            return true;
        }
        catch {
            return false;
        }
    }
    getRegisteredHandlers() {
        return Array.from(this.eventHandlers.keys());
    }
    async getConsumerGroupInfo() {
        try {
            const admin = this.kafka.admin();
            await admin.connect();
            const groups = await admin.listGroups();
            const groupInfo = groups.groups.find(g => g.groupId === `${this.serviceName}-consumer`);
            await admin.disconnect();
            return groupInfo;
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] Consumer 그룹 정보 조회 실패:`, error);
            return null;
        }
    }
    async commitOffsets(topicPartitions = []) {
        try {
            await this.consumer.commitOffsets(topicPartitions);
            console.log(`✅ [${this.serviceName}] 오프셋 커밋 완료`);
        }
        catch (error) {
            console.error(`❌ [${this.serviceName}] 오프셋 커밋 실패:`, error);
            throw error;
        }
    }
    pause(topics = []) {
        this.consumer.pause(topics);
        console.log(`⏸️ [${this.serviceName}] Consumer 일시정지`);
    }
    resume(topics = []) {
        this.consumer.resume(topics);
        console.log(`▶️ [${this.serviceName}] Consumer 재시작`);
    }
}
exports.EventConsumer = EventConsumer;
//# sourceMappingURL=EventConsumer.js.map