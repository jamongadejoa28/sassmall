// ========================================
// Order Entity - 주문 엔티티
// order-service/src/entities/Order.ts
// ========================================

import { OrderStatus, canTransitionToStatus } from './OrderStatus';
import { OrderItem, CreateOrderItemData } from './OrderItem';

export interface CreateOrderData {
  userId: string;
  items: CreateOrderItemData[];
  shippingAddress: {
    postalCode: string;
    address: string;
    detailAddress?: string;
    recipientName: string;
    recipientPhone: string;
  };
  paymentMethod: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';
  memo?: string;
}

export interface OrderSummary {
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
}

export class Order {
  public id?: string;
  public orderNumber?: string;
  public userId: string;
  public status: OrderStatus;
  public items: OrderItem[];
  public shippingAddress: {
    postalCode: string;
    address: string;
    detailAddress?: string;
    recipientName: string;
    recipientPhone: string;
  };
  public paymentMethod: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';
  public paymentId?: string;
  public memo?: string;
  public subtotal: number;
  public shippingFee: number;
  public totalAmount: number;
  public orderedAt: Date;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: CreateOrderData) {
    this.validateInput(data);

    this.userId = data.userId;
    this.status = OrderStatus.PENDING;
    this.items = data.items.map(item => new OrderItem(item));
    this.shippingAddress = { ...data.shippingAddress };
    this.paymentMethod = data.paymentMethod;
    this.memo = data.memo?.trim();

    // 주문 금액 계산
    const summary = this.calculateOrderSummary();
    this.subtotal = summary.subtotal;
    this.shippingFee = summary.shippingFee;
    this.totalAmount = summary.totalAmount;

    const now = new Date();
    this.orderedAt = now;
    this.createdAt = now;
    this.updatedAt = now;
  }

  // 입력 데이터 유효성 검증
  private validateInput(data: CreateOrderData): void {
    if (!data.userId || data.userId.trim().length === 0) {
      throw new Error('사용자 ID는 필수 항목입니다');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('주문 항목은 최소 1개 이상이어야 합니다');
    }

    if (data.items.length > 100) {
      throw new Error('주문 항목은 100개를 초과할 수 없습니다');
    }

    this.validateShippingAddress(data.shippingAddress);
  }

  // 배송 주소 유효성 검증
  private validateShippingAddress(address: CreateOrderData['shippingAddress']): void {
    if (!address.postalCode || !/^\d{5}$/.test(address.postalCode)) {
      throw new Error('올바른 우편번호를 입력해주세요 (5자리 숫자)');
    }

    if (!address.address || address.address.trim().length === 0) {
      throw new Error('주소는 필수 항목입니다');
    }

    if (!address.recipientName || address.recipientName.trim().length === 0) {
      throw new Error('수령인 이름은 필수 항목입니다');
    }

    if (!address.recipientPhone || !/^010\d{8}$/.test(address.recipientPhone.replace(/[-\s]/g, ''))) {
      throw new Error('올바른 휴대폰 번호를 입력해주세요');
    }
  }

  // 주문 금액 계산
  private calculateOrderSummary(): OrderSummary {
    const subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // 배송비 계산 로직 (5만원 이상 무료배송)
    const shippingFee = subtotal >= 50000 ? 0 : 3000;
    const totalAmount = subtotal + shippingFee;

    return {
      subtotal,
      shippingFee,
      totalAmount,
      itemCount
    };
  }

  // 주문 상태 변경
  public updateStatus(newStatus: OrderStatus): void {
    if (!canTransitionToStatus(this.status, newStatus)) {
      throw new Error(`${this.status}에서 ${newStatus}로 상태 변경이 불가능합니다`);
    }

    this.status = newStatus;
    this.updatedAt = new Date();
  }

  // 결제 ID 설정
  public setPaymentId(paymentId: string): void {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new Error('결제 ID는 필수 항목입니다');
    }

    this.paymentId = paymentId.trim();
    this.updatedAt = new Date();
  }

  // 주문 번호 생성 (YYYYMMDD + 8자리 랜덤)
  public generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0');
    
    const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    this.orderNumber = `ORD${dateStr}${randomStr}`;
    this.updatedAt = new Date();
    
    return this.orderNumber;
  }

  // 주문 취소 가능 여부 확인
  public canBeCancelled(): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.PAYMENT_IN_PROGRESS,
      OrderStatus.PAYMENT_FAILED
    ].includes(this.status);
  }

  // 환불 가능 여부 확인
  public canBeRefunded(): boolean {
    return [
      OrderStatus.PAYMENT_COMPLETED,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING_SHIPMENT,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED
    ].includes(this.status);
  }

  // 주문 요약 정보 조회
  public getOrderSummary(): OrderSummary {
    return {
      subtotal: this.subtotal,
      shippingFee: this.shippingFee,
      totalAmount: this.totalAmount,
      itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  // JSON 직렬화
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      userId: this.userId,
      status: this.status,
      items: this.items.map(item => item.toJSON()),
      shippingAddress: this.shippingAddress,
      paymentMethod: this.paymentMethod,
      paymentId: this.paymentId,
      memo: this.memo,
      subtotal: this.subtotal,
      shippingFee: this.shippingFee,
      totalAmount: this.totalAmount,
      orderedAt: this.orderedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // 장바구니에서 주문으로 변환하는 정적 팩토리 메서드
  static fromCart(
    userId: string,
    cartItems: Array<{
      productId: string;
      productName: string;
      productPrice: number;
      quantity: number;
      productImageUrl?: string;
      productOptions?: Record<string, any>;
    }>,
    shippingInfo: CreateOrderData['shippingAddress'],
    paymentMethod: CreateOrderData['paymentMethod'],
    memo?: string
  ): Order {
    return new Order({
      userId,
      items: cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        productImageUrl: item.productImageUrl,
        productOptions: item.productOptions
      })),
      shippingAddress: shippingInfo,
      paymentMethod,
      memo
    });
  }
}