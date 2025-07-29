// ========================================
// Get Product Stats UseCase - 비즈니스 로직 계층
// src/usecases/GetProductStatsUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductRepository, CategoryRepository } from "./types";

/**
 * 상품 통계 요청 데이터
 */
export interface GetProductStatsRequest {
  // 필요시 필터링 옵션 추가 가능
}

/**
 * 상품 통계 응답 데이터
 */
export interface GetProductStatsResponse {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalCategories: number;
  activeCategories: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
  }>;
}

/**
 * 상품 통계 조회 UseCase
 * 
 * 책임:
 * - 관리자 대시보드용 상품 통계 데이터 수집
 * - 상품 수량, 카테고리 수량 집계
 * - 재고 상태별 상품 수량 집계
 * - 카테고리별 상품 분포 집계
 */
@injectable()
export class GetProductStatsUseCase {
  constructor(
    @inject(TYPES.ProductRepository)
    private productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository)
    private categoryRepository: CategoryRepository
  ) {}

  /**
   * 상품 통계 조회 실행
   */
  async execute(request: GetProductStatsRequest): Promise<GetProductStatsResponse> {
    try {
      console.log('[GetProductStatsUseCase] 상품 통계 조회 시작');

      // 병렬로 통계 데이터 수집
      const [
        productStats,
        categoryStats,
        lowStockStats,
        topCategoriesStats
      ] = await Promise.all([
        this.getProductStats(),
        this.getCategoryStats(),
        this.getLowStockStats(),
        this.getTopCategoriesStats()
      ]);

      const response: GetProductStatsResponse = {
        ...productStats,
        ...categoryStats,
        ...lowStockStats,
        topCategories: topCategoriesStats,
      };

      console.log('[GetProductStatsUseCase] 상품 통계 조회 완료:', {
        totalProducts: response.totalProducts,
        totalCategories: response.totalCategories
      });

      return response;
    } catch (error) {
      console.error('[GetProductStatsUseCase] 상품 통계 조회 실패:', error);
      throw new Error(`상품 통계 조회에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 상품 기본 통계 수집
   */
  private async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
  }> {
    try {
      // Repository에 통계 메서드가 있는지 확인하고 사용
      // 없으면 기본 메서드로 대체
      const allProducts = await this.productRepository.findAll();
      
      const totalProducts = allProducts.length;
      const activeProducts = allProducts.filter(p => p.isActive()).length;
      const inactiveProducts = totalProducts - activeProducts;

      return {
        totalProducts,
        activeProducts,
        inactiveProducts,
      };
    } catch (error) {
      console.warn('[GetProductStatsUseCase] 상품 통계 수집 실패, 기본값 반환:', error);
      return {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
      };
    }
  }

  /**
   * 카테고리 기본 통계 수집
   */
  private async getCategoryStats(): Promise<{
    totalCategories: number;
    activeCategories: number;
  }> {
    try {
      const allCategories = await this.categoryRepository.findAll();
      
      const totalCategories = allCategories.length;
      const activeCategories = allCategories.filter(c => c.isActive()).length;

      return {
        totalCategories,
        activeCategories,
      };
    } catch (error) {
      console.warn('[GetProductStatsUseCase] 카테고리 통계 수집 실패, 기본값 반환:', error);
      return {
        totalCategories: 0,
        activeCategories: 0,
      };
    }
  }

  /**
   * 재고 부족 상품 통계 수집
   */
  private async getLowStockStats(): Promise<{
    lowStockProducts: number;
    outOfStockProducts: number;
  }> {
    try {
      const allProducts = await this.productRepository.findAll();
      
      let lowStockProducts = 0;
      let outOfStockProducts = 0;

      for (const product of allProducts) {
        if (!product.isActive()) continue;

        // TODO: 재고 정보는 Inventory 엔티티에서 가져와야 함
        // const stockQuantity = product.stockQuantity || 0;
        // const lowStockThreshold = product.lowStockThreshold || 5;

        // if (stockQuantity === 0) {
        //   outOfStockProducts++;
        // } else if (stockQuantity <= lowStockThreshold) {
        //   lowStockProducts++;
        // }
      }

      return {
        lowStockProducts,
        outOfStockProducts,
      };
    } catch (error) {
      console.warn('[GetProductStatsUseCase] 재고 통계 수집 실패, 기본값 반환:', error);
      return {
        lowStockProducts: 0,
        outOfStockProducts: 0,
      };
    }
  }

  /**
   * 인기 카테고리 통계 수집 (상품 수 기준 상위 5개)
   */
  private async getTopCategoriesStats(): Promise<Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
  }>> {
    try {
      const [allProducts, allCategories] = await Promise.all([
        this.productRepository.findAll(),
        this.categoryRepository.findMany({ isActive: true })
      ]);

      // 카테고리별 상품 수 집계
      const categoryProductCount = new Map<string, number>();
      
      for (const product of allProducts) {
        if (!product.isActive()) continue;
        
        const categoryId = product.getCategoryId();
        if (categoryId) {
          categoryProductCount.set(
            categoryId, 
            (categoryProductCount.get(categoryId) || 0) + 1
          );
        }
      }

      // 카테고리 이름 매핑
      const categoryNameMap = new Map<string, string>();
      for (const category of allCategories) {
        categoryNameMap.set(category.getId(), category.getName());
      }

      // 상품 수 기준 정렬 및 상위 5개 선택
      const topCategories = Array.from(categoryProductCount.entries())
        .map(([categoryId, productCount]) => ({
          categoryId,
          categoryName: categoryNameMap.get(categoryId) || '알 수 없는 카테고리',
          productCount,
        }))
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 5);

      return topCategories;
    } catch (error) {
      console.warn('[GetProductStatsUseCase] 인기 카테고리 통계 수집 실패, 빈 배열 반환:', error);
      return [];
    }
  }
}