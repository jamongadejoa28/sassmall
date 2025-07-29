// ========================================
// Payment Repository Interface - 결제 리포지토리 인터페이스
// order-service/src/adapters/PaymentRepository.ts
// ========================================

import { Payment } from '../entities/Payment';

export interface PaymentRepository {
  // 결제 저장
  save(payment: Payment): Promise<Payment>;
  
  // ID로 결제 조회
  findById(id: string): Promise<Payment | null>;
  
  // 결제 ID로 조회 (외부 결제 시스템 ID)
  findByPaymentId(paymentId: string): Promise<Payment | null>;
  
  // 주문 ID로 결제 조회
  findByOrderId(orderId: string): Promise<Payment[]>;
  
  // 결제 상태로 조회
  findByStatus(status: string): Promise<Payment[]>;
  
  // 결제 삭제
  delete(id: string): Promise<void>;
  
  // 결제 업데이트
  update(id: string, updates: Partial<Payment>): Promise<Payment>;
  
  // 특정 기간 결제 조회
  findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]>;
}