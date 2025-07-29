// ========================================
// UpdateCartItemUseCase - 새로운 CacheService 구조 적용
// cart-service/src/usecases/UpdateCartItemUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  UpdateCartItemRequest,
  UpdateCartItemResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class UpdateCartItemUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(
    request: UpdateCartItemRequest
  ): Promise<UpdateCartItemResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    if (request.quantity < 0) {
      throw new InvalidRequestError("수량은 0 이상이어야 합니다");
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

      // 2. 상품 수량 변경
      cart.updateItemQuantity(request.productId, request.quantity);

      // 3. 장바구니가 비었는지 확인 후 처리
      if (cart.isEmpty()) {
        // 빈 장바구니는 DB에서 완전 삭제
        await this.cartRepository.delete(cart.getId());
        
        // 캐시에서도 제거
        await this.clearCache(request.userId, request.sessionId, cart.getId());
        
        return {
          success: true,
          cart: null,
          message: "상품이 제거되어 장바구니가 비워졌습니다.",
        };
      } else {
        // 아이템이 남아있으면 장바구니 저장
        const savedCart = await this.cartRepository.save(cart);
        
        // 캐시 업데이트
        await this.updateCache(request.userId, request.sessionId, savedCart);
        
        return {
          success: true,
          cart: savedCart,
          message: "상품 수량이 변경되었습니다.",
        };
      }
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
      throw new Error(`수량 변경 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  /**
   * 캐시 업데이트 (재사용 가능한 헬퍼 메서드)
   */
  private async updateCache(
    userId?: string,
    sessionId?: string,
    cart?: any
  ): Promise<void> {
    try {
      if (cart) {
        // 장바구니 데이터 캐시 (30분)
        await this.cacheService.set(`cart:${cart.getId()}`, cart, 1800);

        // 사용자/세션 매핑 캐시
        if (userId) {
          await this.cacheService.set(`user:${userId}`, cart.getId(), 3600); // 1시간
        }
        if (sessionId) {
          await this.cacheService.set(
            `session:${sessionId}`,
            cart.getId(),
            300
          ); // 5분
        }
      }
    } catch (error) {
      console.error("[UpdateCartItemUseCase] 캐시 업데이트 오류:", error);
      // 캐시 오류는 무시 (graceful degradation)
    }
  }

  /**
   * 캐시 완전 삭제 (빈 장바구니일 때)
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
      console.error("[UpdateCartItemUseCase] 캐시 삭제 오류:", error);
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
