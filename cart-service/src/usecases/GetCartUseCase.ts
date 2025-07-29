// ========================================
// GetCartUseCase - 캐시 역직렬화 문제 근본 해결
// cart-service/src/usecases/GetCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  GetCartRequest,
  GetCartResponse,
  CartRepository,
  CacheService,
  ProductServiceClient,
  InvalidRequestError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";
import { Cart } from "../entities/Cart";
import { CartItem } from "../entities/CartItem";

@injectable()
export class GetCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService,
    @inject(TYPES.ProductServiceClient) private productServiceClient: ProductServiceClient
  ) {}

  async execute(request: GetCartRequest): Promise<GetCartResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    try {
      let cart = null;
      let cacheKey = "";

      // 1. 캐시에서 먼저 조회 시도
      if (request.userId) {
        cacheKey = `user:${request.userId}`;
        const cachedCartId = await this.cacheService.get<string>(cacheKey);

        if (cachedCartId) {
          const cachedCart = await this.cacheService.get(
            `cart:${cachedCartId}`
          );
          if (cachedCart) {
            // 🔧 수정: 캐시에서 가져온 일반 객체를 Domain 인스턴스로 변환
            cart = this.deserializeCartFromCache(cachedCart);
          }
        }

        // 캐시에 없으면 DB에서 조회
        if (!cart) {
          cart = await this.cartRepository.findByUserId(request.userId);

          // DB에서 찾은 경우 캐시에 저장
          if (cart) {
            await this.saveCartToCache(cart);
            await this.cacheService.set(cacheKey, cart.getId(), 3600); // 1시간
          }
        }
      } else if (request.sessionId) {
        cacheKey = `session:${request.sessionId}`;
        const cachedCartId = await this.cacheService.get<string>(cacheKey);

        if (cachedCartId) {
          const cachedCart = await this.cacheService.get(
            `cart:${cachedCartId}`
          );
          if (cachedCart) {
            // 🔧 수정: 캐시에서 가져온 일반 객체를 Domain 인스턴스로 변환
            cart = this.deserializeCartFromCache(cachedCart);
            
            // 🔧 세션 카트 TTL 연장 (사용자 활동 시 30분 연장)
            if (cart) {
              console.log(`🔄 [GetCartUseCase] 세션 장바구니 TTL 연장: ${request.sessionId}`);
              await this.cacheService.set(cacheKey, cart.getId(), 1800); // 30분 연장
              await this.cacheService.set(`cart:${cart.getId()}`, cachedCart, 1800); // 장바구니 데이터도 연장
            }
          }
        }

        // 캐시에 없으면 DB에서 조회
        if (!cart) {
          cart = await this.cartRepository.findBySessionId(request.sessionId);

          // DB에서 찾은 경우 캐시에 저장
          if (cart) {
            await this.saveCartToCache(cart);
            await this.cacheService.set(cacheKey, cart.getId(), 300); // 5분
          }
        }
      }

      // 장바구니가 있으면 상품 정보도 함께 조회
      let enrichedCart = cart;
      if (cart && cart.getItems().length > 0) {
        enrichedCart = await this.enrichCartWithProductInfo(cart);
      }

      return {
        success: true,
        cart: enrichedCart,
        message: cart ? "장바구니를 조회했습니다." : "장바구니가 비어있습니다.",
      };
    } catch (error) {
      // 타입 안전한 에러 처리
      const errorMessage = this.getErrorMessage(error);
      throw new Error(`장바구니 조회 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  // ========================================
  // 🔧 캐시 직렬화/역직렬화 헬퍼 메서드들 (근본 해결)
  // ========================================

  /**
   * 캐시에서 조회한 일반 객체를 Cart Domain 인스턴스로 변환
   */
  private deserializeCartFromCache(cachedData: any): Cart | null {
    try {
      if (!cachedData) {
        return null;
      }

      // 🔧 핵심: CartItem 일반 객체들을 CartItem 인스턴스로 변환
      const cartItems = (cachedData.items || []).map((itemData: any) => {
        return new CartItem({
          id: itemData.id,
          cartId: itemData.cartId,
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemData.price,
          addedAt: new Date(itemData.addedAt),
        });
      });

      // 🔧 핵심: Cart 인스턴스 생성 (CartItem 인스턴스들과 함께)
      const cart = new Cart({
        id: cachedData.id,
        userId: cachedData.userId || undefined,
        sessionId: cachedData.sessionId || undefined,
        items: cartItems, // ✅ 올바른 CartItem 인스턴스들
        createdAt: new Date(cachedData.createdAt),
        updatedAt: new Date(cachedData.updatedAt),
      });

      // 저장 상태 표시
      cart.markAsPersisted();

      return cart;
    } catch (error) {
      console.error("[GetCartUseCase] 캐시 역직렬화 오류:", error);
      // 캐시 역직렬화 실패 시 null 반환 (DB에서 조회하도록)
      return null;
    }
  }

  /**
   * Cart 인스턴스를 캐시에 저장 (직렬화)
   */
  private async saveCartToCache(cart: Cart): Promise<void> {
    try {
      // 🔧 직렬화: Cart 인스턴스를 JSON 직렬화 가능한 객체로 변환
      const serializedCart = {
        id: cart.getId(),
        userId: cart.getUserId(),
        sessionId: cart.getSessionId(),
        items: cart.getItems().map((item) => ({
          id: item.getId(),
          cartId: item.getCartId(),
          productId: item.getProductId(),
          quantity: item.getQuantity(),
          price: item.getPrice(),
          addedAt: item.getAddedAt().toISOString(),
        })),
        createdAt: cart.getCreatedAt().toISOString(),
        updatedAt: cart.getUpdatedAt().toISOString(),
      };

      // 캐시에 저장 (30분 TTL)
      await this.cacheService.set(`cart:${cart.getId()}`, serializedCart, 1800);
    } catch (error) {
      console.error("[GetCartUseCase] 캐시 저장 오류:", error);
      // 캐시 저장 실패는 무시 (graceful degradation)
    }
  }

  /**
   * 장바구니에 상품 정보를 추가
   */
  private async enrichCartWithProductInfo(cart: Cart): Promise<Cart> {
    try {
      const items = cart.getItems();
      const enrichedItems: CartItem[] = [];

      // 각 아이템에 대해 상품 정보 조회
      for (const item of items) {
        try {
          const productInfo = await this.productServiceClient.getProduct(item.getProductId());
          
          if (productInfo) {
            // 상품 정보가 있으면 CartItem에 추가 정보 설정
            const enrichedItem = new CartItem({
              id: item.getId(),
              cartId: item.getCartId(),
              productId: item.getProductId(),
              quantity: item.getQuantity(),
              price: item.getPrice(),
              addedAt: item.getAddedAt()
            });
            
            // 상품 정보를 아이템에 추가 (실제로는 별도 필드나 메타데이터로 관리)
            (enrichedItem as any).productInfo = productInfo;
            enrichedItems.push(enrichedItem);
          } else {
            // 상품 정보가 없으면 기존 아이템 그대로 추가
            enrichedItems.push(item);
          }
        } catch (error) {
          console.warn(`상품 정보 조회 실패 (productId: ${item.getProductId()}):`, error);
          // 상품 정보 조회 실패해도 기존 아이템은 유지
          enrichedItems.push(item);
        }
      }

      // 새로운 Cart 인스턴스 생성 (enriched items 포함)
      const enrichedCart = new Cart({
        id: cart.getId(),
        userId: cart.getUserId(),
        sessionId: cart.getSessionId(),
        items: enrichedItems,
        createdAt: cart.getCreatedAt(),
        updatedAt: cart.getUpdatedAt()
      });

      return enrichedCart;
    } catch (error) {
      console.error('장바구니 상품 정보 추가 중 오류:', error);
      // 실패 시 원본 cart 반환
      return cart;
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
