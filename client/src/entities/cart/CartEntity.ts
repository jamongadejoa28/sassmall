// ========================================
// 장바구니 엔티티
// client/src/entities/cart/CartEntity.ts
// ========================================

import { CartItem, ProductInfo } from './CartItem';

export class CartEntity {
  public readonly userId: string;
  private _items: Map<string, CartItem>;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(userId: string, items: CartItem[] = []) {
    this.validateUserId(userId);

    this.userId = userId;
    this._items = new Map();
    this._createdAt = new Date();
    this._updatedAt = new Date();

    // 기존 아이템들 추가
    items.forEach(item => {
      this._items.set(item.productId, item);
    });
  }

  // ========================================
  // Getters
  // ========================================

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * 장바구니 아이템 개수
   */
  getItemCount(): number {
    return this._items.size;
  }

  /**
   * 전체 상품 수량
   */
  getTotalQuantity(): number {
    return Array.from(this._items.values()).reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  /**
   * 전체 금액
   */
  getTotalPrice(): number {
    return Array.from(this._items.values()).reduce(
      (total, item) => total + item.totalPrice,
      0
    );
  }

  /**
   * 모든 아이템 조회
   */
  getItems(): CartItem[] {
    return Array.from(this._items.values());
  }

  /**
   * 특정 아이템 조회
   */
  getItem(productId: string): CartItem | null {
    return this._items.get(productId) || null;
  }

  // ========================================
  // 비즈니스 로직
  // ========================================

  /**
   * 상품 추가
   */
  addItem(product: ProductInfo, quantity: number): void {
    const existingItem = this._items.get(product.id);

    if (existingItem) {
      // 기존 상품이면 수량 증가
      const newQuantity = existingItem.quantity + quantity;
      existingItem.updateQuantity(newQuantity);
    } else {
      // 새로운 상품이면 추가
      const newItem = new CartItem(product, quantity);
      this._items.set(product.id, newItem);
    }

    this.updateTimestamp();
  }

  /**
   * 상품 제거
   */
  removeItem(productId: string): void {
    if (!this._items.has(productId)) {
      throw new Error('상품이 장바구니에 없습니다');
    }

    this._items.delete(productId);
    this.updateTimestamp();
  }

  /**
   * 수량 변경
   */
  updateQuantity(productId: string, quantity: number): void {
    const item = this._items.get(productId);

    if (!item) {
      throw new Error('상품이 장바구니에 없습니다');
    }

    if (quantity === 0) {
      this.removeItem(productId);
      return;
    }

    item.updateQuantity(quantity);
    this.updateTimestamp();
  }

  /**
   * 장바구니 비우기
   */
  clear(): void {
    this._items.clear();
    this.updateTimestamp();
  }

  /**
   * 상품 존재 여부 확인
   */
  hasItem(productId: string): boolean {
    return this._items.has(productId);
  }

  /**
   * 장바구니가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this._items.size === 0;
  }

  /**
   * 모든 아이템의 재고 충분 여부 확인
   */
  areAllItemsInStock(): boolean {
    return Array.from(this._items.values()).every(item =>
      item.isStockSufficient()
    );
  }

  /**
   * 재고 부족 아이템들 조회
   */
  getOutOfStockItems(): CartItem[] {
    return Array.from(this._items.values()).filter(
      item => !item.isStockSufficient()
    );
  }

  // ========================================
  // 유틸리티
  // ========================================

  private validateUserId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다');
    }
  }

  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  // ========================================
  // 직렬화
  // ========================================

  toJSON() {
    return {
      userId: this.userId,
      items: this.getItems().map(item => item.toJSON()),
      itemCount: this.getItemCount(),
      totalQuantity: this.getTotalQuantity(),
      totalPrice: this.getTotalPrice(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  static fromJSON(data: any): CartEntity {
    const items = data.items
      ? data.items.map((itemData: any) => CartItem.fromJSON(itemData))
      : [];
    const cart = new CartEntity(data.userId, items);

    if (data.createdAt) {
      cart._createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt) {
      cart._updatedAt = new Date(data.updatedAt);
    }

    return cart;
  }
}
