// src/usecases/GetProductListUseCase.ts

import { injectable, inject } from "inversify";
import { Product } from "../entities/Product";
import { Category } from "../entities/Category";
import { Inventory } from "../entities/Inventory";
// ✅ 수정: shared/types/Result 클래스 사용
import { Result } from "../shared/types/Result";
// ✅ 수정: Repository는 usecases/types에서 import
import {
  ProductRepository,
  CategoryRepository,
  InventoryRepository,
  CacheService
} from "./types";
import { DomainError } from "../shared/errors/DomainError";
import { TYPES } from "../infrastructure/di/types";

// 상품 목록 조회 요청 DTO
export interface GetProductListRequest {
  page?: number;
  limit?: number;
  categoryId?: string;
  categoryName?: string; // 단일 카테고리 이름으로 검색
  categoryNames?: string[]; // 다중 카테고리 이름으로 검색
  search?: string;
  brand?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean; // 활성 상품 필터링
  sortBy?:
    | "price_asc"
    | "price_desc"
    | "name_asc"
    | "name_desc"
    | "created_asc"
    | "created_desc";
}

// 상품 목록 응답 DTO - exactOptionalPropertyTypes 대응
export interface ProductListResponse {
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    original_price: number; // ✅ 원가 필드 추가
    discountPrice?: number | undefined; // ✅ 명시적 undefined 타입
    discountPercentage: number; // ✅ 할인율 추가
    sku: string;
    brand: string;
    tags: string[];
    slug: string;
    is_active: boolean; // ✅ is_active 필드 추가
    category: {
      id: string;
      name: string;
      slug: string;
    };
    inventory: {
      availableQuantity: number;
      status: string;
    };
    createdAt: Date;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    appliedCategory?: string | undefined;
    appliedSearch?: string | undefined;
    appliedBrand?: string | string[] | undefined;
    appliedPriceRange?:
      | {
          min?: number | undefined;
          max?: number | undefined;
        }
      | undefined;
    appliedSortBy?: string | undefined;
  };
}

// 내부 필터 인터페이스
interface SearchFilters {
  categoryId?: string;
  brand?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
}

@injectable()
export class GetProductListUseCase {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;
  private readonly CACHE_TTL = 300; // 5분
  private readonly CACHE_KEY_PREFIX = "product_list:";

  constructor(
    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
    @inject(TYPES.InventoryRepository)
    private readonly inventoryRepository: InventoryRepository,
    @inject(TYPES.CacheService) private readonly cacheService: CacheService
  ) {}

  async execute(
    request: GetProductListRequest
  ): Promise<Result<ProductListResponse>> {
    try {
      // 1. 입력값 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        // ✅ 수정: DomainError 객체 전달
        return Result.fail(new DomainError(validationError, "INVALID_INPUT"));
      }

      // 2. 정규화된 파라미터 생성
      const normalizedParams = this.normalizeParameters(request);

      // 3. 캐시 확인 시도
      const cacheKey = this.buildCacheKey(normalizedParams);
      console.log(`[GetProductListUseCase] 캐시 키: ${cacheKey}`);
      try {
        const cachedResult =
          await this.cacheService.get<ProductListResponse>(cacheKey);
        if (cachedResult) {
          console.log(`[GetProductListUseCase] 캐시 히트: ${cacheKey}`);
          return Result.ok(cachedResult);
        } else {
          console.log(`[GetProductListUseCase] 캐시 미스: ${cacheKey}`);
        }
      } catch (cacheError) {
        console.error(`[GetProductListUseCase] 캐시 오류: ${cacheError}`);
        // 캐시 오류는 무시하고 계속 진행
      }

      // 4. 데이터베이스에서 상품 조회 - ✅ undefined 값 필터링
      const extractedSortBy = this.extractSortField(normalizedParams.sortBy);
      const extractedSortOrder = this.extractSortOrder(normalizedParams.sortBy);
      
      console.log(`[DEBUG] UseCase - Original sortBy: "${normalizedParams.sortBy}"`);
      console.log(`[DEBUG] UseCase - Extracted sortBy: "${extractedSortBy}"`);
      console.log(`[DEBUG] UseCase - Extracted sortOrder: "${extractedSortOrder}"`);
      
      const searchOptions: any = {
        page: normalizedParams.page,
        limit: normalizedParams.limit,
        sortBy: extractedSortBy,
        sortOrder: extractedSortOrder as "asc" | "desc",
      };

      // undefined 값들을 제거하여 exactOptionalPropertyTypes 문제 해결
      if (normalizedParams.search)
        searchOptions.search = normalizedParams.search;
      if (normalizedParams.categoryId)
        searchOptions.categoryId = normalizedParams.categoryId;
      if (normalizedParams.categoryName)
        searchOptions.categoryName = normalizedParams.categoryName;
      if (normalizedParams.categoryNames)
        searchOptions.categoryNames = normalizedParams.categoryNames;
      if (normalizedParams.brand) searchOptions.brand = normalizedParams.brand;
      if (normalizedParams.minPrice !== undefined)
        searchOptions.minPrice = normalizedParams.minPrice;
      if (normalizedParams.maxPrice !== undefined)
        searchOptions.maxPrice = normalizedParams.maxPrice;
      if (normalizedParams.isActive !== undefined)
        searchOptions.isActive = normalizedParams.isActive;

      const { products, total } =
        await this.productRepository.search(searchOptions);

      // 5. 상품 세부 정보 보강 (카테고리, 재고 정보)
      const enrichedProducts = await this.enrichProductsWithDetails(products);

      // 6. 응답 데이터 구성
      const response = this.buildResponse(
        enrichedProducts,
        total,
        normalizedParams,
        request
      );

      // 7. 캐시 저장 시도
      try {
        console.log(`[GetProductListUseCase] 캐시 저장 시도: ${cacheKey}`);
        await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
        console.log(`[GetProductListUseCase] 캐시 저장 완료: ${cacheKey}`);
      } catch (cacheError) {
        console.error(`[GetProductListUseCase] 캐시 저장 오류: ${cacheError}`);
        // 캐시 저장 오류는 무시
      }

      return Result.ok(response);
    } catch (error) {
      console.error("GetProductListUseCase 실행 오류:", error);
      
      if (error instanceof DomainError) {
        return Result.fail(error);
      }

      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      return Result.fail(
        new DomainError(
          `상품 목록 조회 중 오류가 발생했습니다: ${errorMessage}`,
          "INTERNAL_ERROR"
        )
      );
    }
  }

  /**
   * 입력값 유효성 검증
   */
  private validateInput(request: GetProductListRequest): string | null {
    // 페이지 번호 검증
    if (request.page !== undefined && request.page < 1) {
      return "페이지 번호는 1 이상이어야 합니다";
    }

    // 페이지 크기 검증
    if (request.limit !== undefined) {
      if (request.limit < 1) {
        return "페이지 크기는 1 이상이어야 합니다";
      }
      if (request.limit > this.MAX_LIMIT) {
        return `페이지 크기는 ${this.MAX_LIMIT} 이하여야 합니다`;
      }
    }

    // 가격 범위 검증
    if (request.minPrice !== undefined && request.minPrice < 0) {
      return "최소 가격은 0 이상이어야 합니다";
    }

    if (request.maxPrice !== undefined && request.maxPrice < 0) {
      return "최대 가격은 0 이상이어야 합니다";
    }

    if (
      request.minPrice !== undefined &&
      request.maxPrice !== undefined &&
      request.minPrice > request.maxPrice
    ) {
      return "최소 가격은 최대 가격보다 작거나 같아야 합니다";
    }

    // 검색어 길이 검증
    if (request.search !== undefined && request.search.trim().length > 100) {
      return "검색어는 100자 이하여야 합니다";
    }

    return null;
  }

  /**
   * 입력 파라미터 정규화
   */
  private normalizeParameters(request: GetProductListRequest) {
    return {
      page: Math.max(1, request.page || this.DEFAULT_PAGE),
      limit: Math.min(
        this.MAX_LIMIT,
        Math.max(1, request.limit || this.DEFAULT_LIMIT)
      ),
      categoryId: request.categoryId?.trim() || undefined,
      categoryName: request.categoryName?.trim() || undefined,
      categoryNames: request.categoryNames?.map(c => c.trim()).filter(c => c) || undefined,
      search: request.search?.trim() || undefined,
      brand: this.normalizeBrandParameter(request.brand),
      minPrice: request.minPrice || undefined,
      maxPrice: request.maxPrice || undefined,
      sortBy: request.sortBy || "created_desc",
      isActive: request.isActive, // isActive 파라미터 추가
    };
  }

  /**
   * 브랜드 파라미터 정규화 - 다중 브랜드 지원
   */
  private normalizeBrandParameter(brand?: string | string[]): string[] | undefined {
    if (!brand) return undefined;
    
    if (Array.isArray(brand)) {
      // 이미 배열인 경우, 빈 값 필터링 후 반환
      const filteredBrands = brand.filter(b => b && b.trim()).map(b => b.trim());
      return filteredBrands.length > 0 ? filteredBrands : undefined;
    }
    
    if (typeof brand === 'string') {
      // 문자열인 경우, 콤마로 분리하여 배열로 변환
      if (brand.includes(',')) {
        const brandArray = brand.split(',').filter(b => b && b.trim()).map(b => b.trim());
        return brandArray.length > 0 ? brandArray : undefined;
      }
      // 단일 브랜드인 경우
      const trimmedBrand = brand.trim();
      return trimmedBrand ? [trimmedBrand] : undefined;
    }
    
    return undefined;
  }

  /**
   * 정렬 순서 추출
   */
  private extractSortOrder(sortBy?: string): string {
    if (!sortBy) return "desc";

    if (sortBy.endsWith("_asc")) return "asc";
    if (sortBy.endsWith("_desc")) return "desc";

    return "desc"; // 기본값
  }

  /**
   * 정렬 필드 추출
   */
  private extractSortField(sortBy?: string): string {
    if (!sortBy) return "createdAt";

    // sortBy에서 _asc, _desc 제거하여 필드명만 추출
    const field = sortBy.replace(/_asc$|_desc$/, "");
    
    // created를 createdAt으로 변환
    if (field === "created") {
      return "createdAt";
    }

    return field;
  }

  /**
   * 캐시 키 생성
   */
  private buildCacheKey(params: any): string {
    const keyParts = [
      this.CACHE_KEY_PREFIX,
      `page:${params.page}`,
      `limit:${params.limit}`,
      `sort:${params.sortBy}`,
    ];

    // isActive 값을 캐시 키에 포함하여 일반 사용자용과 관리자용 캐시 분리
    if (params.isActive !== undefined) {
      keyParts.push(`isActive:${params.isActive}`);
    } else {
      keyParts.push(`isActive:all`); // 관리자용 (모든 상품)
    }

    if (params.categoryId) keyParts.push(`category:${params.categoryId}`);
    if (params.categoryName) keyParts.push(`categoryName:${params.categoryName}`);
    if (params.categoryNames) keyParts.push(`categoryNames:${params.categoryNames.join(',')}`);
    if (params.search) keyParts.push(`search:${params.search}`);
    if (params.brand) keyParts.push(`brand:${params.brand}`);
    if (params.minPrice) keyParts.push(`minPrice:${params.minPrice}`);
    if (params.maxPrice) keyParts.push(`maxPrice:${params.maxPrice}`);

    return keyParts.join(":");
  }

  /**
   * 상품 정보 보강 - 카테고리 및 재고 정보 추가
   * ✅ getSlug() 메서드 제거하고 대안 사용
   */
  private async enrichProductsWithDetails(products: Product[]): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      original_price: number;
      discountPrice?: number | undefined;
      discountPercentage: number;
      sku: string;
      brand: string;
      tags: string[];
      slug: string;
      is_active: boolean;
      category: {
        id: string;
        name: string;
        slug: string;
      };
      inventory: {
        availableQuantity: number;
        status: string;
      };
      createdAt: Date;
    }>
  > {
    // ✅ 수정: products가 배열인지 확인
    if (!products || !Array.isArray(products)) {
      return [];
    }

    // N+1 쿼리 문제 해결: 배치로 모든 관련 데이터 조회
    const productIds = products.map(p => p.getId());
    const categoryIds = [...new Set(products.map(p => p.getCategoryId()))];


    // 모든 카테고리와 재고 정보를 한 번에 조회
    const [categories, inventories] = await Promise.all([
      Promise.all(categoryIds.map(id => this.categoryRepository.findById(id))),
      Promise.all(productIds.map(id => this.inventoryRepository.findByProductId(id)))
    ]);

    // 빠른 조회를 위한 Map 생성
    const categoryMap = new Map();
    const inventoryMap = new Map();

    categories.forEach((category: any) => {
      if (category) {
        categoryMap.set(category.getId(), category);
      }
    });

    inventories.forEach((inventory: any) => {
      if (inventory) {
        inventoryMap.set(inventory.getProductId(), inventory);
      }
    });


    const enrichedProducts = [];

    for (const product of products) {
      try {
        // Map에서 빠르게 조회
        const category = categoryMap.get(product.getCategoryId());
        const inventory = inventoryMap.get(product.getId());

        // ✅ slug 생성 (getSlug 메서드 대신 직접 생성)
        const slug = this.generateSlug(product.getName());

        // 할인 가격 로직
        const originalPrice = product.getOriginalPrice();
        const currentPrice = product.getPrice();
        let finalPrice = currentPrice;
        let discountPrice = undefined;
        
        if (originalPrice !== undefined && originalPrice > currentPrice) {
          finalPrice = originalPrice; // 원래 가격을 표시
          discountPrice = currentPrice; // 할인된 가격
        }

        enrichedProducts.push({
          id: product.getId(),
          name: product.getName(),
          description: product.getDescription(),
          price: finalPrice,
          original_price: originalPrice, // ✅ 원가 필드 추가
          discountPrice: discountPrice,
          discountPercentage: product.getDiscountPercentage(), // 할인율 추가
          sku: product.getSku(),
          brand: product.getBrand(),
          tags: product.getTags(),
          slug: slug,
          is_active: product.isActive(), // is_active 필드 추가
          category: {
            id: category?.getId() || "",
            name: category?.getName() || "미분류",
            slug: category
              ? this.generateSlug(category.getName())
              : "uncategorized",
          },
          inventory: {
            availableQuantity: inventory?.getAvailableQuantity() || 0,
            status: this.determineInventoryStatus(inventory?.getAvailableQuantity() || 0),
          },
          createdAt: product.getCreatedAt(),
        });
      } catch (error) {
        console.error(`상품 ${product.getId()} 정보 보강 실패:`, error);
        // 오류가 발생한 상품도 기본 정보로 포함
        const originalPrice = product.getOriginalPrice();
        const currentPrice = product.getPrice();
        let finalPrice = currentPrice;
        let discountPrice = undefined;
        
        if (originalPrice !== undefined && originalPrice > currentPrice) {
          finalPrice = originalPrice;
          discountPrice = currentPrice;
        }
        
        enrichedProducts.push({
          id: product.getId(),
          name: product.getName(),
          description: product.getDescription(),
          price: finalPrice,
          original_price: originalPrice, // ✅ 원가 필드 추가
          discountPrice: discountPrice,
          discountPercentage: product.getDiscountPercentage(), // 할인율 추가
          sku: product.getSku(),
          brand: product.getBrand(),
          tags: product.getTags(),
          slug: this.generateSlug(product.getName()),
          is_active: product.isActive(), // is_active 필드 추가
          category: {
            id: "",
            name: "미분류",
            slug: "uncategorized",
          },
          inventory: {
            availableQuantity: 0,
            status: this.determineInventoryStatus(0),
          },
          createdAt: product.getCreatedAt(),
        });
      }
    }

    return enrichedProducts;
  }

  /**
   * Slug 생성 유틸리티 메서드
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "") // 특수문자 제거 (한글 유지)
      .replace(/\s+/g, "-") // 공백을 하이픈으로
      .replace(/-+/g, "-") // 연속된 하이픈 제거
      .trim()
      .replace(/^-|-$/g, ""); // 앞뒤 하이픈 제거
  }

  /**
   * 재고 수량에 따른 상태 결정
   * 요구사항: 1-20: 거의 품절, 0: 품절, >20: 재고 충분
   */
  private determineInventoryStatus(availableQuantity: number): string {
    if (availableQuantity === 0) {
      return "out_of_stock"; // 품절
    } else if (availableQuantity <= 20) {
      return "low_stock"; // 거의 품절
    } else {
      return "sufficient"; // 재고 충분
    }
  }

  /**
   * 최종 응답 데이터 구성
   * ✅ exactOptionalPropertyTypes 대응
   */
  private buildResponse(
    enrichedProducts: any[],
    total: number,
    normalizedParams: any,
    originalRequest: GetProductListRequest
  ): ProductListResponse {
    const totalPages = Math.ceil(total / normalizedParams.limit);
    const currentPage = normalizedParams.page;

    // ✅ undefined 값을 명시적으로 처리
    const filters: ProductListResponse["filters"] = {};

    if (originalRequest.categoryId)
      filters.appliedCategory = originalRequest.categoryId;
    if (originalRequest.search) filters.appliedSearch = originalRequest.search;
    if (normalizedParams.brand && normalizedParams.brand.length > 0) {
      filters.appliedBrand = normalizedParams.brand.length === 1 
        ? normalizedParams.brand[0] 
        : normalizedParams.brand;
    }
    if (originalRequest.sortBy) filters.appliedSortBy = originalRequest.sortBy;

    if (
      originalRequest.minPrice !== undefined ||
      originalRequest.maxPrice !== undefined
    ) {
      filters.appliedPriceRange = {};
      if (originalRequest.minPrice !== undefined)
        filters.appliedPriceRange.min = originalRequest.minPrice;
      if (originalRequest.maxPrice !== undefined)
        filters.appliedPriceRange.max = originalRequest.maxPrice;
    }

    return {
      products: enrichedProducts,
      pagination: {
        currentPage,
        totalPages,
        totalItems: total,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
      filters,
    };
  }
}
