// ========================================
// Redis 테스트 클라이언트
// cart-service/src/__tests__/utils/RedisTestClient.ts
// ========================================

import { Redis } from "ioredis";

export class RedisTestClient {
  constructor(private redis: Redis) {}

  /**
   * 모든 캐시 삭제
   */
  async flushAll(): Promise<void> {
    await this.redis.flushdb();
  }

  /**
   * 특정 패턴의 키들 삭제
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      return await this.redis.del(...keys);
    }
    return 0;
  }

  /**
   * 캐시 상태 확인
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    cartKeys: number;
    userKeys: number;
    sessionKeys: number;
  }> {
    const allKeys = await this.redis.keys("*");
    const cartKeys = await this.redis.keys("cart-service:cart:*");
    const userKeys = await this.redis.keys("cart-service:user:*");
    const sessionKeys = await this.redis.keys("cart-service:session:*");

    return {
      totalKeys: allKeys.length,
      cartKeys: cartKeys.length,
      userKeys: userKeys.length,
      sessionKeys: sessionKeys.length,
    };
  }

  /**
   * 특정 키의 TTL 확인
   */
  async getTTL(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * 키 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }
}
