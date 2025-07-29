// ========================================
// 장바구니에 상품 추가 유스케이스 (localStorage 기반)
// client/src/usecases/cart/AddToCartUseCase.ts
// ========================================

import {
  CartRepository,
  AddToCartRequest,
  CartResponse,
  Result,
} from './types';
import { cartLocalRepository } from '../../adapters/storage/CartLocalRepository';
import { cartApiAdapter } from '../../adapters/api/CartApiAdapter';
import { CartProduct } from '../../types/cart-type/CartProduct';

export class AddToCartUseCase {
  constructor(private cartRepository: CartRepository) {}

  async execute(request: AddToCartRequest): Promise<Result<CartResponse>> {
    try {
      // 1. 입력 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // 2. Product Service에서 상품 정보 조회
      const productInfo = await cartApiAdapter.getProductInfo(
        request.productId
      );

      // 3. Product 정보를 CartProduct 형태로 변환
      const cartProduct: CartProduct = {
        id: productInfo.id,
        name: productInfo.name,
        description: productInfo.description,
        price: productInfo.price, // 할인가가 이미 적용됨
        brand: productInfo.brand,
        sku: productInfo.sku,
        category: productInfo.category,
        inventory: productInfo.inventory,
        image_urls: productInfo.image_urls || [],
        imageUrls: productInfo.imageUrls,
        rating: productInfo.rating,
        review_count: productInfo.review_count,
        is_featured: productInfo.is_featured,
        min_order_quantity: productInfo.min_order_quantity,
        max_order_quantity: productInfo.max_order_quantity,
        tags: productInfo.tags,
        created_at: productInfo.created_at,
        updated_at: productInfo.updated_at,
      };

      // 4. localStorage 기반 장바구니에 추가
      const cart = await cartLocalRepository.addItem(
        cartProduct,
        request.quantity
      );

      // 5. 기존 CartRepository에도 저장 (호환성)
      try {
        await this.cartRepository.save(cart as any);
      } catch (localError) {
        console.warn('기존 저장소 업데이트 실패:', localError);
      }

      // 6. 응답 생성
      return {
        success: true,
        data: this.mapToApiResponse(cart),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '장바구니 추가 중 오류가 발생했습니다.';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private validateInput(request: AddToCartRequest): string | null {
    if (!request.productId || request.productId.trim() === '') {
      return '상품 ID는 필수입니다.';
    }

    if (!request.quantity || request.quantity < 1) {
      return '수량은 1 이상이어야 합니다.';
    }

    if (request.quantity > 999) {
      return '수량은 999개를 초과할 수 없습니다.';
    }

    return null;
  }

  private mapToApiResponse(cart: any): CartResponse {
    return {
      userId: 'guest', // localStorage 기반이므로 guest로 설정
      items:
        cart.items?.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          price: item.productPrice,
          quantity: item.quantity,
          availableQuantity: item.productInfo?.availableQuantity || 0,
          totalPrice: item.productPrice * item.quantity,
        })) || [],
      itemCount: cart.items?.length || 0,
      totalQuantity:
        cart.items?.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        ) || 0,
      totalPrice:
        cart.items?.reduce(
          (sum: number, item: any) => sum + item.productPrice * item.quantity,
          0
        ) || 0,
      updatedAt: cart.updatedAt || new Date().toISOString(),
    };
  }
}
