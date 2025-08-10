// ========================================
// ToggleProductStatusUseCase - 상품 활성화/비활성화 토글
// src/usecases/ToggleProductStatusUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductRepository, CacheService } from "./types";
import { Result } from "../shared/types/Result";
import { DomainError } from "../shared/errors/DomainError";

/**
 * 상품 상태 토글 요청 데이터
 */
export interface ToggleProductStatusRequest {
  productId: string;
  isActive: boolean;
}

/**
 * 상품 상태 토글 응답 데이터
 */
export interface ToggleProductStatusResponse {
  success: boolean;
  productId: string;
  isActive: boolean;
  message: string;
}

/**
 * 상품 활성화/비활성화 토글 UseCase
 * 
 * 책임:
 * - 상품의 활성화/비활성화 상태 변경
 * - 상품 존재 여부 확인
 * - 상태 변경 비즈니스 로직 처리
 */
@injectable()
export class ToggleProductStatusUseCase {
  constructor(
    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository,
    @inject(TYPES.CacheService)
    private readonly cacheService: CacheService
  ) {}

  /**
   * 상품 상태 토글 실행
   */
  async execute(request: ToggleProductStatusRequest): Promise<Result<ToggleProductStatusResponse>> {
    try {
      console.log('[ToggleProductStatusUseCase] 상품 상태 토글 시작:', request);

      // 상품 ID 유효성 검증
      if (!request.productId || request.productId.trim() === '') {
        return Result.fail('상품 ID가 제공되지 않았습니다');
      }

      // 상품 존재 여부 확인
      const existingProduct = await this.productRepository.findById(request.productId);
      if (!existingProduct) {
        return Result.fail('상품을 찾을 수 없습니다');
      }

      // 현재 상태와 요청된 상태가 같은지 확인
      if (existingProduct.isActive() === request.isActive) {
        const currentStatus = request.isActive ? '활성' : '비활성';
        return Result.ok({
          success: true,
          productId: request.productId,
          isActive: request.isActive,
          message: `상품이 이미 ${currentStatus} 상태입니다`,
        });
      }

      // 상태 변경
      if (request.isActive) {
        existingProduct.activate();
      } else {
        existingProduct.deactivate();
      }

      // 변경된 상품 저장
      await this.productRepository.save(existingProduct);

      // 캐시 무효화
      await this.invalidateRelatedCaches();

      const newStatus = request.isActive ? '활성화' : '비활성화';
      console.log(`[ToggleProductStatusUseCase] 상품 ${newStatus} 완료:`, request.productId);

      return Result.ok({
        success: true,
        productId: request.productId,
        isActive: request.isActive,
        message: `상품이 성공적으로 ${newStatus}되었습니다`,
      });

    } catch (error) {
      console.error('[ToggleProductStatusUseCase] 상품 상태 토글 실패:', error);
      
      if (error instanceof DomainError) {
        return Result.fail(error.message);
      }

      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      return Result.fail(
        `상품 상태 변경 중 오류가 발생했습니다: ${errorMessage}`
      );
    }
  }

  /**
   * 캐시 무효화
   */
  private async invalidateRelatedCaches(): Promise<void> {
    try {
      // 모든 product_list 관련 캐시를 패턴으로 무효화
      await this.cacheService.invalidatePattern('product_list:*');
      console.log('[ToggleProductStatusUseCase] 상품 목록 캐시 패턴 무효화 완료');
    } catch (error) {
      // 캐시 무효화 실패는 로그만 남기고 무시 (비즈니스 로직에 영향 X)
      console.error('[ToggleProductStatusUseCase] 캐시 무효화 실패:', error);
    }
  }
}