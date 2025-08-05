import { Product } from './product';

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_IN_PROGRESS = 'PAYMENT_IN_PROGRESS',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CONFIRMED = 'CONFIRMED',
  PREPARING_SHIPMENT = 'PREPARING_SHIPMENT',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUND_IN_PROGRESS = 'REFUND_IN_PROGRESS',
  REFUNDED = 'REFUNDED',
}

// 클라이언트에서 사용할 상태 표시명 매핑
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '주문 대기',
  [OrderStatus.PAYMENT_IN_PROGRESS]: '결제 진행 중',
  [OrderStatus.PAYMENT_COMPLETED]: '결제 완료',
  [OrderStatus.PAYMENT_FAILED]: '결제 실패',
  [OrderStatus.CONFIRMED]: '주문 확인',
  [OrderStatus.PREPARING_SHIPMENT]: '배송 준비',
  [OrderStatus.SHIPPING]: '배송 중',
  [OrderStatus.DELIVERED]: '배송 완료',
  [OrderStatus.CANCELLED]: '주문 취소',
  [OrderStatus.REFUND_IN_PROGRESS]: '환불 처리 중',
  [OrderStatus.REFUNDED]: '환불 완료',
};

// 기존 UI에서 사용하던 간소화된 상태를 위한 매핑 함수
export const getSimplifiedOrderStatus = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return 'pending';
    case OrderStatus.PAYMENT_IN_PROGRESS:
    case OrderStatus.PAYMENT_COMPLETED:
    case OrderStatus.CONFIRMED:
      return 'paid';
    case OrderStatus.PREPARING_SHIPMENT:
    case OrderStatus.SHIPPING:
      return 'shipped';
    case OrderStatus.DELIVERED:
      return 'delivered';
    case OrderStatus.CANCELLED:
    case OrderStatus.PAYMENT_FAILED:
    case OrderStatus.REFUND_IN_PROGRESS:
    case OrderStatus.REFUNDED:
      return 'cancelled';
    default:
      return 'pending';
  }
};

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
}
