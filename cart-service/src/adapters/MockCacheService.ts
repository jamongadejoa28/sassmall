// ========================================
// MockCacheService - 테스트용 캐시 서비스
// cart-service/src/adapters/MockCacheService.ts
// ========================================

import { CacheService } from "../usecases/types";

/**
 * MockCacheService - 테스트 환경용 메모리 기반 캐시 구현체
 *
 * 특징:
 * - Redis 연결 없이 동작
 * - 메모리 기반 Map으로 캐시 구현
 * - TTL 시뮬레이션
 * - 테스트 환경에서 안정적 동작
 */
export class MockCacheService implements CacheService {
  private cache: Map<string, { value: any; expiresAt?: number }> = new Map();
  private isConnectedFlag: boolean = true;

  // ========================================
  // 핵심 캐시 연산
  // ========================================

  /**
   * 캐시에서 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);

      if (!item) {
        return null;
      }

      // TTL 확인
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      return item.value as T;
    } catch (error) {
      console.warn("[MockCacheService] 캐시 조회 오류:", error);
      return null;
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const item: { value: any; expiresAt?: number } = { value };

      // TTL 설정
      if (ttl && ttl > 0) {
        item.expiresAt = Date.now() + ttl * 1000;
      }

      this.cache.set(key, item);
    } catch (error) {
      console.warn("[MockCacheService] 캐시 저장 오류:", error);
    }
  }

  /**
   * 캐시 키 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (error) {
      console.warn("[MockCacheService] 캐시 삭제 오류:", error);
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // 간단한 패턴 매칭 (wildcard * 지원)
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.warn("[MockCacheService] 패턴 무효화 오류:", error);
    }
  }

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
      // 만료된 키들 정리
      this.cleanupExpiredKeys();

      const totalKeys = this.cache.size;
      const usedMemory = this.calculateMemoryUsage();

      return {
        isConnected: this.isConnectedFlag,
        totalKeys,
        usedMemory: `${usedMemory}B`,
        hitRate: 95.5, // Mock 히트율
      };
    } catch (error) {
      console.warn("[MockCacheService] 통계 조회 오류:", error);
      return {
        isConnected: false,
        totalKeys: 0,
        usedMemory: "0B",
      };
    }
  }

  /**
   * 연결 종료 (Mock이므로 실제로는 아무것도 하지 않음)
   */
  async disconnect(): Promise<void> {
    this.isConnectedFlag = false;
    this.cache.clear();
    console.log("[MockCacheService] 연결 종료 완료");
  }

  // ========================================
  // 테스트 유틸리티 메서드들
  // ========================================

  /**
   * 모든 캐시 데이터 삭제 (테스트용)
   */
  async flush(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 캐시 키 개수 조회 (테스트용)
   */
  getKeyCount(): number {
    this.cleanupExpiredKeys();
    return this.cache.size;
  }

  /**
   * 특정 키 존재 여부 확인 (테스트용)
   */
  hasKey(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 모든 키 목록 조회 (테스트용)
   */
  getAllKeys(): string[] {
    this.cleanupExpiredKeys();
    return Array.from(this.cache.keys());
  }

  /**
   * 연결 상태 설정 (테스트용)
   */
  setConnectionStatus(connected: boolean): void {
    this.isConnectedFlag = connected;
  }

  // ========================================
  // Private 헬퍼 메서드들
  // ========================================

  /**
   * 만료된 키들 정리
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 메모리 사용량 추정 (대략적인 계산)
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      // 키 크기 + 값 크기 추정
      totalSize += key.length * 2; // 문자열은 대략 2바이트/글자
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 16; // 객체 오버헤드
    }

    return totalSize;
  }

  /**
   * TTL 조회 (테스트용)
   */
  getTTL(key: string): number {
    const item = this.cache.get(key);

    if (!item || !item.expiresAt) {
      return -1; // TTL 없음
    }

    const remaining = item.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -2; // 만료됨
  }
}
