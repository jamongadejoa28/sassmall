// ========================================
// Payment Adapter Interface - 결제 어댑터 인터페이스
// order-service/src/adapters/PaymentAdapter.ts
// ========================================

import { PaymentResult } from '../entities/Payment';

export interface PaymentRequest {
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  productName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

export interface PaymentApprovalRequest {
  paymentKey: string;
  orderId: string;
  amount?: number;
  userId: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // 부분 환불용, 없으면 전액 환불
  reason?: string;
}

export interface PaymentAdapter {
  // 결제 요청 (결제 페이지 URL 반환)
  requestPayment(request: PaymentRequest): Promise<PaymentResult>;
  
  // 결제 승인 (사용자가 결제 완료 후 호출)
  approvePayment(request: PaymentApprovalRequest): Promise<PaymentResult>;
  
  // 결제 상태 조회
  getPaymentStatus(paymentId: string): Promise<PaymentResult>;
  
  // 결제 취소/환불
  refundPayment(request: RefundRequest): Promise<PaymentResult>;
}