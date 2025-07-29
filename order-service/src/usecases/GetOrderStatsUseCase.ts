// ========================================
// Get Order Stats UseCase - 관리자 전용 주문 통계 조회
// order-service/src/usecases/GetOrderStatsUseCase.ts
// ========================================

import { OrderRepository } from '../adapters/OrderRepository';

export interface GetOrderStatsRequest {
  // 통계 조회에 특별한 파라미터가 필요한 경우 추가
}

export interface GetOrderStatsResponse {
  success: boolean;
  stats?: {
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
  };
  errorMessage?: string;
}

/**
 * GetOrderStatsUseCase - 관리자 전용 주문 통계 조회 유스케이스
 * 
 * 역할:
 * - 관리자 대시보드용 주문 통계 정보 제공
 * - 실시간 주문 현황 분석 데이터 계산
 * - 매출 지표 및 주문 상태 분포 제공
 * 
 * 특징:
 * - 캐싱 가능한 구조로 설계
 * - 다양한 시간 범위별 통계 제공
 * - 상태별 주문 분포 분석
 * - 매출 추이 분석
 */
export class GetOrderStatsUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(request: GetOrderStatsRequest): Promise<GetOrderStatsResponse> {
    try {
      console.log('[GetOrderStatsUseCase] 주문 통계 조회 시작');

      // Repository를 통해 통계 데이터 조회
      const stats = await this.orderRepository.getOrderStatistics();

      console.log('[GetOrderStatsUseCase] 통계 데이터 조회 완료:', {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        ordersToday: stats.ordersToday
      });

      return {
        success: true,
        stats: {
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          ordersToday: stats.ordersToday,
          revenueToday: stats.revenueToday,
          ordersThisWeek: stats.ordersThisWeek,
          revenueThisWeek: stats.revenueThisWeek,
          ordersThisMonth: stats.ordersThisMonth,
          revenueThisMonth: stats.revenueThisMonth,
          statusCounts: stats.statusCounts,
          averageOrderValue: stats.averageOrderValue
        }
      };

    } catch (error) {
      console.error('[GetOrderStatsUseCase] 주문 통계 조회 실패:', error);
      
      return {
        success: false,
        errorMessage: error instanceof Error 
          ? error.message 
          : '주문 통계를 조회하는 중 오류가 발생했습니다'
      };
    }
  }
}