// ========================================
// CleanupSessionCartUseCase - 세션 종료 시 카트 완전 삭제
// cart-service/src/usecases/CleanupSessionCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  CartRepository,
  CacheService,
  InvalidRequestError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

export interface CleanupSessionCartRequest {
  sessionId: string;
}

export interface CleanupSessionCartResponse {
  success: boolean;
  message: string;
  deletedCartId?: string;
}

@injectable()
export class CleanupSessionCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(request: CleanupSessionCartRequest): Promise<CleanupSessionCartResponse> {
    if (!request.sessionId) {
      throw new InvalidRequestError("세션 ID가 필요합니다");
    }

    try {
      console.log(`[CleanupSessionCartUseCase] Cleaning up session: ${request.sessionId}`);

      // 1. 세션에 연결된 장바구니 조회
      const cart = await this.cartRepository.findBySessionId(request.sessionId);

      if (!cart) {
        console.log(`[CleanupSessionCartUseCase] No cart found for session: ${request.sessionId}`);
        return {
          success: true,
          message: "정리할 장바구니가 없습니다.",
        };
      }

      const cartId = cart.getId();
      console.log(`[CleanupSessionCartUseCase] Found cart ${cartId} for session ${request.sessionId}`);

      // 2. 장바구니 완전 삭제 (CASCADE DELETE로 cart_items도 함께 삭제됨)
      await this.cartRepository.delete(cartId);
      console.log(`[CleanupSessionCartUseCase] Deleted cart ${cartId} from database`);

      // 3. 캐시에서도 삭제
      await this.cleanupCache(cartId, request.sessionId);

      return {
        success: true,
        message: "세션 장바구니가 정리되었습니다.",
        deletedCartId: cartId,
      };
    } catch (error) {
      if (error instanceof InvalidRequestError) {
        throw error;
      }

      const errorMessage = this.getErrorMessage(error);
      console.error(`[CleanupSessionCartUseCase] Error cleaning up session ${request.sessionId}:`, errorMessage);
      throw new Error(`세션 장바구니 정리 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  /**
   * 관련된 모든 캐시 삭제
   */
  private async cleanupCache(cartId: string, sessionId: string): Promise<void> {
    try {
      // 장바구니 캐시 삭제
      await this.cacheService.delete(`cart:${cartId}`);
      console.log(`[CleanupSessionCartUseCase] Deleted cache for cart:${cartId}`);

      // 세션 매핑 캐시 삭제
      await this.cacheService.delete(`session:${sessionId}`);
      console.log(`[CleanupSessionCartUseCase] Deleted cache for session:${sessionId}`);
    } catch (error) {
      console.error("[CleanupSessionCartUseCase] 캐시 정리 오류:", error);
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