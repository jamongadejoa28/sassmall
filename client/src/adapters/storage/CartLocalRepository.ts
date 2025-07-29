// ========================================
// CartLocalRepository - localStorage 기반 장바구니 저장소
// Clean Architecture: Adapters Layer
// 위치: client/src/adapters/storage/CartLocalRepository.ts
// ========================================

import { CartProduct } from '../../types/cart-type/CartProduct';
import { cartApiAdapter } from '../api/CartApiAdapter';

// localStorage에 저장할 장바구니 아이템 타입
export interface LocalCartItem {
  productId: string;
  productName: string;
  productPrice: number;
  productBrand: string;
  productImageUrl: string;
  quantity: number;
  addedAt: string;
  // 상품 기본 정보 (캐시용)
  productInfo?: {
    availableQuantity: number;
    category: string;
    sku: string;
  };
}

// localStorage에 저장할 장바구니 타입
export interface LocalCart {
  id: string;
  items: LocalCartItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * localStorage 기반 장바구니 저장소
 *
 * 특징:
 * - 서버 API 호출 없이 모든 CRUD 작업 수행
 * - 브라우저 새로고침 후에도 데이터 유지
 * - 쿠키 삭제 시 장바구니도 함께 삭제됨
 */
export class CartLocalRepository {
  private readonly STORAGE_KEY = 'shopping_cart';
  private readonly CART_ID_KEY = 'cart_id';

  /**
   * 장바구니 로드
   */
  async load(): Promise<LocalCart> {
    try {
      const cartData = localStorage.getItem(this.STORAGE_KEY);

      if (cartData) {
        const cart = JSON.parse(cartData) as LocalCart;
        return cart;
      }

      // 장바구니가 없으면 새로 생성
      return this.createNewCart();
    } catch (error) {
      console.error('[CartLocalRepository] 장바구니 로드 실패:', error);
      return this.createNewCart();
    }
  }

  /**
   * 장바구니 저장
   */
  async save(cart: LocalCart): Promise<void> {
    try {
      cart.updatedAt = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));

      // 장바구니 ID도 별도로 저장 (쿠키 연동용)
      localStorage.setItem(this.CART_ID_KEY, cart.id);
    } catch (error) {
      console.error('[CartLocalRepository] 장바구니 저장 실패:', error);
      throw new Error('장바구니 저장에 실패했습니다.');
    }
  }

  /**
   * 상품 추가 (Product Service에서 최신 정보 조회)
   */
  async addItem(product: CartProduct, quantity: number): Promise<LocalCart> {
    try {
      // Product Service에서 최신 상품 정보 조회
      const latestProduct = await cartApiAdapter.getProductInfo(product.id);

      // 재고 확인
      const stockCheck = await cartApiAdapter.checkStock(product.id, quantity);
      if (!stockCheck.available) {
        throw new Error(stockCheck.message || '재고가 부족합니다.');
      }

      const cart = await this.load();
      const existingItemIndex = cart.items.findIndex(
        item => item.productId === product.id
      );

      if (existingItemIndex >= 0) {
        // 기존 상품이면 수량 확인 후 증가
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        const totalStockCheck = await cartApiAdapter.checkStock(
          product.id,
          newQuantity
        );

        if (!totalStockCheck.available) {
          throw new Error(totalStockCheck.message || '재고가 부족합니다.');
        }

        cart.items[existingItemIndex].quantity = newQuantity;
        // 최신 가격 정보 업데이트
        cart.items[existingItemIndex].productPrice = latestProduct.price;
        cart.items[existingItemIndex].productName = latestProduct.name;
        cart.items[existingItemIndex].productBrand = latestProduct.brand;
        cart.items[existingItemIndex].productImageUrl =
          latestProduct.image_urls?.[0] || latestProduct.imageUrls?.[0] || '';
      } else {
        // 새 상품이면 추가
        const newItem: LocalCartItem = {
          productId: latestProduct.id,
          productName: latestProduct.name,
          productPrice: latestProduct.price, // 할인가 적용된 최신 가격
          productBrand: latestProduct.brand,
          productImageUrl:
            latestProduct.image_urls?.[0] || latestProduct.imageUrls?.[0] || '',
          quantity,
          addedAt: new Date().toISOString(),
          productInfo: {
            availableQuantity: latestProduct.inventory.availableQuantity,
            category: latestProduct.category.name,
            sku: latestProduct.sku,
          },
        };
        cart.items.push(newItem);
      }

      await this.save(cart);
      return cart;
    } catch (error: any) {
      console.error('[CartLocalRepository] 상품 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 상품 제거
   */
  async removeItem(productId: string): Promise<LocalCart> {
    const cart = await this.load();
    cart.items = cart.items.filter(item => item.productId !== productId);
    await this.save(cart);
    return cart;
  }

  /**
   * 수량 변경 (재고 확인 포함)
   */
  async updateQuantity(
    productId: string,
    quantity: number
  ): Promise<LocalCart> {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    try {
      // 재고 확인
      const stockCheck = await cartApiAdapter.checkStock(productId, quantity);
      if (!stockCheck.available) {
        throw new Error(stockCheck.message || '재고가 부족합니다.');
      }

      const cart = await this.load();
      const itemIndex = cart.items.findIndex(
        item => item.productId === productId
      );

      if (itemIndex >= 0) {
        // 최신 상품 정보로 업데이트
        try {
          const latestProduct = await cartApiAdapter.getProductInfo(productId);
          cart.items[itemIndex].quantity = quantity;
          cart.items[itemIndex].productPrice = latestProduct.price;
          cart.items[itemIndex].productName = latestProduct.name;
          cart.items[itemIndex].productBrand = latestProduct.brand;
          cart.items[itemIndex].productImageUrl =
            latestProduct.image_urls?.[0] || latestProduct.imageUrls?.[0] || '';
        } catch (error) {
          // 상품 정보 업데이트 실패해도 수량은 변경
          console.warn('상품 정보 업데이트 실패:', error);
          cart.items[itemIndex].quantity = quantity;
        }

        await this.save(cart);
      }

      return cart;
    } catch (error: any) {
      console.error('[CartLocalRepository] 수량 변경 실패:', error);
      throw error;
    }
  }

  /**
   * 선택된 상품들 삭제
   */
  async removeSelectedItems(productIds: string[]): Promise<LocalCart> {
    const cart = await this.load();
    cart.items = cart.items.filter(
      item => !productIds.includes(item.productId)
    );
    await this.save(cart);
    return cart;
  }

  /**
   * 장바구니 전체 비우기
   */
  async clear(): Promise<LocalCart> {
    const cart = await this.load();
    cart.items = [];
    await this.save(cart);
    return cart;
  }

  /**
   * 장바구니 상품 정보 동기화 (Product Service에서 최신 정보 가져오기)
   */
  async syncProductInfo(): Promise<LocalCart> {
    try {
      const cart = await this.load();

      if (cart.items.length === 0) {
        return cart;
      }

      // 모든 상품의 최신 정보 조회
      const productIds = cart.items.map(item => item.productId);
      const latestProducts = await cartApiAdapter.getProductsInfo(productIds);

      // 상품 정보 업데이트
      cart.items.forEach(item => {
        const latestProduct = latestProducts.find(p => p.id === item.productId);
        if (latestProduct) {
          item.productName = latestProduct.name;
          item.productPrice = latestProduct.price; // 할인가 적용
          item.productBrand = latestProduct.brand;
          item.productImageUrl =
            latestProduct.image_urls?.[0] || latestProduct.imageUrls?.[0] || '';
          item.productInfo = {
            availableQuantity: latestProduct.inventory.availableQuantity,
            category: latestProduct.category.name,
            sku: latestProduct.sku,
          };
        }
      });

      await this.save(cart);
      return cart;
    } catch (error: any) {
      console.error('[CartLocalRepository] 상품 정보 동기화 실패:', error);
      // 동기화 실패해도 기존 장바구니 반환
      return this.load();
    }
  }

  /**
   * 장바구니 통계
   */
  async getStats(): Promise<{
    totalItems: number;
    totalAmount: number;
    uniqueItemCount: number;
    isEmpty: boolean;
  }> {
    const cart = await this.load();

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.productPrice * item.quantity,
      0
    );

    return {
      totalItems,
      totalAmount,
      uniqueItemCount: cart.items.length,
      isEmpty: cart.items.length === 0,
    };
  }

  /**
   * 특정 상품의 장바구니 수량 조회
   */
  async getItemQuantity(productId: string): Promise<number> {
    const cart = await this.load();
    const item = cart.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }

  /**
   * 장바구니에 상품이 있는지 확인
   */
  async hasItem(productId: string): Promise<boolean> {
    const cart = await this.load();
    return cart.items.some(item => item.productId === productId);
  }

  /**
   * 새 장바구니 생성
   */
  private createNewCart(): LocalCart {
    const cartId = this.generateCartId();
    return {
      id: cartId,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 장바구니 ID 생성
   */
  private generateCartId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 현재 장바구니 ID 조회
   */
  getCartId(): string | null {
    return localStorage.getItem(this.CART_ID_KEY);
  }

  /**
   * 장바구니 완전 삭제 (로그아웃 시 등)
   */
  async destroy(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CART_ID_KEY);
  }
}

// 싱글톤 인스턴스 export
export const cartLocalRepository = new CartLocalRepository();
