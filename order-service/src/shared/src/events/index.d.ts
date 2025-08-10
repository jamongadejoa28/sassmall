export * from './types';
import { EventPublisher } from './EventPublisher';
import { EventConsumer } from './EventConsumer';
import { EventFactory } from './EventFactory';
export { EventPublisher };
export { EventConsumer };
export type { EventHandler, EventHandlerMap, ConsumerOptions, RetryConfig } from './EventConsumer';
export { EventFactory };
export declare const createEventPublisher: (kafkaBrokers?: string[], serviceName?: string) => EventPublisher;
export declare const createEventConsumer: (options: any, kafkaBrokers?: string[], serviceName?: string) => EventConsumer;
export declare const createEventFactory: (serviceName?: string, version?: string) => EventFactory;
//# sourceMappingURL=index.d.ts.map