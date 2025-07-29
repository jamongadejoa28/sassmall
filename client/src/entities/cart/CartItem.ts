export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  availableQuantity: number;
}

export class CartItem {
  public readonly productId: string;
  public readonly productName: string;
  public readonly price: number;
  private _quantity: number;
  private _availableQuantity: number;

  constructor(product: ProductInfo, quantity: number) {
    this.validateInput(product, quantity);

    this.productId = product.id;
    this.productName = product.name;
    this.price = product.price;
    this._quantity = quantity;
    this._availableQuantity = product.availableQuantity;

    this.validateStock();
  }

  // ========================================
  // Getters
  // ========================================

  get quantity(): number {
    return this._quantity;
  }

  get availableQuantity(): number {
    return this._availableQuantity;
  }

  get totalPrice(): number {
    return this.price * this._quantity;
  }

  // ========================================
  // 비즈니스 로직
  // ========================================

  /**
   * 수량 변경
   */
  updateQuantity(newQuantity: number): void {
    this.validateQuantity(newQuantity);

    if (newQuantity > this._availableQuantity) {
      throw new Error('재고가 부족합니다');
    }

    this._quantity = newQuantity;
  }

  /**
   * 수량 증가
   */
  increaseQuantity(amount: number = 1): void {
    this.updateQuantity(this._quantity + amount);
  }

  /**
   * 재고 수량 업데이트 (상품 정보 변경 시)
   */
  updateAvailableQuantity(newAvailableQuantity: number): void {
    if (newAvailableQuantity < 0) {
      throw new Error('재고 수량은 0 이상이어야 합니다');
    }

    this._availableQuantity = newAvailableQuantity;

    // 현재 장바구니 수량이 새로운 재고보다 많으면 조정
    if (this._quantity > newAvailableQuantity) {
      this._quantity = newAvailableQuantity;
    }
  }

  /**
   * 재고 충분 여부 확인
   */
  isStockSufficient(): boolean {
    return this._quantity <= this._availableQuantity;
  }

  // ========================================
  // 유효성 검증
  // ========================================

  private validateInput(product: ProductInfo, quantity: number): void {
    if (!product.id || product.id.trim() === '') {
      throw new Error('상품 ID는 필수입니다');
    }

    if (!product.name || product.name.trim() === '') {
      throw new Error('상품명은 필수입니다');
    }

    if (product.price < 0) {
      throw new Error('상품 가격은 0 이상이어야 합니다');
    }

    if (product.availableQuantity < 0) {
      throw new Error('재고 수량은 0 이상이어야 합니다');
    }

    this.validateQuantity(quantity);
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('수량은 1 이상이어야 합니다');
    }
  }

  private validateStock(): void {
    if (this._quantity > this._availableQuantity) {
      throw new Error('재고가 부족합니다');
    }
  }

  // ========================================
  // 직렬화
  // ========================================

  toJSON() {
    return {
      productId: this.productId,
      productName: this.productName,
      price: this.price,
      quantity: this._quantity,
      availableQuantity: this._availableQuantity,
      totalPrice: this.totalPrice,
    };
  }

  static fromJSON(data: any): CartItem {
    const product: ProductInfo = {
      id: data.productId,
      name: data.productName,
      price: data.price,
      availableQuantity: data.availableQuantity,
    };

    return new CartItem(product, data.quantity);
  }
}
