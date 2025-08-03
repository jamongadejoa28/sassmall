// SearchProductsUseCase.ts - 상품 검색 Use Case
// Clean Architecture: Use Cases Layer
// 위치: client/src/usecases/product/SearchProductsUseCase.ts

import {
  IProductRepository,
  ProductListResult,
} from '../../entities/product/IProductRepository';

export interface SearchProductsRequest {
  query: string;
  page?: number;
  limit?: number;
}

export class SearchProductsUseCase {
  constructor(private productRepository: IProductRepository) {}

  /**
   * 상품을 검색합니다.
   */
  async execute(request: SearchProductsRequest): Promise<ProductListResult> {
    try {
      // 입력 유효성 검사
      this.validateRequest(request);

      // 검색어 전처리
      const processedQuery = this.preprocessQuery(request.query);

      // 레포지토리를 통해 상품 검색
      const result = await this.productRepository.search(
        processedQuery,
        request.page || 1,
        request.limit || 20
      );

      // 비즈니스 로직 적용
      return this.applyBusinessLogic(result, processedQuery);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : '상품 검색 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 요청 데이터의 유효성을 검사합니다.
   */
  private validateRequest(request: SearchProductsRequest): void {
    if (!request.query) {
      throw new Error('검색어가 필요합니다.');
    }

    if (typeof request.query !== 'string') {
      throw new Error('검색어는 문자열이어야 합니다.');
    }

    if (request.query.trim().length === 0) {
      throw new Error('검색어는 빈 문자열일 수 없습니다.');
    }

    if (request.query.trim().length < 2) {
      throw new Error('검색어는 최소 2글자 이상이어야 합니다.');
    }

    if (request.query.trim().length > 100) {
      throw new Error('검색어는 100자 이하여야 합니다.');
    }

    // 페이지 번호 유효성 검사
    if (request.page && (request.page < 1 || request.page > 10000)) {
      throw new Error('페이지 번호는 1 이상 10000 이하여야 합니다.');
    }

    // 페이지 크기 유효성 검사
    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      throw new Error('페이지 크기는 1 이상 100 이하여야 합니다.');
    }
  }

  /**
   * 검색어를 전처리합니다.
   */
  private preprocessQuery(query: string): string {
    // 공백 제거 및 소문자 변환
    let processed = query.trim().toLowerCase();

    // 연속된 공백을 하나로 변환
    processed = processed.replace(/\s+/g, ' ');

    // 특수문자 처리 (필요에 따라 추가)
    // processed = processed.replace(/[^\w\s가-힣]/gi, '');

    return processed;
  }

  /**
   * 비즈니스 로직을 적용합니다.
   */
  private applyBusinessLogic(
    result: ProductListResult,
    query: string
  ): ProductListResult {
    // 검색어 기록 (필요시 구현)
    this.recordSearchQuery(query);

    // 추가적인 비즈니스 로직이 필요한 경우 여기에 구현
    // 예: 인기 검색어 업데이트, 추천 상품 추가 등

    return result;
  }

  /**
   * 검색어를 기록합니다 (선택적 기능).
   */
  private recordSearchQuery(query: string): void {
    // 검색어 분석이나 추천을 위한 로깅
    // 실제 구현에서는 별도의 analytics service로 분리하는 것이 좋음
    try {
      const searchHistory = localStorage.getItem('searchHistory');
      const history = searchHistory ? JSON.parse(searchHistory) : [];

      // 최근 검색어 10개만 유지
      const updatedHistory = [
        query,
        ...history.filter((item: string) => item !== query),
      ].slice(0, 10);

      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    } catch {
      // 로컬 스토리지 저장 실패 시 무시
    }
  }
}
