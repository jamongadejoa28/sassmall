// ========================================
// Update Product UseCase - 비즈니스 로직 계층  
// src/usecases/UpdateProductUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductRepository, CategoryRepository, InventoryRepository, CacheService, UpdateProductRequest } from "./types";
import { Product } from "../entities/Product";

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
    @inject(TYPES.InventoryRepository)
    private inventoryRepository: InventoryRepository,
    @inject(TYPES.CacheService)
    private readonly cacheService: CacheService
  ) {}

  /**
   * 상품 수정 실행
   */
  async execute(request: UpdateProductRequest): Promise<UpdateProductResponse> {
    try {
      console.log('[UpdateProductUseCase] 상품 수정 시작:', {
        productId: request.productId,
        stockQuantity: request.stockQuantity,
        hasStockQuantity: request.stockQuantity !== undefined,
        requestKeys: Object.keys(request)
      });

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
        if (typeof request.price === 'number' && request.price > 0) {
          updateData.originalPrice = request.price;
          hasChanges = true;
        } else if (typeof request.price === 'string') {
          // FormData에서 string으로 올 수 있음
          const priceValue = parseFloat(request.price);
          if (!isNaN(priceValue) && priceValue > 0) {
            updateData.originalPrice = priceValue;
            hasChanges = true;
          } else {
            throw new Error('가격은 유효한 양수여야 합니다');
          }
        } else {
          throw new Error('가격은 유효한 양수여야 합니다');
        }
      }
      if (request.discountPercent !== undefined && request.discountPercent !== null) {
        // 빈 문자열이나 유효하지 않은 값인 경우는 0으로 처리
        const discountPercent = typeof request.discountPercent === 'string' 
          ? parseFloat(request.discountPercent) 
          : request.discountPercent;
        
        if (!isNaN(discountPercent) && discountPercent >= 0 && discountPercent <= 100) {
          updateData.discountPercentage = discountPercent;
          hasChanges = true;
        }
      }
      if (request.brand !== undefined) {
        updateData.brand = request.brand.trim();
        hasChanges = true;
      }
      if (request.weight !== undefined) {
        updateData.weight = request.weight;
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
      if (request.imageUrls !== undefined) {
        updateData.imageUrls = request.imageUrls;
        hasChanges = true;
      }
      if (request.thumbnailUrl !== undefined) {
        updateData.thumbnailUrl = request.thumbnailUrl;
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

      // 변경사항이 없으면 기존 상품 반환 (재고 수량 업데이트는 별도 처리)
      if (!hasChanges && request.isActive === undefined && request.stockQuantity === undefined) {
        console.log('[UpdateProductUseCase] 변경사항이 없어 기존 상품 반환');
        return { product: existingProduct };
      }

      // Repository를 통해 상품 수정
      const updatedProduct = await this.productRepository.update(existingProduct);

      // 재고 수량 업데이트 (stockQuantity가 제공되고 null이 아닌 경우)
      if (request.stockQuantity !== undefined && request.stockQuantity !== null) {
        // 빈 문자열이나 유효하지 않은 값인 경우는 업데이트하지 않음
        const stockQuantity = typeof request.stockQuantity === 'string' 
          ? parseInt(request.stockQuantity, 10) 
          : request.stockQuantity;
        
        if (!isNaN(stockQuantity) && stockQuantity >= 0) {
          await this.updateInventoryQuantity(request.productId, stockQuantity);
        }
      }

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
      if (typeof request.price === 'number') {
        if (request.price < 0) {
          throw new Error('가격은 0 이상의 숫자여야 합니다');
        }
      } else if (typeof request.price === 'string') {
        const priceNum = parseFloat(request.price);
        if (isNaN(priceNum) || priceNum < 0) {
          throw new Error('가격은 0 이상의 숫자여야 합니다');
        }
      } else {
        throw new Error('가격은 숫자여야 합니다');
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

    if (request.weight !== undefined && request.weight < 0) {
      throw new Error('무게는 0 이상이어야 합니다');
    }

    if (request.dimensions !== undefined) {
      const { width, height, depth } = request.dimensions;
      
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

  /**
   * 재고 수량 업데이트
   */
  private async updateInventoryQuantity(productId: string, newQuantity: number): Promise<void> {
    try {
      console.log('[UpdateProductUseCase] 재고 수량 업데이트 시작:', productId, newQuantity);

      // 기존 재고 조회
      const existingInventory = await this.inventoryRepository.findByProductId(productId);
      if (!existingInventory) {
        throw new Error('해당 상품의 재고 정보를 찾을 수 없습니다');
      }

      // 현재 재고량과 새 재고량 차이 계산
      const currentQuantity = existingInventory.getQuantity();
      const quantityDifference = newQuantity - currentQuantity;

      if (quantityDifference !== 0) {
        if (quantityDifference > 0) {
          // 재고 증가 (입고)
          existingInventory.restock(quantityDifference, '관리자 재고 수정');
          console.log('[UpdateProductUseCase] 재고 입고:', quantityDifference);
        } else {
          // 재고 감소 (출고)
          const decreaseAmount = Math.abs(quantityDifference);
          existingInventory.reduce(decreaseAmount, '관리자 재고 수정');
          console.log('[UpdateProductUseCase] 재고 출고:', decreaseAmount);
        }

        // 업데이트된 재고 저장
        await this.inventoryRepository.save(existingInventory);
        console.log('[UpdateProductUseCase] 재고 수량 업데이트 완료');
      } else {
        console.log('[UpdateProductUseCase] 재고 수량 변경 없음');
      }
    } catch (error) {
      console.error('[UpdateProductUseCase] 재고 수량 업데이트 실패:', error);
      throw error;
    }
  }
}