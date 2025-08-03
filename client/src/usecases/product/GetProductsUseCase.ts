// GetProductsUseCase.ts - 상품 목록 조회 Use Case
// Clean Architecture: Use Cases Layer
// 위치: client/src/usecases/product/GetProductsUseCase.ts

import {
  IProductRepository,
  ProductFilter,
  ProductListResult,
} from '../../entities/product/IProductRepository';

export interface GetProductsRequest {
  search?: string;
  category?: string[];
  brand?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  rating?: number | null;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class GetProductsUseCase {
  constructor(private productRepository: IProductRepository) {}

  /**
   * 상품 목록을 조회합니다.
   */
  async execute(request: GetProductsRequest): Promise<ProductListResult> {
    try {
      // 입력 유효성 검사
      this.validateRequest(request);

      // 필터 객체 생성
      const filter: ProductFilter = {
        search: request.search?.trim(),
        category: request.category || [],
        brand: request.brand || [],
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
        rating: request.rating,
        tags: request.tags || [],
        sortBy: request.sortBy || 'created_desc',
        sortOrder: request.sortOrder || 'desc',
        page: request.page || 1,
        limit: request.limit || 20,
        isActive: true, // 일반 사용자는 활성 상품만 조회
      };

      // 레포지토리를 통해 상품 목록 조회
      const result = await this.productRepository.findByFilter(filter);

      // 비즈니스 로직 적용 (필요시)
      return this.applyBusinessLogic(result);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : '상품 목록을 불러오는 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 요청 데이터의 유효성을 검사합니다.
   */
  private validateRequest(request: GetProductsRequest): void {
    // 페이지 번호 유효성 검사
    if (request.page && (request.page < 1 || request.page > 10000)) {
      throw new Error('페이지 번호는 1 이상 10000 이하여야 합니다.');
    }

    // 페이지 크기 유효성 검사
    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      throw new Error('페이지 크기는 1 이상 100 이하여야 합니다.');
    }

    // 가격 범위 유효성 검사
    if (request.minPrice && request.minPrice < 0) {
      throw new Error('최소 가격은 0 이상이어야 합니다.');
    }

    if (request.maxPrice && request.maxPrice < 0) {
      throw new Error('최대 가격은 0 이상이어야 합니다.');
    }

    if (
      request.minPrice &&
      request.maxPrice &&
      request.minPrice > request.maxPrice
    ) {
      throw new Error('최소 가격은 최대 가격보다 작거나 같아야 합니다.');
    }

    // 평점 유효성 검사
    if (request.rating && (request.rating < 0 || request.rating > 5)) {
      throw new Error('평점은 0 이상 5 이하여야 합니다.');
    }

    // 검색어 길이 유효성 검사
    if (request.search && request.search.trim().length > 100) {
      throw new Error('검색어는 100자 이하여야 합니다.');
    }
  }

  /**
   * 비즈니스 로직을 적용합니다.
   */
  private applyBusinessLogic(result: ProductListResult): ProductListResult {
    // 추가적인 비즈니스 로직이 필요한 경우 여기에 구현
    // 예: 특정 조건에 따른 상품 필터링, 정렬 등

    return result;
  }
}
