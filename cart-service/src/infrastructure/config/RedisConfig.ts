// ========================================
// Redis 설정 관리 클래스 - cart-service
// cart-service/src/infrastructure/config/RedisConfig.ts
// ========================================

import { CacheServiceImpl } from "../../adapters/CacheServiceImpl";

/**
 * Redis 연결 설정 인터페이스
 */
export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string | undefined;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

/**
 * 장바구니 캐시 전략 설정 인터페이스
 */
export interface CacheStrategyConfig {
  // 기본 TTL 설정 (초 단위)
  defaultTtl: number;

  // 장바구니 도메인별 TTL 설정
  ttlByDomain: {
    cart: number; // 장바구니 데이터 캐시
    userCart: number; // 사용자별 장바구니 ID 맵핑
    sessionCart: number; // 세션별 장바구니 ID 맵핑
    cartItems: number; // 장바구니 아이템 캐시
  };

  // 캐시 키 패턴
  keyPatterns: {
    cart: string; // "cart:{cartId}"
    userCart: string; // "user:{userId}"
    sessionCart: string; // "session:{sessionId}"
    cartItems: string; // "cart:{cartId}:items"
  };

  // 성능 설정
  compressionThreshold: number; // 압축 임계값 (bytes)
  batchSize: number; // 배치 처리 크기
}

/**
 * Redis 설정 관리 클래스 (product-service 패턴 적용)
 */
export class RedisConfig {
  private static instance: RedisConfig;
  private cacheService: CacheServiceImpl | null = null;

  private constructor(
    private readonly connectionConfig: RedisConnectionConfig,
    private readonly strategyConfig: CacheStrategyConfig
  ) {}

  /**
   * 싱글톤 인스턴스 생성
   */
  static create(
    connectionConfig: RedisConnectionConfig,
    strategyConfig: CacheStrategyConfig
  ): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig(connectionConfig, strategyConfig);
    }
    return RedisConfig.instance;
  }

  /**
   * 환경변수에서 Redis 설정 로드 (cart-service 전용)
   */
  static fromEnvironment(): RedisConfig {
    // password 처리 개선 - 빈 문자열도 undefined로 처리
    const redisPassword = process.env.REDIS_PASSWORD?.trim();

    const connectionConfig: RedisConnectionConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password:
        redisPassword && redisPassword.length > 0 ? redisPassword : undefined,
      db: parseInt(process.env.REDIS_DB || "1"),
      keyPrefix: process.env.REDIS_KEY_PREFIX || "cart-service:",
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3"),
      lazyConnect: true,
    };

    const strategyConfig: CacheStrategyConfig = {
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || "300"),
      ttlByDomain: {
        cart: parseInt(process.env.CACHE_CART_TTL || "1800"), // 30분
        userCart: parseInt(process.env.CACHE_USER_CART_TTL || "3600"), // 1시간
        sessionCart: parseInt(process.env.CACHE_DEFAULT_TTL || "300"), // 5분
        cartItems: parseInt(process.env.CACHE_CART_TTL || "1800"), // 30분
      },
      keyPatterns: {
        cart: "cart:{id}",
        userCart: "user:{userId}",
        sessionCart: "session:{sessionId}",
        cartItems: "cart:{cartId}:items",
      },
      compressionThreshold: 1024, // 1KB
      batchSize: 50,
    };

    return new RedisConfig(connectionConfig, strategyConfig);
  }

  /**
   * CacheService 인스턴스 반환 (팩토리 패턴)
   */
  getCacheService(): CacheServiceImpl {
    if (!this.cacheService) {
      this.cacheService = new CacheServiceImpl(this.connectionConfig);
    }
    return this.cacheService;
  }

  /**
   * 연결 설정 조회
   */
  getConnectionConfig(): RedisConnectionConfig {
    return { ...this.connectionConfig };
  }

  /**
   * 캐시 전략 설정 조회
   */
  getStrategyConfig(): CacheStrategyConfig {
    return { ...this.strategyConfig };
  }

  /**
   * 도메인별 TTL 조회
   */
  getTtlForDomain(domain: keyof CacheStrategyConfig["ttlByDomain"]): number {
    return this.strategyConfig.ttlByDomain[domain];
  }

  /**
   * 키 패턴 조회
   */
  getKeyPattern(type: keyof CacheStrategyConfig["keyPatterns"]): string {
    return this.strategyConfig.keyPatterns[type];
  }

  /**
   * Redis 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.cacheService) {
      // CacheServiceImpl에 disconnect 메서드가 있다고 가정
      await this.cacheService.disconnect?.();
      this.cacheService = null;
    }
  }

  /**
   * 캐시 상태 확인
   */
  async getHealthStatus(): Promise<{
    status: "healthy" | "unhealthy";
    isConnected: boolean;
    stats?: any;
  }> {
    if (!this.cacheService) {
      return { status: "unhealthy", isConnected: false };
    }

    try {
      const stats = await this.cacheService.getStats();
      return {
        status: stats.isConnected ? "healthy" : "unhealthy",
        isConnected: stats.isConnected,
        stats,
      };
    } catch (error) {
      return { status: "unhealthy", isConnected: false };
    }
  }
}
