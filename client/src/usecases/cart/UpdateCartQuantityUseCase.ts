import {
  CartRepository,
  UpdateCartQuantityRequest,
  CartResponse,
  Result,
} from './types';
import { CartEntity } from '../../entities/cart/CartEntity';

export class UpdateCartQuantityUseCase {
  constructor(private cartRepository: CartRepository) {}

  async execute(
    request: UpdateCartQuantityRequest
  ): Promise<Result<CartResponse>> {
    try {
      // 1. 입력 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // 2. 장바구니 조회
      const cart = await this.cartRepository.findByUserId(request.userId);
      if (!cart) {
        return { success: false, error: '장바구니를 찾을 수 없습니다' };
      }

      // 3. 수량 변경
      cart.updateQuantity(request.productId, request.quantity);

      // 4. 장바구니 저장
      await this.cartRepository.save(cart);

      // 5. 응답 생성
      return {
        success: true,
        data: this.mapToResponse(cart),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '수량 변경 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    }
  }

  private validateInput(request: UpdateCartQuantityRequest): string | null {
    if (!request.userId || request.userId.trim() === '') {
      return '사용자 ID는 필수입니다';
    }

    if (!request.productId || request.productId.trim() === '') {
      return '상품 ID는 필수입니다';
    }

    if (!Number.isInteger(request.quantity) || request.quantity < 0) {
      return '수량은 0 이상의 정수여야 합니다';
    }

    return null;
  }

  private mapToResponse(cart: CartEntity): CartResponse {
    return {
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        availableQuantity: item.availableQuantity,
        totalPrice: item.totalPrice,
      })),
      itemCount: cart.getItemCount(),
      totalQuantity: cart.getTotalQuantity(),
      totalPrice: cart.getTotalPrice(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
