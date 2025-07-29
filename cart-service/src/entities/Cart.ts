// ========================================
// 수정된 Cart Entity - isPersisted 메서드 추가
// cart-service/src/entities/Cart.ts
// ========================================

import { CartItem } from "./CartItem";
import { v4 as uuidv4 } from "uuid";

export interface CartData {
  id?: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class Cart {
  private id: string;
  private userId?: string;
  private sessionId?: string;
  private items: CartItem[];
  private createdAt: Date;
  private updatedAt: Date;
  private _isPersisted: boolean = false; // ✅ 추가

  constructor(data: CartData) {
    if (!data.userId && !data.sessionId) {
      throw new Error("userId 또는 sessionId 중 하나는 반드시 있어야 합니다");
    }

    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.items = data.items || [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    // ✅ ID가 제공된 경우 이미 저장된 것으로 간주
    this._isPersisted = !!data.id;
  }

  // ========================================
  // Factory Methods
  // ========================================
  static createForSession(sessionId: string): Cart {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("세션 ID는 필수입니다");
    }

    return new Cart({
      id: uuidv4(),
      sessionId: sessionId.trim(),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createForUser(userId: string): Cart {
    if (!userId || userId.trim() === "") {
      throw new Error("사용자 ID는 필수입니다");
    }

    return new Cart({
      id: uuidv4(),
      userId: userId.trim(),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ========================================
  // Core Business Logic
  // ========================================
  addItem(productId: string, quantity: number, price: number): void {
    this.validateProductInput(productId, quantity, price);

    const existingItem = this.findItem(productId);

    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      const newItem = new CartItem({
        cartId: this.id,
        productId,
        quantity,
        price,
        addedAt: new Date(),
      });
      this.items.push(newItem);
    }

    this.touch();
  }

  removeItem(productId: string): void {
    if (!productId || productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    const itemIndex = this.items.findIndex(
      (item) => item.getProductId() === productId
    );

    if (itemIndex === -1) {
      throw new Error("해당 상품이 장바구니에 없습니다");
    }

    this.items.splice(itemIndex, 1);
    this.touch();
  }

  updateItemQuantity(productId: string, quantity: number): void {
    if (!productId || productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    if (quantity < 0) {
      throw new Error("수량은 0 이상이어야 합니다");
    }

    if (quantity === 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.findItem(productId);
    if (!item) {
      throw new Error("해당 상품이 장바구니에 없습니다");
    }

    item.updateQuantity(quantity);
    this.touch();
  }

  transferToUser(userId: string): void {
    if (!userId || userId.trim() === "") {
      throw new Error("사용자 ID는 필수입니다");
    }

    if (this.userId) {
      throw new Error("이미 사용자 장바구니입니다");
    }

    this.userId = userId.trim();
    this.sessionId = undefined;
    this.touch();
  }

  mergeWith(otherCart: Cart): void {
    for (const otherItem of otherCart.getItems()) {
      const existingItem = this.findItem(otherItem.getProductId());

      if (existingItem) {
        existingItem.increaseQuantity(otherItem.getQuantity());
      } else {
        const newItem = new CartItem({
          cartId: this.id,
          productId: otherItem.getProductId(),
          quantity: otherItem.getQuantity(),
          price: otherItem.getPrice(),
          addedAt: new Date(),
        });
        this.items.push(newItem);
      }
    }

    this.touch();
  }

  clear(): void {
    this.items = [];
    this.touch();
  }

  // ========================================
  // Query Methods
  // ========================================
  findItem(productId: string): CartItem | undefined {
    return this.items.find((item) => item.getProductId() === productId);
  }

  hasItem(productId: string): boolean {
    return this.findItem(productId) !== undefined;
  }

  getItemQuantity(productId: string): number {
    const item = this.findItem(productId);
    return item ? item.getQuantity() : 0;
  }

  getTotalAmount(): number {
    return this.items.reduce((total, item) => total + item.getSubtotal(), 0);
  }

  getTotalItems(): number {
    return this.items.reduce((total, item) => total + item.getQuantity(), 0);
  }

  getUniqueItemCount(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // ✅ 저장 상태 관리 메서드들
  isPersisted(): boolean {
    return this._isPersisted;
  }

  markAsPersisted(): void {
    this._isPersisted = true;
  }

  markAsNew(): void {
    this._isPersisted = false;
  }

  // ========================================
  // Getters
  // ========================================
  getId(): string {
    return this.id;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  // ========================================
  // Internal Helpers
  // ========================================
  private validateProductInput(
    productId: string,
    quantity: number,
    price: number
  ): void {
    if (!productId || productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    if (quantity <= 0) {
      throw new Error("수량은 1 이상이어야 합니다");
    }

    if (price <= 0) {
      throw new Error("가격은 0보다 커야 합니다");
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  // ========================================
  // Utility Methods
  // ========================================
  getSummary(): {
    id: string;
    userId?: string;
    sessionId?: string;
    totalItems: number;
    totalAmount: number;
    uniqueItemCount: number;
    isEmpty: boolean;
  } {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      totalItems: this.getTotalItems(),
      totalAmount: this.getTotalAmount(),
      uniqueItemCount: this.getUniqueItemCount(),
      isEmpty: this.isEmpty(),
    };
  }

  toJSON(): CartData & {
    totalItems: number;
    totalAmount: number;
    uniqueItemCount: number;
    isEmpty: boolean;
  } {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      items: this.items,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalItems: this.getTotalItems(),
      totalAmount: this.getTotalAmount(),
      uniqueItemCount: this.getUniqueItemCount(),
      isEmpty: this.isEmpty(),
    };
  }
}
