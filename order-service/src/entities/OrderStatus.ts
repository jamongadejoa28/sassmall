// ========================================
// OrderStatus Enum - 주문 상태 정의
// order-service/src/entities/OrderStatus.ts
// ========================================

export enum OrderStatus {
  // 주문 대기 (장바구니에서 주문으로 변환됨)
  PENDING = 'PENDING',
  
  // 결제 진행 중
  PAYMENT_IN_PROGRESS = 'PAYMENT_IN_PROGRESS',
  
  // 결제 완료
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  
  // 결제 실패
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // 주문 확인 완료 (재고 차감 완료)
  CONFIRMED = 'CONFIRMED',
  
  // 배송 준비
  PREPARING_SHIPMENT = 'PREPARING_SHIPMENT',
  
  // 배송 중
  SHIPPING = 'SHIPPING',
  
  // 배송 완료
  DELIVERED = 'DELIVERED',
  
  // 주문 취소
  CANCELLED = 'CANCELLED',
  
  // 환불 처리 중
  REFUND_IN_PROGRESS = 'REFUND_IN_PROGRESS',
  
  // 환불 완료
  REFUNDED = 'REFUNDED'
}

// 주문 상태 변경 가능한 경로 정의
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAYMENT_IN_PROGRESS,
    OrderStatus.CANCELLED
  ],
  [OrderStatus.PAYMENT_IN_PROGRESS]: [
    OrderStatus.PAYMENT_COMPLETED,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED
  ],
  [OrderStatus.PAYMENT_COMPLETED]: [
    OrderStatus.CONFIRMED,
    OrderStatus.REFUND_IN_PROGRESS
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAYMENT_IN_PROGRESS,
    OrderStatus.CANCELLED
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PREPARING_SHIPMENT,
    OrderStatus.REFUND_IN_PROGRESS
  ],
  [OrderStatus.PREPARING_SHIPMENT]: [
    OrderStatus.SHIPPING,
    OrderStatus.REFUND_IN_PROGRESS
  ],
  [OrderStatus.SHIPPING]: [
    OrderStatus.DELIVERED,
    OrderStatus.REFUND_IN_PROGRESS
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.REFUND_IN_PROGRESS
  ],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUND_IN_PROGRESS]: [
    OrderStatus.REFUNDED
  ],
  [OrderStatus.REFUNDED]: []
};

// 주문 상태 검증 함수
export function canTransitionToStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  return ORDER_STATUS_TRANSITIONS[currentStatus].includes(targetStatus);
}

// 주문 상태 한글 표시명
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
  [OrderStatus.REFUNDED]: '환불 완료'
};