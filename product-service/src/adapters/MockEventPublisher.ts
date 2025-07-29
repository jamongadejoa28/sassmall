// ========================================
// MockEventPublisher - 임시 이벤트 발행자
// src/adapters/MockEventPublisher.ts
// ========================================

import { injectable } from "inversify";
import { EventPublisher } from "../usecases/types";

/**
 * MockEventPublisher - 개발/테스트용 이벤트 발행자
 *
 * 역할:
 * - 실제 이벤트 시스템 구현 전까지 임시로 사용
 * - 콘솔 로깅으로 이벤트 발행 시뮬레이션
 * - 나중에 실제 Kafka EventPublisher로 교체 예정
 */
@injectable()
export class MockEventPublisher implements EventPublisher {
  async publish(event: any): Promise<void> {
    try {
      // 개발 환경에서만 로깅
      if (process.env.NODE_ENV === "development") {
        console.log(`📢 [MockEventPublisher] 이벤트 발행:`, {
          eventType: event.constructor.name,
          eventId: event.id || "unknown",
          timestamp: new Date().toISOString(),
          data: event,
        });
      }

      // 실제로는 아무것도 하지 않음 (Mock)
      await Promise.resolve();
    } catch (error) {
      console.error(`❌ [MockEventPublisher] 이벤트 발행 실패:`, error);
      // Mock이므로 에러를 던지지 않고 로깅만
    }
  }
}
