// ========================================
// 장바구니 관련 타입 정의
// client/src/usecases/cart/types.ts
// ========================================

import { CartEntity } from '../../entities/cart/CartEntity';

export interface CartRepository {
  findByUserId(userId: string): Promise<CartEntity | null>;
  save(cart: CartEntity): Promise<void>;
  delete(userId: string): Promise<void>;
}

// 요청/응답 타입들
export interface AddToCartRequest {
  userId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  availableQuantity: number;
}

export interface UpdateCartQuantityRequest {
  userId: string;
  productId: string;
  quantity: number;
}

export interface RemoveFromCartRequest {
  userId: string;
  productId: string;
}

export interface CartResponse {
  userId: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    availableQuantity: number;
    totalPrice: number;
  }>;
  itemCount: number;
  totalQuantity: number;
  totalPrice: number;
  updatedAt: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}
