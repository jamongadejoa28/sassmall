// ========================================
// CartItem Entity 구현체 - Domain Layer
// cart-service/src/entities/CartItem.ts
// ========================================

/**
 * CartItem Domain Entity
 *
 * 책임:
 * - 장바구니 아이템 도메인 로직
 * - 수량 변경 및 가격 계산
 * - 아이템별 비즈니스 규칙 검증
 *
 * Clean Architecture:
 * - 외부 의존성 없음 (Pure Domain Logic)
 * - 불변성 보장
 * - 비즈니스 규칙 캡슐화
 */

export interface CartItemData {
  id?: string;
  cartId: string;
  productId: string;
  quantity: number;
  price: number;
  addedAt: Date;
}

export class CartItem {
  private id?: string;
  private cartId: string;
  private productId: string;
  private quantity: number;
  private price: number;
  private addedAt: Date;

  constructor(data: CartItemData) {
    // 입력값 검증
    this.validateInput(data);

    this.id = data.id;
    this.cartId = data.cartId.trim();
    this.productId = data.productId.trim();
    this.quantity = Math.floor(data.quantity); // 정수로 변환
    this.price = data.price;
    this.addedAt = data.addedAt;
  }

  // ========================================
  // Core Business Logic - 수량 관리
  // ========================================

  /**
   * 수량 변경
   */
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error("수량은 1 이상이어야 합니다");
    }

    this.quantity = Math.floor(newQuantity); // 정수로 변환
  }

  /**
   * 수량 증가 (같은 상품 추가 시)
   */
  increaseQuantity(additionalQuantity: number): void {
    if (additionalQuantity <= 0) {
      throw new Error("추가 수량은 0보다 커야 합니다");
    }

    this.quantity += Math.floor(additionalQuantity);
  }

  // ========================================
  // Query Methods - 조회 로직
  // ========================================

  /**
   * 소계 계산 (수량 × 가격)
   */
  getSubtotal(): number {
    return this.quantity * this.price;
  }

  /**
   * 수량이 유효한지 확인
   */
  isValidQuantity(): boolean {
    return this.quantity > 0 && Number.isInteger(this.quantity);
  }

  /**
   * 같은 상품인지 확인
   */
  isSameProduct(productId: string): boolean {
    if (!productId) return false;
    return this.productId === productId.trim();
  }

  /**
   * 수량이 제한 내에 있는지 확인
   */
  isQuantityWithinLimit(maxQuantity: number): boolean {
    return this.quantity <= maxQuantity;
  }

  /**
   * 추가된 시간으로부터 경과 시간 (밀리초)
   */
  getAgeInMilliseconds(): number {
    return Date.now() - this.addedAt.getTime();
  }

  // ========================================
  // Getters
  // ========================================

  getId(): string | undefined {
    return this.id;
  }

  getCartId(): string {
    return this.cartId;
  }

  getProductId(): string {
    return this.productId;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getPrice(): number {
    return this.price;
  }

  getAddedAt(): Date {
    return new Date(this.addedAt); // 불변성 보장
  }

  // ========================================
  // Data Transformation
  // ========================================

  /**
   * 아이템 요약 정보
   */
  getSummary(): {
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
  } {
    return {
      productId: this.productId,
      quantity: this.quantity,
      price: this.price,
      subtotal: this.getSubtotal(),
    };
  }

  /**
   * JSON 직렬화 (API 응답용)
   */
  toJSON(): CartItemData & { subtotal: number } {
    return {
      id: this.id,
      cartId: this.cartId,
      productId: this.productId,
      quantity: this.quantity,
      price: this.price,
      subtotal: this.getSubtotal(),
      addedAt: this.addedAt,
    };
  }

  /**
   * 업데이트 가능한 필드만 추출
   */
  getUpdateData(): { quantity: number } {
    return {
      quantity: this.quantity,
    };
  }

  // ========================================
  // Private Methods - 내부 검증
  // ========================================

  /**
   * 입력값 검증
   */
  private validateInput(data: CartItemData): void {
    // cartId 검증
    if (!data.cartId || data.cartId.trim() === "") {
      throw new Error("장바구니 ID는 필수입니다");
    }

    // productId 검증
    if (!data.productId || data.productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    // quantity 검증
    if (data.quantity <= 0) {
      throw new Error("수량은 1 이상이어야 합니다");
    }

    if (!Number.isFinite(data.quantity)) {
      throw new Error("수량은 유효한 숫자여야 합니다");
    }

    // price 검증
    if (data.price <= 0) {
      throw new Error("가격은 0보다 커야 합니다");
    }

    if (!Number.isFinite(data.price)) {
      throw new Error("가격은 유효한 숫자여야 합니다");
    }

    // addedAt 검증
    if (!(data.addedAt instanceof Date) || isNaN(data.addedAt.getTime())) {
      throw new Error("추가 시간은 유효한 Date 객체여야 합니다");
    }
  }

  // ========================================
  // Domain Events (추후 확장 가능)
  // ========================================

  /**
   * 수량 변경 이벤트 생성 (추후 이벤트 소싱용)
   */
  createQuantityChangeEvent(
    oldQuantity: number,
    newQuantity: number
  ): {
    type: "QUANTITY_CHANGED";
    cartId: string;
    productId: string;
    oldQuantity: number;
    newQuantity: number;
    timestamp: Date;
  } {
    return {
      type: "QUANTITY_CHANGED",
      cartId: this.cartId,
      productId: this.productId,
      oldQuantity,
      newQuantity,
      timestamp: new Date(),
    };
  }

  /**
   * 아이템 추가 이벤트 생성
   */
  createItemAddedEvent(): {
    type: "ITEM_ADDED";
    cartId: string;
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
    timestamp: Date;
  } {
    return {
      type: "ITEM_ADDED",
      cartId: this.cartId,
      productId: this.productId,
      quantity: this.quantity,
      price: this.price,
      subtotal: this.getSubtotal(),
      timestamp: new Date(),
    };
  }

  // ========================================
  // Comparison Methods
  // ========================================

  /**
   * 다른 CartItem과 동일한지 비교
   */
  equals(other: CartItem): boolean {
    return (
      this.cartId === other.cartId &&
      this.productId === other.productId &&
      this.quantity === other.quantity &&
      this.price === other.price
    );
  }

  /**
   * 복사본 생성 (불변성 보장용)
   */
  clone(): CartItem {
    return new CartItem({
      id: this.id,
      cartId: this.cartId,
      productId: this.productId,
      quantity: this.quantity,
      price: this.price,
      addedAt: new Date(this.addedAt),
    });
  }

  // ========================================
  // Static Factory Methods
  // ========================================

  /**
   * 새로운 CartItem 생성 (ID 없음)
   */
  static create(data: Omit<CartItemData, "id" | "addedAt">): CartItem {
    return new CartItem({
      ...data,
      addedAt: new Date(),
    });
  }

  /**
   * 기존 데이터로부터 CartItem 복원
   */
  static fromData(data: CartItemData): CartItem {
    return new CartItem(data);
  }
}
