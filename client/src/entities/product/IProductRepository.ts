// IProductRepository.ts - Product Repository Interface
// Clean Architecture: Entities Layer
// 위치: client/src/entities/product/IProductRepository.ts

import { Product } from './Product';

export interface ProductFilter {
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
  isActive?: boolean;
}

export interface ProductListResult {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: {
    appliedBrand?: string;
    appliedCategory?: string;
    appliedPriceRange?: {
      min: number;
      max: number;
    };
    appliedSearch?: string;
    appliedSort?: string;
  };
}

export interface IProductRepository {
  /**
   * 필터 조건에 따라 상품 목록을 조회합니다.
   */
  findByFilter(filter: ProductFilter): Promise<ProductListResult>;

  /**
   * 상품 ID로 상품 상세 정보를 조회합니다.
   */
  findById(id: string): Promise<Product>;

  /**
   * 검색어로 상품을 검색합니다.
   */
  search(
    query: string,
    page?: number,
    limit?: number
  ): Promise<ProductListResult>;

  /**
   * 관리자용 상품 목록을 조회합니다. (활성/비활성 상품 모두 포함)
   */
  findByFilterAdmin(filter: ProductFilter): Promise<ProductListResult>;
}
