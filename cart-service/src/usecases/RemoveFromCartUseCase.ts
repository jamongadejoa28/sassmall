// ========================================
// RemoveFromCartUseCase - 새로운 CacheService 구조 적용
// cart-service/src/usecases/RemoveFromCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  RemoveFromCartRequest,
  RemoveFromCartResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class RemoveFromCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(
    request: RemoveFromCartRequest
  ): Promise<RemoveFromCartResponse> {
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

      // 2. 상품 제거
      cart.removeItem(request.productId);

      // 3. 장바구니가 비었는지 확인 후 처리
      if (cart.isEmpty()) {
        // 빈 장바구니는 DB에서 완전 삭제 (cart_items와 함께)
        // deleteCart 메서드를 사용하여 트랜잭션 내에서 안전하게 삭제
        await this.cartRepository.deleteCart(cart.getId());
        
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
          message: "상품이 장바구니에서 제거되었습니다.",
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
      throw new Error(`상품 제거 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  /**
   * 캐시 업데이트
   */
  private async updateCache(
    userId?: string,
    sessionId?: string,
    cart?: any
  ): Promise<void> {
    try {
      if (cart) {
        // 장바구니 데이터 캐시
        await this.cacheService.set(`cart:${cart.getId()}`, cart, 1800); // 30분

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
      console.error("캐시 업데이트 오류:", error);
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
      console.error("캐시 삭제 오류:", error);
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
