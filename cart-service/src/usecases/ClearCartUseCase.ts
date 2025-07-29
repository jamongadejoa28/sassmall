// ========================================
// ClearCartUseCase - 수정됨 (cart 객체 반환으로 API 일관성 통일)
// cart-service/src/usecases/ClearCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  ClearCartRequest,
  ClearCartResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class ClearCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(request: ClearCartRequest): Promise<ClearCartResponse> {
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
        throw new CartNotFoundError();
      }

      // 2. 장바구니 비우기 - 이제 DB에서도 완전 삭제
      await this.cartRepository.delete(cart.getId());
      
      // 3. 캐시에서도 완전 삭제
      await this.clearCache(request.userId, request.sessionId, cart.getId());

      // 4. 빈 장바구니 응답 반환
      return {
        success: true,
        cart: null, // 삭제되었으므로 null 반환
        message: "장바구니가 완전히 비워졌습니다.",
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
      throw new Error(
        `장바구니 비우기 중 오류가 발생했습니다: ${errorMessage}`
      );
    }
  }

  /**
   * 캐시 완전 삭제 (장바구니 전체 비우기)
   */
  private async clearCache(
    userId?: string,
    sessionId?: string,
    cartId?: string
  ): Promise<void> {
    try {
      // 장바구니 데이터 캐시 삭제
      if (cartId) {
        await this.cacheService.delete(`cart:${cartId}`);
      }

      // 사용자/세션 매핑 캐시 삭제
      if (userId) {
        await this.cacheService.delete(`user:${userId}`);
      }
      if (sessionId) {
        await this.cacheService.delete(`session:${sessionId}`);
      }
    } catch (error) {
      console.error("[ClearCartUseCase] 캐시 삭제 오류:", error);
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
