// ========================================
// OrderItem Entity - 주문 항목 엔티티
// order-service/src/entities/OrderItem.ts
// ========================================

export interface CreateOrderItemData {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  productImageUrl?: string;
  productOptions?: Record<string, any>;
}

export class OrderItem {
  public id?: string;
  public orderId?: string;
  public productId: string;
  public productName: string;
  public productPrice: number;
  public quantity: number;
  public totalPrice: number;
  public productImageUrl?: string;
  public productOptions?: Record<string, any>;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: CreateOrderItemData) {
    this.validateInput(data);

    this.productId = data.productId;
    this.productName = data.productName.trim();
    this.productPrice = data.productPrice;
    this.quantity = data.quantity;
    this.totalPrice = this.calculateTotalPrice();
    this.productImageUrl = data.productImageUrl;
    this.productOptions = data.productOptions;

    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  // 입력 데이터 유효성 검증
  private validateInput(data: CreateOrderItemData): void {
    if (!data.productId || data.productId.trim().length === 0) {
      throw new Error('상품 ID는 필수 항목입니다');
    }

    if (!data.productName || data.productName.trim().length === 0) {
      throw new Error('상품명은 필수 항목입니다');
    }

    if (data.productPrice <= 0) {
      throw new Error('상품 가격은 0보다 커야 합니다');
    }

    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      throw new Error('수량은 1 이상의 정수여야 합니다');
    }

    if (data.quantity > 999) {
      throw new Error('수량은 999개를 초과할 수 없습니다');
    }
  }

  // 총 가격 계산
  private calculateTotalPrice(): number {
    return this.productPrice * this.quantity;
  }

  // 수량 업데이트
  public updateQuantity(newQuantity: number): void {
    if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
      throw new Error('수량은 1 이상의 정수여야 합니다');
    }

    if (newQuantity > 999) {
      throw new Error('수량은 999개를 초과할 수 없습니다');
    }

    this.quantity = newQuantity;
    this.totalPrice = this.calculateTotalPrice();
    this.updatedAt = new Date();
  }

  // 상품 가격 업데이트 (가격 변동 시)
  public updateProductPrice(newPrice: number): void {
    if (newPrice <= 0) {
      throw new Error('상품 가격은 0보다 커야 합니다');
    }

    this.productPrice = newPrice;
    this.totalPrice = this.calculateTotalPrice();
    this.updatedAt = new Date();
  }

  // JSON 직렬화
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      orderId: this.orderId,
      productId: this.productId,
      productName: this.productName,
      productPrice: this.productPrice,
      quantity: this.quantity,
      totalPrice: this.totalPrice,
      productImageUrl: this.productImageUrl,
      productOptions: this.productOptions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // 장바구니 아이템에서 주문 아이템으로 변환하는 정적 팩토리 메서드
  static fromCartItem(cartItem: {
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    productImageUrl?: string;
    productOptions?: Record<string, any>;
  }): OrderItem {
    return new OrderItem({
      productId: cartItem.productId,
      productName: cartItem.productName,
      productPrice: cartItem.productPrice,
      quantity: cartItem.quantity,
      productImageUrl: cartItem.productImageUrl,
      productOptions: cartItem.productOptions
    });
  }
}