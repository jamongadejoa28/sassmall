// ========================================
// Order Repository Interface - 주문 리포지토리 인터페이스
// order-service/src/adapters/OrderRepository.ts
// ========================================

import { Order } from '../entities/Order';
import { OrderStatus } from '../entities/OrderStatus';

export interface OrderSearchCriteria {
  userId?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AdminOrderSearchCriteria {
  search?: string; // 주문번호, 사용자명, 이메일 검색
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'orderedAt' | 'totalAmount' | 'status' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderRepository {
  // 주문 저장
  save(order: Order): Promise<Order>;
  
  // ID로 주문 조회
  findById(id: string): Promise<Order | null>;
  
  // 주문번호로 조회
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
  
  // 사용자 ID로 주문 조회
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Order[]>;
  
  // 주문 상태로 조회
  findByStatus(status: OrderStatus): Promise<Order[]>;
  
  // 조건별 주문 검색
  findByQuery(criteria: OrderSearchCriteria): Promise<Order[]>;
  
  // 주문 삭제
  delete(id: string): Promise<void>;
  
  // 주문 업데이트
  update(id: string, updates: Partial<Order>): Promise<Order>;
  
  // 주문 개수 조회
  count(criteria?: OrderSearchCriteria): Promise<number>;
  
  // 특정 기간 주문 조회
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  
  // 주문 상태 벌크 업데이트
  updateStatusBulk(orderIds: string[], status: OrderStatus): Promise<void>;
  
  // Admin 전용 메서드
  // 관리자용 주문 목록 조회 (페이징, 검색, 필터링)
  findManyForAdmin(criteria: AdminOrderSearchCriteria): Promise<{ orders: Order[]; total: number }>;
  
  // 주문 통계 조회
  getOrderStatistics(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersToday: number;
    revenueToday: number;
    ordersThisWeek: number;
    revenueThisWeek: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    statusCounts: Record<string, number>;
    averageOrderValue: number;
  }>;
}