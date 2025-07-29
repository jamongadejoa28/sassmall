import { CacheServiceImpl } from "../../adapters/CacheServiceImpl"; // 올바른 경로

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
  retryDelayOnFailover?: number;
  lazyConnect?: boolean;
}

/**
 * 캐시 전략 설정 인터페이스
 */
export interface CacheStrategyConfig {
  // 기본 TTL 설정 (초 단위)
  defaultTtl: number;

  // 도메인별 TTL 설정
  ttlByDomain: {
    product: number; // 상품 정보 캐시
    productList: number; // 상품 목록 캐시
    category: number; // 카테고리 정보 캐시
    inventory: number; // 재고 정보 캐시
    search: number; // 검색 결과 캐시
  };

  // 캐시 키 패턴
  keyPatterns: {
    product: string;
    productList: string;
    category: string;
    inventory: string;
    search: string;
  };

  // 성능 설정
  compressionThreshold: number; // 압축 임계값 (bytes)
  batchSize: number; // 배치 처리 크기
}

/**
 * Redis 설정 관리 클래스
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
   * 환경변수에서 Redis 설정 로드
   */
  static fromEnvironment(): RedisConfig {
    // password 처리 개선 - 빈 문자열도 undefined로 처리
    const redisPassword = process.env.REDIS_PASSWORD?.trim();

    const connectionConfig: RedisConnectionConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password:
        redisPassword && redisPassword.length > 0 ? redisPassword : undefined,
      db: parseInt(process.env.REDIS_DB || "0"),
      keyPrefix: process.env.REDIS_KEY_PREFIX || "product-service:",
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3"),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || "100"),
      lazyConnect: process.env.REDIS_LAZY_CONNECT === "true",
    };

    const strategyConfig: CacheStrategyConfig = {
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || "300"), // 5분

      ttlByDomain: {
        product: parseInt(process.env.CACHE_PRODUCT_TTL || "600"), // 10분
        productList: parseInt(process.env.CACHE_PRODUCT_LIST_TTL || "300"), // 5분
        category: parseInt(process.env.CACHE_CATEGORY_TTL || "1800"), // 30분
        inventory: parseInt(process.env.CACHE_INVENTORY_TTL || "60"), // 1분
        search: parseInt(process.env.CACHE_SEARCH_TTL || "180"), // 3분
      },

      keyPatterns: {
        product: "product:",
        productList: "product-list:",
        category: "category:",
        inventory: "inventory:",
        search: "search:",
      },

      compressionThreshold: parseInt(
        process.env.CACHE_COMPRESSION_THRESHOLD || "1024"
      ),
      batchSize: parseInt(process.env.CACHE_BATCH_SIZE || "100"),
    };

    return RedisConfig.create(connectionConfig, strategyConfig);
  }

  /**
   * CacheService 인스턴스 생성 및 반환
   */
  getCacheService(): CacheServiceImpl {
    if (!this.cacheService) {
      this.cacheService = new CacheServiceImpl(this.connectionConfig);
    }
    return this.cacheService;
  }

  /**
   * 연결 설정 반환
   */
  getConnectionConfig(): RedisConnectionConfig {
    return { ...this.connectionConfig };
  }

  /**
   * 캐시 전략 설정 반환
   */
  getStrategyConfig(): CacheStrategyConfig {
    return { ...this.strategyConfig };
  }

  /**
   * 도메인별 TTL 조회
   */
  getTtlForDomain(domain: keyof CacheStrategyConfig["ttlByDomain"]): number {
    return (
      this.strategyConfig.ttlByDomain[domain] || this.strategyConfig.defaultTtl
    );
  }

  /**
   * 도메인별 키 패턴 조회
   */
  getKeyPatternForDomain(
    domain: keyof CacheStrategyConfig["keyPatterns"]
  ): string {
    return this.strategyConfig.keyPatterns[domain];
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.disconnect();
      this.cacheService = null;
    }
  }
}
