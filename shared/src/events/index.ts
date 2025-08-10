// ========================================
// Events Module - 이벤트 드리븐 아키텍처 지원
// ========================================

// Event Types
export * from './types';

// Event Publisher & Consumer
import { EventPublisher } from './EventPublisher';
import { EventConsumer } from './EventConsumer';
import { EventFactory } from './EventFactory';

export { EventPublisher };
export { EventConsumer };
export type { 
  EventHandler, 
  EventHandlerMap, 
  ConsumerOptions, 
  RetryConfig 
} from './EventConsumer';

// Event Factory
export { EventFactory };

// 기본 인스턴스들 (편의성을 위한 팩토리)
export const createEventPublisher = (
  kafkaBrokers?: string[], 
  serviceName?: string
) => new EventPublisher(kafkaBrokers, serviceName);

export const createEventConsumer = (
  options: any,
  kafkaBrokers?: string[],
  serviceName?: string
) => new EventConsumer(options, kafkaBrokers, serviceName);

export const createEventFactory = (
  serviceName?: string,
  version?: string
) => new EventFactory(serviceName, version);