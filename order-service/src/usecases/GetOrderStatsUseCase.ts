// ========================================
// Get Order Stats UseCase - 관리자 전용 주문 통계 조회
// order-service/src/usecases/GetOrderStatsUseCase.ts
// ========================================

import { OrderRepository } from '../adapters/OrderRepository';

export interface GetOrderStatsRequest {
  // 통계 조회에 특별한 파라미터가 필요한 경우 추가
}

export interface GetRevenueChartRequest {
  period: 'week' | 'month' | '3months' | '6months' | 'year';
  timezone?: string;
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

export interface GetRevenueChartResponse {
  success: boolean;
  chartData?: {
    labels: string[];
    revenues: number[];
    orders: number[];
    period: string;
    totalRevenue: number;
    totalOrders: number;
    averageRevenue: number;
    growthRate?: number;
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

  /**
   * 매출 추이 차트 데이터 조회
   * - 시계열 매출 데이터 제공
   * - 다양한 기간별 차트 데이터
   */
  async getRevenueChart(request: GetRevenueChartRequest): Promise<GetRevenueChartResponse> {
    try {
      console.log('[GetOrderStatsUseCase] 매출 차트 데이터 조회 시작:', request.period);

      // Repository를 통해 시계열 매출 데이터 조회
      const chartData = await this.orderRepository.getRevenueChartData(request.period, request.timezone);

      console.log('[GetOrderStatsUseCase] 차트 데이터 조회 완료:', {
        dataPoints: chartData.labels.length,
        totalRevenue: chartData.totalRevenue,
        period: request.period
      });

      return {
        success: true,
        chartData
      };

    } catch (error) {
      console.error('[GetOrderStatsUseCase] 매출 차트 데이터 조회 실패:', error);
      
      return {
        success: false,
        errorMessage: error instanceof Error 
          ? error.message 
          : '매출 차트 데이터를 조회하는 중 오류가 발생했습니다'
      };
    }
  }
}