import { RedisConfig, CacheStrategyConfig } from "../config/RedisConfig";
/**
 * 캐시 키 생성 유틸리티 클래스
 */
export class CacheKeyBuilder {
  constructor(private readonly redisConfig: RedisConfig) {}

  /**
   * 상품 상세 캐시 키 생성
   */
  buildProductDetailKey(productId: string): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("product");
    return `${pattern}detail:${productId}`;
  }

  /**
   * 상품 목록 캐시 키 생성
   */
  buildProductListKey(filters: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  }): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("productList");

    // 필터를 정렬된 문자열로 변환
    const filterKeys = Object.keys(filters).sort();
    const filterString = filterKeys
      .map((key) => `${key}=${filters[key as keyof typeof filters]}`)
      .join("|");

    // MD5 해시로 키 길이 제한 (실제로는 crypto 모듈 사용)
    const hash = this.simpleHash(filterString);

    return `${pattern}list:${hash}`;
  }

  /**
   * 카테고리 캐시 키 생성
   */
  buildCategoryKey(categoryId: string): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("category");
    return `${pattern}detail:${categoryId}`;
  }

  /**
   * 카테고리 트리 캐시 키 생성
   */
  buildCategoryTreeKey(): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("category");
    return `${pattern}tree:all`;
  }

  /**
   * 재고 캐시 키 생성
   */
  buildInventoryKey(productId: string): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("inventory");
    return `${pattern}product:${productId}`;
  }

  /**
   * 검색 결과 캐시 키 생성
   */
  buildSearchKey(query: string, filters: Record<string, any> = {}): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("search");

    const searchString = `query=${query}|${Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("|")}`;

    const hash = this.simpleHash(searchString);

    return `${pattern}result:${hash}`;
  }

  /**
   * 브랜드 목록 캐시 키 생성
   */
  buildBrandListKey(): string {
    const pattern = this.redisConfig.getKeyPatternForDomain("product");
    return `${pattern}brands:all`;
  }

  /**
   * 패턴별 무효화 키 생성
   */
  buildInvalidationPattern(
    domain: keyof CacheStrategyConfig["keyPatterns"],
    pattern: string = "*"
  ): string {
    const domainPattern = this.redisConfig.getKeyPatternForDomain(domain);
    return `${domainPattern}${pattern}`;
  }

  /**
   * 간단한 해시 함수 (실제로는 crypto.createHash 사용)
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash).toString(16);
  }
}
