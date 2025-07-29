// ========================================
// TransferCartUseCase - 새로운 CacheService 구조 적용
// cart-service/src/usecases/TransferCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { Cart } from "../entities/Cart";
import {
  TransferCartRequest,
  TransferCartResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class TransferCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(request: TransferCartRequest): Promise<TransferCartResponse> {
    // 1. 입력값 검증
    this.validateRequest(request);

    try {
      // 2. sessionId 기반 장바구니 조회
      const sessionCart = await this.cartRepository.findBySessionId(
        request.sessionId
      );


      if (!sessionCart) {
        // 세션 장바구니가 없으면 빈 사용자 장바구니 생성
        const newUserCart = Cart.createForUser(request.userId);
        const savedCart = await this.cartRepository.save(newUserCart);

        // 새 장바구니 캐시
        await this.updateUserCache(request.userId, savedCart);

        return {
          success: true,
          cart: savedCart,
          message: "새로운 장바구니가 생성되었습니다.",
        };
      }

      // 3. userId 기반 기존 장바구니 조회
      const userCart = await this.cartRepository.findByUserId(request.userId);


      if (userCart) {
        // 4. 두 장바구니 병합 (같은 상품은 수량 증가)
        await this.mergeCart(userCart, sessionCart);
        
        // 먼저 사용자 장바구니 저장
        const savedCart = await this.cartRepository.save(userCart);
        
        // 그 후 세션 장바구니 삭제
        await this.cartRepository.delete(sessionCart.getId()!);

        // 캐시 업데이트 (세션 캐시 삭제, 사용자 캐시 업데이트)
        await this.cleanupSessionCache(request.sessionId);
        await this.updateUserCache(request.userId, savedCart);

        return {
          success: true,
          cart: savedCart,
          message: "장바구니가 병합되었습니다.",
        };
      } else {
        // 5. 세션 장바구니를 사용자 장바구니로 이전
        // 새로운 사용자 장바구니 생성
        const newUserCart = Cart.createForUser(request.userId);
        
        // 세션 장바구니의 모든 아이템을 새 사용자 장바구니로 복사
        for (const item of sessionCart.getItems()) {
          newUserCart.addItem(item.getProductId(), item.getQuantity(), item.getPrice());
        }
        
        // 새 사용자 장바구니 저장
        const savedCart = await this.cartRepository.save(newUserCart);
        
        // 기존 세션 장바구니 삭제
        await this.cartRepository.delete(sessionCart.getId()!);

        // 캐시 업데이트 (세션 -> 사용자로 이전)
        await this.cleanupSessionCache(request.sessionId);
        await this.updateUserCache(request.userId, savedCart);

        return {
          success: true,
          cart: savedCart,
          message: "장바구니가 이전되었습니다.",
        };
      }
    } catch (error) {
      // 비즈니스 로직 에러는 그대로 전파
      if (error instanceof InvalidRequestError) {
        throw error;
      }

      // 타입 안전한 에러 처리
      const errorMessage = this.getErrorMessage(error);
      throw new Error(`장바구니 이전 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  private validateRequest(request: TransferCartRequest): void {
    if (!request.userId) {
      throw new InvalidRequestError("사용자 ID는 필수입니다");
    }

    if (!request.sessionId) {
      throw new InvalidRequestError("세션 ID는 필수입니다");
    }
  }

  private async mergeCart(targetCart: Cart, sourceCart: Cart): Promise<void> {
    targetCart.mergeWith(sourceCart);
  }

  /**
   * 사용자 캐시 업데이트
   */
  private async updateUserCache(userId: string, cart: any): Promise<void> {
    try {
      await this.cacheService.set(`cart:${cart.getId()}`, cart, 1800); // 30분
      await this.cacheService.set(`user:${userId}`, cart.getId(), 3600); // 1시간
    } catch (error) {
      console.error("[TransferCartUseCase] 사용자 캐시 업데이트 오류:", error);
    }
  }

  /**
   * 세션 캐시 정리
   */
  private async cleanupSessionCache(sessionId: string): Promise<void> {
    try {
      // 세션 매핑 삭제
      await this.cacheService.delete(`session:${sessionId}`);

      // 패턴 기반으로 세션 관련 캐시 정리
      await this.cacheService.invalidatePattern(`session:${sessionId}*`);
    } catch (error) {
      console.error("[TransferCartUseCase] 세션 캐시 정리 오류:", error);
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
