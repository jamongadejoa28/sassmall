// ProductApiRepository.ts - Product API Repository Implementation
// Clean Architecture: Adapters Layer
// 위치: client/src/adapters/repositories/ProductApiRepository.ts

import {
  IProductRepository,
  ProductFilter,
  ProductListResult,
} from '../../entities/product/IProductRepository';
import { Product } from '../../entities/product/Product';

export class ProductApiRepository implements IProductRepository {
  private readonly baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api/v1') {
    this.baseURL = baseURL;
  }

  /**
   * 필터 조건에 따라 상품 목록을 조회합니다.
   */
  async findByFilter(filter: ProductFilter): Promise<ProductListResult> {
    try {
      const queryString = this.buildApiQuery(filter);
      const response = await fetch(`${this.baseURL}/products?${queryString}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '상품 목록을 불러오는데 실패했습니다.');
      }

      return {
        products: data.data.products.map((item: any) =>
          Product.fromApiResponse(item)
        ),
        pagination: data.data.pagination,
        filters: data.data.filters,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : '상품 목록을 불러오는 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 상품 ID로 상품 상세 정보를 조회합니다.
   */
  async findById(id: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseURL}/products/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '상품 정보를 불러오는데 실패했습니다.');
      }

      return Product.fromApiResponse(data.data);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : '상품 정보를 불러오는 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 검색어로 상품을 검색합니다.
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResult> {
    const filter: ProductFilter = {
      search: query,
      page,
      limit,
    };

    return this.findByFilter(filter);
  }

  /**
   * 관리자용 상품 목록을 조회합니다. (활성/비활성 상품 모두 포함)
   */
  async findByFilterAdmin(filter: ProductFilter): Promise<ProductListResult> {
    try {
      const queryString = this.buildApiQuery(filter);
      const authToken = this.getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${this.baseURL}/products/admin?${queryString}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || '관리자 상품 목록을 불러오는데 실패했습니다.'
        );
      }

      return {
        products: data.data.products.map((item: any) =>
          Product.fromApiResponse(item)
        ),
        pagination: data.data.pagination,
        filters: data.data.filters,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : '관리자 상품 목록을 불러오는 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * API 호출용 쿼리 파라미터를 생성합니다.
   */
  private buildApiQuery(filter: ProductFilter): string {
    const params = new URLSearchParams();

    // 페이징
    params.set('page', (filter.page || 1).toString());
    params.set('limit', (filter.limit || 20).toString());

    // 검색어
    if (filter.search?.trim()) {
      params.set('search', filter.search.trim());
    }

    // 카테고리 (다중 선택 지원)
    if (filter.category && filter.category.length > 0) {
      params.set('category', filter.category.join(','));
    }

    // 브랜드 (다중 선택 지원)
    if (filter.brand && filter.brand.length > 0) {
      params.set('brand', filter.brand.join(','));
    }

    // 가격 범위
    if (
      filter.minPrice !== null &&
      filter.minPrice !== undefined &&
      filter.minPrice >= 0
    ) {
      params.set('minPrice', Math.floor(filter.minPrice).toString());
    }

    if (
      filter.maxPrice !== null &&
      filter.maxPrice !== undefined &&
      filter.maxPrice >= 0
    ) {
      params.set('maxPrice', Math.floor(filter.maxPrice).toString());
    }

    // 평점
    if (filter.rating !== null && filter.rating !== undefined) {
      params.set('minRating', filter.rating.toString());
    }

    // 정렬
    if (filter.sortBy) {
      params.set('sortBy', filter.sortBy);
    }

    if (filter.sortOrder) {
      params.set('sortOrder', filter.sortOrder);
    }

    // 활성 상태 (일반 사용자는 항상 활성 상품만)
    if (filter.isActive !== undefined) {
      params.set('isActive', filter.isActive.toString());
    } else {
      // 기본적으로 활성 상품만 조회
      params.set('isActive', 'true');
    }

    return params.toString();
  }

  /**
   * 로컬 스토리지에서 인증 토큰을 가져옵니다.
   */
  private getAuthToken(): string | null {
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.accessToken || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
