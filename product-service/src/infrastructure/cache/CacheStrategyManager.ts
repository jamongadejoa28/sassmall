import { RedisConfig } from "../config/RedisConfig";
import { CacheServiceImpl } from "../../adapters/CacheServiceImpl";
import { CacheKeyBuilder } from "./CacheKeyBuilder";

/**
 * 캐시 전략 관리자
 *
 * 책임:
 * 1. 도메인별 캐시 무효화 전략
 * 2. 캐시 워밍업 관리
 * 3. 캐시 성능 모니터링
 * 4. 무효화 패턴 관리
 */
export class CacheStrategyManager {
  private readonly keyBuilder: CacheKeyBuilder;

  constructor(
    private readonly redisConfig: RedisConfig,
    private readonly cacheService: CacheServiceImpl
  ) {
    this.keyBuilder = new CacheKeyBuilder(redisConfig);
  }

  /**
   * 상품 관련 캐시 무효화
   */
  async invalidateProduct(productId: string): Promise<void> {
    const tasks = [
      // 상품 상세 캐시 삭제
      this.cacheService.delete(
        this.keyBuilder.buildProductDetailKey(productId)
      ),

      // 상품 목록 캐시 패턴 무효화
      this.cacheService.invalidatePattern(
        this.keyBuilder.buildInvalidationPattern("productList")
      ),

      // 검색 결과 캐시 패턴 무효화
      this.cacheService.invalidatePattern(
        this.keyBuilder.buildInvalidationPattern("search")
      ),

      // 브랜드 목록 캐시 삭제 (상품 브랜드가 변경될 수 있음)
      this.cacheService.delete(this.keyBuilder.buildBrandListKey()),
    ];

    await Promise.allSettled(tasks);
    console.log(
      `[CacheStrategyManager] 상품 ${productId} 관련 캐시 무효화 완료`
    );
  }

  /**
   * 카테고리 관련 캐시 무효화
   */
  async invalidateCategory(categoryId: string): Promise<void> {
    const tasks = [
      // 카테고리 상세 캐시 삭제
      this.cacheService.delete(this.keyBuilder.buildCategoryKey(categoryId)),

      // 카테고리 트리 캐시 삭제
      this.cacheService.delete(this.keyBuilder.buildCategoryTreeKey()),

      // 상품 목록 캐시 패턴 무효화 (카테고리별 상품 목록)
      this.cacheService.invalidatePattern(
        this.keyBuilder.buildInvalidationPattern("productList")
      ),
    ];

    await Promise.allSettled(tasks);
    console.log(
      `[CacheStrategyManager] 카테고리 ${categoryId} 관련 캐시 무효화 완료`
    );
  }

  /**
   * 재고 관련 캐시 무효화
   */
  async invalidateInventory(productId: string): Promise<void> {
    const tasks = [
      // 재고 캐시 삭제
      this.cacheService.delete(this.keyBuilder.buildInventoryKey(productId)),

      // 상품 상세 캐시 삭제 (재고 정보 포함)
      this.cacheService.delete(
        this.keyBuilder.buildProductDetailKey(productId)
      ),

      // 상품 목록 캐시 패턴 무효화 (재고 상태 정보 포함)
      this.cacheService.invalidatePattern(
        this.keyBuilder.buildInvalidationPattern("productList")
      ),
    ];

    await Promise.allSettled(tasks);
    console.log(
      `[CacheStrategyManager] 재고 ${productId} 관련 캐시 무효화 완료`
    );
  }

  /**
   * 전체 캐시 워밍업 (애플리케이션 시작 시)
   */
  async warmupCache(): Promise<void> {
    console.log("[CacheStrategyManager] 캐시 워밍업 시작...");

    try {
      // 주요 데이터 사전 로딩 (실제로는 Repository를 주입받아 사용)
      // 예: 인기 상품, 메인 카테고리 등

      console.log("[CacheStrategyManager] 캐시 워밍업 완료");
    } catch (error) {
      console.error("[CacheStrategyManager] 캐시 워밍업 실패:", error);
    }
  }

  /**
   * 캐시 성능 모니터링
   */
  async getCacheMetrics(): Promise<{
    redisStats: any;
    keyCount: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const redisStats = await this.cacheService.getStats();

      return {
        redisStats,
        keyCount: redisStats.totalKeys,
        memoryUsage: redisStats.usedMemory,
        ...(redisStats.hitRate !== undefined && {
          hitRate: redisStats.hitRate,
        }),
      };
    } catch (error) {
      console.error("[CacheStrategyManager] 캐시 메트릭 조회 실패:", error);
      return {
        redisStats: null,
        keyCount: 0,
        memoryUsage: "0B",
      };
    }
  }

  /**
   * 캐시 상태 체크 (헬스체크용)
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    message: string;
    metrics?: any;
  }> {
    try {
      const isConnected = await this.cacheService.healthCheck();

      if (!isConnected) {
        return {
          isHealthy: false,
          message: "Redis 연결이 끊어졌습니다",
        };
      }

      const metrics = await this.getCacheMetrics();

      return {
        isHealthy: true,
        message: "캐시 시스템이 정상 작동 중입니다",
        metrics,
      };
    } catch (error) {
      return {
        isHealthy: false,
        message: `캐시 헬스체크 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * 캐시 정리 (개발/테스트 환경용)
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.cacheService.flush();
      console.log("[CacheStrategyManager] 모든 캐시 정리 완료");
    } catch (error) {
      console.error("[CacheStrategyManager] 캐시 정리 실패:", error);
    }
  }
}
