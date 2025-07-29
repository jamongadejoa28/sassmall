import { CartRepository, CartResponse, Result } from './types';
import { CartEntity } from '../../entities/cart/CartEntity';

export class ClearCartUseCase {
  constructor(private cartRepository: CartRepository) {}

  async execute(userId: string): Promise<Result<CartResponse>> {
    try {
      // 1. 입력 유효성 검증
      if (!userId || userId.trim() === '') {
        return { success: false, error: '사용자 ID는 필수입니다' };
      }

      // 2. 장바구니 조회
      const cart = await this.cartRepository.findByUserId(userId);
      if (!cart) {
        // 이미 없으면 빈 장바구니 반환
        const emptyCart = new CartEntity(userId);
        return {
          success: true,
          data: this.mapToResponse(emptyCart),
        };
      }

      // 3. 장바구니 비우기
      cart.clear();

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
          : '장바구니 비우기 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    }
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
