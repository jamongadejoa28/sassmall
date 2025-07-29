// ========================================
// CacheServiceImpl - Infrastructure 계층 (Redis 옵션 수정)
// src/adapters/CacheServiceImpl.ts
// ========================================

import Redis from "ioredis";
import { CacheService } from "../usecases/types";

/**
 * CacheServiceImpl - Redis 기반 캐시 서비스 구현체
 *
 * 책임:
 * 1. Redis 연결 관리 및 연결 풀 최적화
 * 2. 데이터 직렬화/역직렬화 (JSON)
 * 3. TTL(Time To Live) 관리
 * 4. 패턴 기반 캐시 무효화
 * 5. 에러 처리 및 장애 복구
 * 6. 성능 모니터링 및 로깅
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
    this.namespace = config.keyPrefix || "product-service:";
    this.redis = this.createRedisConnection();
    this.setupEventHandlers();
  }

  // ========================================
  // Redis 연결 관리
  // ========================================

  /**
   * Redis 연결 생성 및 설정 (ioredis 옵션에 맞게 수정)
   */
  private createRedisConnection(): Redis {
    const redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      ...(this.config.password && { password: this.config.password }),
      db: this.config.db || 0,

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
      keepAlive: 30000, // 30초 (milliseconds)
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
      console.log("[CacheService] Redis 연결 성공");
    });

    this.redis.on("ready", () => {
      console.log("[CacheService] Redis 준비 완료");
    });

    this.redis.on("error", (error) => {
      this.isConnected = false;
      console.error("[CacheService] Redis 연결 오류:", error.message);
    });

    this.redis.on("close", () => {
      this.isConnected = false;
      console.warn("[CacheService] Redis 연결 종료");
    });

    this.redis.on("reconnecting", () => {
      console.log("[CacheService] Redis 재연결 시도 중...");
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
      console.error("[CacheService] 캐시 조회 오류:", error);
      return null; // 캐시 오류 시 null 반환 (graceful degradation)
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
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
      console.error("[CacheService] 캐시 저장 오류:", error);
      // 캐시 저장 실패 시 조용히 무시 (graceful degradation)
    }
  }

  /**
   * 캐시에서 데이터 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn("[CacheService] Redis 연결되지 않음 - 캐시 삭제 건너뜀");
        return;
      }

      const fullKey = this.getFullKey(key);
      await this.redis.del(fullKey);
    } catch (error) {
      console.error("[CacheService] 캐시 삭제 오류:", error);
      // 캐시 삭제 실패 시 조용히 무시
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn("[CacheService] Redis 연결되지 않음 - 패턴 무효화 건너뜀");
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
          `[CacheService] 패턴 '${pattern}'에 해당하는 ${keys.length}개 키 삭제 완료`
        );
      }
    } catch (error) {
      console.error("[CacheService] 패턴 무효화 오류:", error);
    }
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
      const stats = await this.redis.info("stats");

      // 메모리 사용량 파싱 (타입 안전성 개선)
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const usedMemory = memoryMatch?.[1]?.trim() || "Unknown";

      // 키 개수 파싱 (타입 안전성 개선)
      const dbMatch = keyspace.match(/db0:keys=(\d+)/);
      const totalKeys = dbMatch?.[1] ? parseInt(dbMatch[1]) : 0;

      // 히트율 계산 (Redis 6.0+) - 타입 안전성 개선
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      let hitRate: number | undefined = undefined;

      if (hitsMatch?.[1] && missesMatch?.[1]) {
        const hits = parseInt(hitsMatch[1]);
        const misses = parseInt(missesMatch[1]);
        const total = hits + misses;
        hitRate = total > 0 ? (hits / total) * 100 : 0;
      }

      // 조건부 속성 추가로 타입 호환성 해결
      const result: {
        isConnected: boolean;
        totalKeys: number;
        usedMemory: string;
        hitRate?: number;
      } = {
        isConnected: true,
        totalKeys,
        usedMemory,
      };

      if (hitRate !== undefined) {
        result.hitRate = hitRate;
      }

      return result;
    } catch (error) {
      console.error("[CacheService] 통계 조회 오류:", error);
      return {
        isConnected: false,
        totalKeys: 0,
        usedMemory: "0B",
      };
    }
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        console.log("[CacheService] Redis 연결 정상 종료");
      }
    } catch (error) {
      console.error("[CacheService] 연결 종료 오류:", error);
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 네임스페이스가 포함된 전체 키 생성
   */
  private getFullKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  /**
   * 데이터 압축 (간단한 예시 - 실제로는 gzip 등 사용)
   */
  private compress(data: string): string {
    // 실제 환경에서는 zlib, gzip 등을 사용
    // 여기서는 간단한 마킹만 수행
    return `COMPRESSED:${data}`;
  }

  /**
   * 데이터 압축 해제
   */
  private decompress(data: string): string {
    if (this.isCompressed(data)) {
      return data.replace("COMPRESSED:", "");
    }
    return data;
  }

  /**
   * 압축된 데이터인지 확인
   */
  private isCompressed(data: string): boolean {
    return data.startsWith("COMPRESSED:");
  }

  /**
   * 연결 상태 확인
   */
  isReady(): boolean {
    return this.isConnected && this.redis.status === "ready";
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      // lazyConnect 때문에 실제 연결을 시도해봐야 함
      const result = await this.redis.ping();
      return result === "PONG";
    } catch (error) {
      console.error("[CacheService] 헬스체크 실패:", error);
      return false;
    }
  }

  /**
   * 모든 캐시 데이터 삭제 (개발/테스트용)
   */
  async flush(): Promise<void> {
    try {
      if (!this.isConnected) {
        console.warn("[CacheService] Redis 연결되지 않음 - flush 건너뜀");
        return;
      }
      // 네임스페이스가 아닌 전체 DB를 비우므로 주의해서 사용해야 합니다.
      await this.redis.flushdb();
      console.log("[CacheService] 모든 캐시 데이터 삭제 완료 (flushdb)");
    } catch (error) {
      console.error("[CacheService] flush 오류:", error);
    }
  }
}
