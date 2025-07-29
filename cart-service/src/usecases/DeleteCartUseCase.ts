// ========================================
// DeleteCartUseCase - 장바구니 완전 삭제
// cart-service/src/usecases/DeleteCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  DeleteCartRequest,
  DeleteCartResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

/**
 * DeleteCartUseCase - 장바구니와 관련된 모든 데이터를 완전히 삭제
 * 
 * 기능:
 * 1. 장바구니와 모든 cart items 삭제
 * 2. 관련 캐시 데이터 삭제  
 * 3. 클라이언트 재시작 시 이전 세션 정리용
 */
@injectable()
export class DeleteCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(request: DeleteCartRequest): Promise<DeleteCartResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    try {
      let cart = null;

      // 1. 장바구니 조회
      if (request.userId) {
        cart = await this.cartRepository.findByUserId(request.userId);
      } else if (request.sessionId) {
        cart = await this.cartRepository.findBySessionId(request.sessionId);
      }

      if (!cart) {
        console.log(`[DeleteCartUseCase] 삭제할 장바구니가 없음: userId=${request.userId}, sessionId=${request.sessionId}`);
        // 장바구니가 없어도 성공으로 처리 (이미 삭제된 상태)
        return {
          success: true,
          message: "장바구니가 이미 삭제되었거나 존재하지 않습니다.",
        };
      }

      const cartId = cart.getId();
      console.log(`[DeleteCartUseCase] 장바구니 삭제 시작: cartId=${cartId}, items=${cart.getItems().length}개`);

      // 2. 장바구니 완전 삭제 (cart_items도 함께 삭제됨)
      await this.cartRepository.deleteCart(cartId);

      // 3. 모든 관련 캐시 삭제
      await this.clearAllRelatedCache(cartId, request.userId, request.sessionId);

      console.log(`[DeleteCartUseCase] 장바구니 삭제 완료: cartId=${cartId}`);

      return {
        success: true,
        message: "장바구니가 완전히 삭제되었습니다.",
      };
    } catch (error) {
      // 비즈니스 로직 에러는 그대로 전파
      if (
        error instanceof InvalidRequestError ||
        error instanceof CartNotFoundError
      ) {
        throw error;
      }

      // 타입 안전한 에러 처리
      const errorMessage = this.getErrorMessage(error);
      console.error(`[DeleteCartUseCase] 장바구니 삭제 오류: ${errorMessage}`);
      throw new Error(
        `장바구니 삭제 중 오류가 발생했습니다: ${errorMessage}`
      );
    }
  }

  /**
   * 모든 관련 캐시 삭제
   */
  private async clearAllRelatedCache(
    cartId: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const cacheKeysToDelete = [
        `cart:${cartId}`,
      ];

      // 사용자/세션 매핑도 삭제
      if (userId) {
        cacheKeysToDelete.push(`user:${userId}`);
      }
      if (sessionId) {
        cacheKeysToDelete.push(`session:${sessionId}`);
      }

      // 배치로 캐시 삭제
      await Promise.all(
        cacheKeysToDelete.map(key => 
          this.cacheService.delete(key).catch(error => 
            console.warn(`[DeleteCartUseCase] 캐시 삭제 실패: ${key} - ${error}`)
          )
        )
      );

      console.log(`[DeleteCartUseCase] 캐시 삭제 완료: ${cacheKeysToDelete.join(', ')}`);
    } catch (error) {
      console.error("[DeleteCartUseCase] 캐시 삭제 오류:", error);
      // 캐시 오류는 무시 (graceful degradation)
    }
  }

  // 타입 안전한 에러 메시지 추출
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "알 수 없는 오류가 발생했습니다";
  }
}