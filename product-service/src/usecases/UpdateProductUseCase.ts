// ========================================
// Update Product UseCase - 비즈니스 로직 계층  
// src/usecases/UpdateProductUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductRepository, CategoryRepository, CacheService } from "./types";
import { Product } from "../entities/Product";

/**
 * 상품 수정 요청 데이터
 */
export interface UpdateProductRequest {
  productId: string;
  name?: string;
  description?: string;
  price?: string;
  discountPercent?: number;
  sku?: string;
  brand?: string;
  categoryId?: string;
  tags?: string[];
  isActive?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  dimensions?: {
    weight?: number;
    width?: number;
    height?: number;
    depth?: number;
  };
  images?: string[];
}

/**
 * 상품 수정 응답 데이터
 */
export interface UpdateProductResponse {
  product: Product;
}

/**
 * 상품 수정 UseCase
 * 
 * 책임:
 * - 기존 상품 정보 수정 비즈니스 로직 처리
 * - 상품 존재 여부 검증
 * - SKU 중복 검증 (변경 시)
 * - 카테고리 유효성 검증 (변경 시)
 * - 부분 업데이트 지원
 */
@injectable()
export class UpdateProductUseCase {
  constructor(
    @inject(TYPES.ProductRepository)
    private productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository)
    private categoryRepository: CategoryRepository,
    @inject(TYPES.CacheService)
    private readonly cacheService: CacheService
  ) {}

  /**
   * 상품 수정 실행
   */
  async execute(request: UpdateProductRequest): Promise<UpdateProductResponse> {
    try {
      console.log('[UpdateProductUseCase] 상품 수정 시작:', request.productId);

      // 상품 ID 유효성 검증
      if (!request.productId || request.productId.trim() === '') {
        throw new Error('상품 ID가 제공되지 않았습니다');
      }

      // 기존 상품 조회
      const existingProduct = await this.productRepository.findById(request.productId);
      if (!existingProduct) {
        throw new Error('수정할 상품을 찾을 수 없습니다');
      }

      // 입력 데이터 검증
      await this.validateRequest(request);

      // SKU 변경 시 중복 검증  
      if (request.sku !== undefined && request.sku !== existingProduct.getSku()) {
        await this.validateUniqueSku(request.sku, request.productId);
      }

      // 카테고리 변경 시 유효성 검증
      if (request.categoryId !== undefined && request.categoryId !== existingProduct.getCategoryId()) {
        await this.validateCategory(request.categoryId);
      }

      // 도메인 객체에 변경 사항 적용
      const updateData: any = {};
      let hasChanges = false;
      
      if (request.name !== undefined) {
        updateData.name = request.name.trim();
        hasChanges = true;
      }
      if (request.description !== undefined) {
        updateData.description = request.description.trim();
        hasChanges = true;
      }
      if (request.price !== undefined) {
        // 프론트엔드에서 받은 price는 실제로는 originalPrice (원가)
        updateData.originalPrice = parseFloat(request.price);
        hasChanges = true;
      }
      if (request.discountPercent !== undefined) {
        updateData.discountPercentage = request.discountPercent;
        hasChanges = true;
      }
      if (request.brand !== undefined) {
        updateData.brand = request.brand.trim();
        hasChanges = true;
      }
      if (request.dimensions?.weight !== undefined) {
        updateData.weight = request.dimensions.weight;
        hasChanges = true;
      }
      if (request.dimensions !== undefined) {
        updateData.dimensions = request.dimensions;
        hasChanges = true;
      }
      if (request.tags !== undefined) {
        updateData.tags = request.tags;
        hasChanges = true;
      }
      
      if (hasChanges) {
        existingProduct.updateDetails(updateData);
      }

      // 활성 상태 변경
      if (request.isActive !== undefined) {
        if (request.isActive) {
          existingProduct.activate();
        } else {
          existingProduct.deactivate();
        }
      }

      // 변경사항이 없으면 기존 상품 반환
      if (!hasChanges && request.isActive === undefined) {
        console.log('[UpdateProductUseCase] 변경사항이 없어 기존 상품 반환');
        return { product: existingProduct };
      }

      // Repository를 통해 상품 수정
      const updatedProduct = await this.productRepository.update(existingProduct);

      // 캐시 무효화
      await this.invalidateRelatedCaches();

      console.log('[UpdateProductUseCase] 상품 수정 완료:', updatedProduct.getId());

      return {
        product: updatedProduct,
      };
    } catch (error) {
      console.error('[UpdateProductUseCase] 상품 수정 실패:', error);
      throw error; // 에러를 그대로 전파하여 Controller에서 적절한 HTTP 상태 코드 설정
    }
  }

  /**
   * 캐시 무효화
   */
  private async invalidateRelatedCaches(): Promise<void> {
    try {
      // 모든 product_list 관련 캐시를 패턴으로 무효화
      await this.cacheService.invalidatePattern('product_list:*');
      console.log('[UpdateProductUseCase] 상품 목록 캐시 패턴 무효화 완료');
    } catch (error) {
      // 캐시 무효화 실패는 로그만 남기고 무시 (비즈니스 로직에 영향 X)
      console.error('[UpdateProductUseCase] 캐시 무효화 실패:', error);
    }
  }

  /**
   * 요청 데이터 유효성 검증
   */
  private async validateRequest(request: UpdateProductRequest): Promise<void> {
    if (request.name !== undefined) {
      if (request.name.trim() === '') {
        throw new Error('상품명은 공백일 수 없습니다');
      }

      if (request.name.trim().length < 2) {
        throw new Error('상품명은 최소 2자 이상이어야 합니다');
      }

      if (request.name.trim().length > 200) {
        throw new Error('상품명은 최대 200자까지 입력 가능합니다');
      }
    }

    if (request.description !== undefined && request.description.length > 2000) {
      throw new Error('상품 설명은 최대 2000자까지 입력 가능합니다');
    }

    if (request.price !== undefined) {
      const priceNum = parseFloat(request.price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error('가격은 0 이상의 숫자여야 합니다');
      }
    }

    if (request.discountPercent !== undefined) {
      if (request.discountPercent < 0 || request.discountPercent > 100) {
        throw new Error('할인율은 0부터 100 사이의 값이어야 합니다');
      }
    }

    if (request.sku !== undefined) {
      if (request.sku.trim() === '') {
        throw new Error('SKU는 공백일 수 없습니다');
      }

      if (request.sku.trim().length < 2) {
        throw new Error('SKU는 최소 2자 이상이어야 합니다');
      }

      if (request.sku.trim().length > 50) {
        throw new Error('SKU는 최대 50자까지 입력 가능합니다');
      }
    }

    if (request.stockQuantity !== undefined && request.stockQuantity < 0) {
      throw new Error('재고 수량은 0 이상이어야 합니다');
    }

    if (request.lowStockThreshold !== undefined && request.lowStockThreshold < 0) {
      throw new Error('최소 재고 임계값은 0 이상이어야 합니다');
    }

    if (request.dimensions !== undefined) {
      const { weight, width, height, depth } = request.dimensions;
      
      if (weight !== undefined && weight < 0) {
        throw new Error('무게는 0 이상이어야 합니다');
      }
      
      if (width !== undefined && width < 0) {
        throw new Error('가로는 0 이상이어야 합니다');
      }
      
      if (height !== undefined && height < 0) {
        throw new Error('세로는 0 이상이어야 합니다');
      }
      
      if (depth !== undefined && depth < 0) {
        throw new Error('깊이는 0 이상이어야 합니다');
      }
    }
  }

  /**
   * SKU 중복 검증 (자기 자신 제외)
   */
  private async validateUniqueSku(sku: string, excludeProductId: string): Promise<void> {
    const existingProduct = await this.productRepository.findBySku(sku.trim());
    if (existingProduct && existingProduct.getId() !== excludeProductId) {
      throw new Error('이미 존재하는 SKU입니다');
    }
  }

  /**
   * 카테고리 유효성 검증
   */
  private async validateCategory(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error('존재하지 않는 카테고리입니다');
    }

    if (!category.isActive()) {
      throw new Error('비활성화된 카테고리입니다');
    }
  }
}