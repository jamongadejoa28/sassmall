import { DomainEvent } from './types';
export declare class EventPublisher {
    private producer;
    private kafka;
    private serviceName;
    constructor(kafkaBrokers?: string[], serviceName?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    publish<T extends DomainEvent>(event: T, topic?: string): Promise<void>;
    publishBatch(events: DomainEvent[], topic?: string): Promise<void>;
    publishTransaction(events: DomainEvent[]): Promise<void>;
    private getTopicForEvent;
    private enrichEvent;
    isConnected(): Promise<boolean>;
    sendToDeadLetterQueue(originalEvent: DomainEvent, error: Error, retryCount?: number): Promise<void>;
}
//# sourceMappingURL=EventPublisher.d.ts.map