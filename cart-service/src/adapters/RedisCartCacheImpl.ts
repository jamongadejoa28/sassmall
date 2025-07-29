// cart-service/src/adapters/RedisCartCacheImpl.ts
// ========================================

import { Cart } from "../entities/Cart";
import { CartCache } from "../usecases/types";
import Redis from "ioredis";

export class RedisCartCacheImpl implements CartCache {
  private redis: Redis;
  private keyPrefix: string;
  private defaultTTL: number;
  private sessionCartTTL: number;

  constructor(redis: Redis, keyPrefix = "cart:", defaultTTL = 1800, sessionCartTTL = 1800) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.defaultTTL = defaultTTL; // 일반 캐시 TTL
    this.sessionCartTTL = sessionCartTTL; // 세션 장바구니 TTL (30분)
  }

  async setCart(cartId: string, cart: Cart, isSessionCart = false): Promise<void> {
    const key = `${this.keyPrefix}cart:${cartId}`;
    const value = JSON.stringify(cart.toJSON());
    const ttl = isSessionCart ? this.sessionCartTTL : this.defaultTTL;
    await this.redis.setex(key, ttl, value);
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const key = `${this.keyPrefix}cart:${cartId}`;
    const value = await this.redis.get(key);

    if (!value) return null;

    try {
      const data = JSON.parse(value);
      return new Cart(data);
    } catch (error) {
      console.error("Failed to parse cart from cache:", error);
      return null;
    }
  }

  async setUserCartId(userId: string, cartId: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    await this.redis.setex(key, this.defaultTTL * 2, cartId); // 더 긴 TTL
  }

  async getUserCartId(userId: string): Promise<string | null> {
    const key = `${this.keyPrefix}user:${userId}`;
    return await this.redis.get(key);
  }

  async setSessionCartId(sessionId: string, cartId: string): Promise<void> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    await this.redis.setex(key, this.sessionCartTTL, cartId);
  }

  async getSessionCartId(sessionId: string): Promise<string | null> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    return await this.redis.get(key);
  }

  async deleteCart(cartId: string): Promise<void> {
    const key = `${this.keyPrefix}cart:${cartId}`;
    await this.redis.del(key);
  }

  async deleteUserCart(userId: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    await this.redis.del(key);
  }

  async deleteSessionCart(sessionId: string): Promise<void> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    await this.redis.del(key);
  }

  // ========================================
  // 세션 타임아웃 관리 메서드
  // ========================================

  /**
   * 세션 장바구니 TTL 연장 (사용자 활동 시 호출)
   */
  async extendSessionCartTTL(sessionId: string): Promise<boolean> {
    const cartId = await this.getSessionCartId(sessionId);
    if (!cartId) return false;

    // 세션 ID -> 장바구니 ID 매핑 TTL 연장
    const sessionKey = `${this.keyPrefix}session:${sessionId}`;
    await this.redis.expire(sessionKey, this.sessionCartTTL);

    // 장바구니 데이터 TTL 연장
    const cartKey = `${this.keyPrefix}cart:${cartId}`;
    await this.redis.expire(cartKey, this.sessionCartTTL);

    return true;
  }

  /**
   * 세션 장바구니 남은 시간 확인
   */
  async getSessionCartRemainingTTL(sessionId: string): Promise<number> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    return await this.redis.ttl(key);
  }

  /**
   * 세션 장바구니 존재 여부 및 활성 상태 확인
   */
  async isSessionCartActive(sessionId: string): Promise<boolean> {
    const ttl = await this.getSessionCartRemainingTTL(sessionId);
    return ttl > 0; // TTL이 0보다 크면 활성 상태
  }

  /**
   * 만료된 세션 장바구니 정리 (클린업 작업)
   */
  async cleanupExpiredSessionCarts(): Promise<number> {
    const pattern = `${this.keyPrefix}session:*`;
    const keys = await this.redis.keys(pattern);
    let cleanedCount = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        // 만료된 세션의 장바구니 ID 가져오기
        const cartId = await this.redis.get(key);
        if (cartId) {
          // 장바구니 데이터도 함께 정리
          await this.deleteCart(cartId);
        }
        await this.redis.del(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}
