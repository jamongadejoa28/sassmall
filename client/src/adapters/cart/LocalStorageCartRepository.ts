import { CartRepository } from '../../usecases/cart/types';
import { CartEntity } from '../../entities/cart/CartEntity';

export class LocalStorageCartRepository implements CartRepository {
  private readonly STORAGE_KEY = 'shopping_cart';

  async findByUserId(userId: string): Promise<CartEntity | null> {
    try {
      const storedData = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);

      if (!storedData) {
        return null;
      }

      const cartData = JSON.parse(storedData);
      return CartEntity.fromJSON(cartData);
    } catch (error) {
      console.error('장바구니 데이터 조회 중 오류:', error);
      return null;
    }
  }

  async save(cart: CartEntity): Promise<void> {
    try {
      const cartData = cart.toJSON();
      localStorage.setItem(
        `${this.STORAGE_KEY}_${cart.userId}`,
        JSON.stringify(cartData)
      );
    } catch (error) {
      console.error('장바구니 데이터 저장 중 오류:', error);
      throw new Error('장바구니 저장에 실패했습니다');
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
    } catch (error) {
      console.error('장바구니 데이터 삭제 중 오류:', error);
      throw new Error('장바구니 삭제에 실패했습니다');
    }
  }
}
