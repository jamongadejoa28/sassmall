// cart-service/src/adapters/CacheServiceImpl.ts (새 파일)
// ========================================

import { Redis } from "ioredis";
import { CacheService } from "../usecases/types";

/**
 * CacheServiceImpl - Redis 기반 캐시 서비스 구현체 (cart-service용)
 *
 * 책임:
 * 1. Redis 연결 관리 및 연결 풀 최적화
 * 2. 데이터 직렬화/역직렬화 (JSON)
 * 3. TTL(Time To Live) 관리
 * 4. 패턴 기반 캐시 무효화
 * 5. 에러 처리 및 장애 복구 (graceful degradation)
 * 6. 성능 모니터링 및 로깅
 *
 * product-service의 CacheServiceImpl과 동일한 패턴 적용
 */
export class CacheServiceImpl implements CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  private readonly namespace: string;
  private readonly compressionThreshold: number = 1024; // 1KB 이상 시 압축

  constructor(
    private readonly config: {
      host: string;
      port: number;
      password?: string | undefined;
      db?: number;
      keyPrefix?: string;
      maxRetriesPerRequest?: number;
      lazyConnect?: boolean;
    }
  ) {
    this.namespace = config.keyPrefix || "cart-service:";
    this.redis = this.createRedisConnection();
    this.setupEventHandlers();
  }

  // ========================================
  // Redis 연결 관리
  // ========================================

  /**
   * Redis 연결 생성 및 설정 (product-service와 동일한 패턴)
   */
  private createRedisConnection(): Redis {
    const redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      ...(this.config.password && { password: this.config.password }),
      db: this.config.db || 1,

      // 연결 설정
      lazyConnect: this.config.lazyConnect ?? true,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest ?? 3,

      // 성능 최적화
      enableAutoPipelining: true,

      // 재연결 전략
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        return err.message.includes(targetError);
      },

      // 재시도 전략
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },

      // 연결 풀 설정
      family: 4,
      keepAlive: 30000, // 30초
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    return redis;
  }

  /**
   * Redis 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.redis.on("connect", () => {
      this.isConnected = true;
      console.log("[CartService-CacheService] Redis 연결 성공");
    });

    this.redis.on("ready", () => {
      console.log("[CartService-CacheService] Redis 준비 완료");
    });

    this.redis.on("error", (error) => {
      this.isConnected = false;
      console.error(
        "[CartService-CacheService] Redis 연결 오류:",
        error.message
      );
    });

    this.redis.on("close", () => {
      this.isConnected = false;
      console.warn("[CartService-CacheService] Redis 연결 종료");
    });

    this.redis.on("reconnecting", () => {
      console.log("[CartService-CacheService] Redis 재연결 시도 중...");
    });
  }

  // ========================================
  // 핵심 캐시 연산
  // ========================================

  /**
   * 캐시에서 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        console.warn(
          "[CartService-CacheService] Redis 연결되지 않음 - 캐시 조회 건너뜀"
        );
        return null;
      }

      const fullKey = this.getFullKey(key);
      const rawValue = await this.redis.get(fullKey);

      if (rawValue === null) {
        return null;
      }

      // 압축된 데이터 처리
      const value = this.isCompressed(rawValue)
        ? this.decompress(rawValue)
        : rawValue;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error("[CartService-CacheService] 캐시 조회 오류:", error);
      return null; // 캐시 오류 시 null 반환 (graceful degradation)
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn(
          "[CartService-CacheService] Redis 연결되지 않음 - 캐시 저장 건너뜀"
        );
        return;
      }

      const fullKey = this.getFullKey(key);
      let serializedValue = JSON.stringify(value);

      // 큰 데이터 압축 처리
      if (serializedValue.length > this.compressionThreshold) {
        serializedValue = this.compress(serializedValue);
      }

      if (ttl && ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
    } catch (error) {
      console.error("[CartService-CacheService] 캐시 저장 오류:", error);
      // 캐시 저장 실패 시 조용히 무시 (graceful degradation)
    }
  }

  /**
   * 캐시에서 데이터 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn(
          "[CartService-CacheService] Redis 연결되지 않음 - 캐시 삭제 건너뜀"
        );
        return;
      }

      const fullKey = this.getFullKey(key);
      await this.redis.del(fullKey);
    } catch (error) {
      console.error("[CartService-CacheService] 캐시 삭제 오류:", error);
      // 캐시 삭제 실패 시 조용히 무시
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn(
          "[CartService-CacheService] Redis 연결되지 않음 - 패턴 무효화 건너뜀"
        );
        return;
      }

      const fullPattern = this.getFullKey(pattern);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        // 배치 삭제 (파이프라인 사용)
        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();

        console.log(
          `[CartService-CacheService] 패턴 '${pattern}'에 해당하는 ${keys.length}개 키 삭제 완료`
        );
      }
    } catch (error) {
      console.error("[CartService-CacheService] 패턴 무효화 오류:", error);
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 전체 키 생성 (네임스페이스 포함)
   */
  private getFullKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  /**
   * 데이터 압축 여부 확인
   */
  private isCompressed(value: string): boolean {
    return value.startsWith("COMPRESSED:");
  }

  /**
   * 데이터 압축 (간단한 구현)
   */
  private compress(value: string): string {
    // 실제로는 zlib 또는 gzip 사용
    return `COMPRESSED:${Buffer.from(value).toString("base64")}`;
  }

  /**
   * 데이터 압축 해제
   */
  private decompress(value: string): string {
    const compressed = value.replace("COMPRESSED:", "");
    return Buffer.from(compressed, "base64").toString();
  }

  // ========================================
  // 관리 및 모니터링
  // ========================================

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<{
    isConnected: boolean;
    totalKeys: number;
    usedMemory: string;
    hitRate?: number;
  }> {
    try {
      if (!this.isConnected) {
        return {
          isConnected: false,
          totalKeys: 0,
          usedMemory: "0B",
        };
      }

      const info = await this.redis.info("memory");
      const keyspace = await this.redis.info("keyspace");

      // 메모리 사용량 파싱
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const usedMemory = memoryMatch?.[1]?.trim() || "0B";

      // 키 개수 파싱
      const keyCountMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keyCountMatch ? parseInt(keyCountMatch[1]) : 0;

      return {
        isConnected: true,
        totalKeys,
        usedMemory,
      };
    } catch (error) {
      console.error("[CartService-CacheService] 통계 조회 오류:", error);
      return {
        isConnected: false,
        totalKeys: 0,
        usedMemory: "0B",
      };
    }
  }

  /**
   * Redis 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.isConnected = false;
        console.log("[CartService-CacheService] Redis 연결 정상 종료");
      }
    } catch (error) {
      console.error("[CartService-CacheService] Redis 연결 종료 오류:", error);
    }
  }

  /**
   * Redis 연결 상태 확인
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}
