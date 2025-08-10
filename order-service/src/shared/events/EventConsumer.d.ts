import { DomainEvent, EventTypeMap } from './types';
export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void>;
export type EventHandlerMap = {
    [K in keyof EventTypeMap]?: EventHandler<EventTypeMap[K]>;
};
export interface ConsumerOptions {
    groupId: string;
    topics: string[];
    fromBeginning?: boolean;
    autoCommit?: boolean;
    sessionTimeout?: number;
    heartbeatInterval?: number;
}
export interface RetryConfig {
    maxRetries: number;
    retryDelayMs: number;
    exponentialBackoff: boolean;
}
export declare class EventConsumer {
    private consumer;
    private kafka;
    private serviceName;
    private eventHandlers;
    private retryConfig;
    constructor(options: ConsumerOptions, kafkaBrokers?: string[], serviceName?: string, retryConfig?: RetryConfig);
    connect(topics: string[], fromBeginning?: boolean): Promise<void>;
    disconnect(): Promise<void>;
    on<K extends keyof EventTypeMap>(eventType: K, handler: EventHandler<EventTypeMap[K]>): void;
    registerHandlers(handlers: EventHandlerMap): void;
    private handleMessage;
    private parseMessage;
    private processEvent;
    private handleProcessingError;
    private calculateRetryDelay;
    private sleep;
    isConnected(): Promise<boolean>;
    getRegisteredHandlers(): string[];
    getConsumerGroupInfo(): Promise<any>;
    commitOffsets(topicPartitions?: Array<{
        topic: string;
        partition: number;
        offset: string;
    }>): Promise<void>;
    pause(topics?: Array<{
        topic: string;
        partitions?: number[];
    }>): void;
    resume(topics?: Array<{
        topic: string;
        partitions?: number[];
    }>): void;
}
//# sourceMappingURL=EventConsumer.d.ts.map