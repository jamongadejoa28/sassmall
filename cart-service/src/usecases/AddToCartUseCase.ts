// ========================================
// AddToCartUseCase.ts - Inversify 데코레이터 추가 (수정본)
// cart-service/src/usecases/AddToCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { Cart } from "../entities/Cart";
import {
  AddToCartRequest,
  AddToCartResponse,
  CartRepository,
  CacheService,
  ProductServiceClient,
  ProductNotFoundError,
  InsufficientStockError,
  InvalidRequestError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class AddToCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService,
    @inject(TYPES.ProductServiceClient)
    private productServiceClient: ProductServiceClient
  ) {}

  async execute(request: AddToCartRequest): Promise<AddToCartResponse> {
    // 1. 입력값 검증
    this.validateRequest(request);

    try {
      // 2. 상품 정보 및 재고 확인
      const product = await this.productServiceClient.getProduct(
        request.productId
      );

      if (!product) {
        throw new ProductNotFoundError(request.productId);
      }

      // 3. 재고 부족 체크 (동시성 고려)
      if (product.inventory.quantity < request.quantity) {
        throw new InsufficientStockError(
          `재고가 부족합니다. 현재 재고: ${product.inventory.quantity}개. 페이지를 새로고침해주세요.`,
          product.inventory.quantity
        );
      }

      // 4. 장바구니 조회 또는 생성
      const cart = await this.getOrCreateCart(
        request.userId,
        request.sessionId
      );

      // 5. 상품 추가 (같은 상품이면 수량 증가)
      cart.addItem(request.productId, request.quantity, product.price);

      // 6. 저장 및 캐시 업데이트
      const savedCart = await this.cartRepository.save(cart);

      // 새로운 CacheService 사용
      await this.cacheService.set(`cart:${savedCart.getId()}`, savedCart, 1800);

      // 사용자/세션 매핑 캐시
      if (request.userId) {
        await this.cacheService.set(
          `user:${request.userId}`,
          savedCart.getId(),
          3600
        );
      }
      if (request.sessionId) {
        await this.cacheService.set(
          `session:${request.sessionId}`,
          savedCart.getId(),
          1800 // 30분 (1800초)
        );
      }

      return {
        success: true,
        cart: savedCart,
        message: "상품이 장바구니에 추가되었습니다.",
      };
    } catch (error) {
      // ✅ 타입 안전한 에러 처리
      if (
        error instanceof ProductNotFoundError ||
        error instanceof InsufficientStockError ||
        error instanceof InvalidRequestError
      ) {
        throw error; // 비즈니스 로직 에러는 그대로 전파
      }

      // ✅ unknown 타입 에러 처리
      const errorMessage = this.getErrorMessage(error);
      throw new Error(`장바구니 추가 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  private validateRequest(request: AddToCartRequest): void {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    if (!request.productId) {
      throw new InvalidRequestError("상품 ID는 필수입니다");
    }

    if (request.quantity <= 0) {
      throw new InvalidRequestError("수량은 1 이상이어야 합니다");
    }
  }

  private async getOrCreateCart(
    userId?: string,
    sessionId?: string
  ): Promise<Cart> {
    let cart: Cart | null = null;

    // 사용자 장바구니 조회
    if (userId) {
      cart = await this.cartRepository.findByUserId(userId);
    }

    // 세션 장바구니 조회
    if (!cart && sessionId) {
      cart = await this.cartRepository.findBySessionId(sessionId);
    }

    // 장바구니가 없으면 새로 생성
    if (!cart) {
      // ✅ 로그인한 사용자가 있으면 사용자 장바구니를 우선 생성
      if (userId) {
        cart = Cart.createForUser(userId);
      } else if (sessionId) {
        cart = Cart.createForSession(sessionId);
      } else {
        throw new InvalidRequestError("장바구니를 생성할 수 없습니다");
      }
    }

    return cart;
  }

  // ✅ 타입 안전한 에러 메시지 추출
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
