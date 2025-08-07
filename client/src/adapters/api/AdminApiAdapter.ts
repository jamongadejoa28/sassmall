// AdminApiAdapter - 관리자 대시보드 API 연동
// Clean Architecture: API Adapters Layer

import { apiClient } from '../../shared/utils/api';
import { API_ENDPOINTS } from '../../shared/constants/api';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 대시보드 통계 데이터 타입
export interface DashboardStats {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    customerCount: number;
    adminCount: number;
    newUsersThisMonth: number;
    newUsersToday: number;
  };
  productStats: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    totalCategories: number;
    productsAddedToday: number;
  };
  orderStats: {
    totalOrders: number;
    totalRevenue: number;
    ordersToday: number;
    averageOrderValue: number;
  };
}

// 주문 통계 응답 타입
export interface OrderStatsResponse {
  totalOrders: number;
  totalRevenue: number;
  ordersToday: number;
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    ordersToday: number;
  };
}

// 주문 목록 응답 타입
export interface AdminOrdersResponse {
  orders: Array<{
    id: string;
    userId: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AdminApiAdapter {
  // 대시보드 통계 데이터 조회
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // 모든 통계 API를 병렬로 호출
      const [userStatsResponse, productStatsResponse, orderStatsResponse] =
        await Promise.all([
          apiClient.get<ApiResponse>(API_ENDPOINTS.ADMIN.USER_STATS),
          apiClient.get<ApiResponse>('/products/stats'), // 관리자 전용 상품 통계
          apiClient.get<ApiResponse>('/orders/stats'), // 관리자 전용 주문 통계
        ]);

      return {
        userStats: userStatsResponse.data.data,
        productStats: productStatsResponse.data.data || {
          totalProducts: 0,
          activeProducts: 0,
          inactiveProducts: 0,
          totalCategories: 0,
          productsAddedToday: 0,
        },
        orderStats: orderStatsResponse.data.data || {
          totalOrders: 0,
          totalRevenue: 0,
          ordersToday: 0,
          averageOrderValue: 0,
        },
      };
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '대시보드 통계 조회에 실패했습니다.'
      );
    }
  }

  // 관리자용 주문 목록 조회
  async getAdminOrders(options?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<AdminOrdersResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.status) params.append('status', options.status);
      if (options?.search) params.append('search', options.search);

      const response = await apiClient.get<ApiResponse<AdminOrdersResponse>>(
        `/orders?${params.toString()}`
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Admin orders error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '주문 목록 조회에 실패했습니다.'
      );
    }
  }

  // 주문 상태 업데이트
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      await apiClient.patch<ApiResponse>(`/orders/${orderId}/status`, {
        status,
      });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '주문 상태 업데이트에 실패했습니다.'
      );
    }
  }

  // Q&A 목록 조회 - 실제 백엔드 API 호출
  async getProductQnAList(options?: {
    page?: number;
    limit?: number;
    answered?: boolean;
    status?: 'all' | 'answered' | 'unanswered';
    search?: string;
    productId?: string;
    sortBy?: 'newest' | 'oldest' | 'urgent' | 'responseTime';
  }): Promise<{
    qnas: Array<{
      id: string;
      productId: string;
      productName: string;
      userName: string;
      question: string;
      answer?: string;
      isAnswered: boolean;
      answeredBy?: string;
      answeredAt?: Date;
      isPublic: boolean;
      responseTimeHours?: number;
      isUrgent: boolean;
      hasQualityAnswer: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    statistics: {
      totalQuestions: number;
      answeredQuestions: number;
      unansweredQuestions: number;
      averageResponseTimeHours: number;
      urgentQuestions: number;
      todayQuestions: number;
      qualityAnswers: number;
    };
  }> {
    try {
      const params = new URLSearchParams();

      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.search) params.append('search', options.search);
      if (options?.productId) params.append('productId', options.productId);
      if (options?.sortBy) params.append('sortBy', options.sortBy);

      // status 파라미터 처리 - 우선순위: status > answered
      if (options?.status && options.status !== 'all') {
        params.append('status', options.status);
      } else if (options?.answered !== undefined) {
        const status = options.answered ? 'answered' : 'unanswered';
        params.append('status', status);
      }

      const response = await apiClient.get<
        ApiResponse<{
          qnas: Array<{
            id: string;
            productId: string;
            productName: string;
            userName: string;
            question: string;
            answer?: string;
            isAnswered: boolean;
            answeredBy?: string;
            answeredAt?: string;
            isPublic: boolean;
            responseTimeHours?: number;
            isUrgent: boolean;
            hasQualityAnswer: boolean;
            createdAt: string;
            updatedAt: string;
          }>;
          pagination: {
            currentPage: number;
            totalPages: number;
            totalCount: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          statistics: {
            totalQuestions: number;
            answeredQuestions: number;
            unansweredQuestions: number;
            averageResponseTimeHours: number;
            urgentQuestions: number;
            todayQuestions: number;
            qualityAnswers: number;
          };
        }>
      >(
        `/products/qna/admin${params.toString() ? `?${params.toString()}` : ''}`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error ||
            response.data.message ||
            'Q&A 목록 조회에 실패했습니다.'
        );
      }

      const data = response.data.data!;

      // 날짜 문자열을 Date 객체로 변환
      const qnas = data.qnas.map(qna => ({
        ...qna,
        answeredAt: qna.answeredAt ? new Date(qna.answeredAt) : undefined,
        createdAt: new Date(qna.createdAt),
        updatedAt: new Date(qna.updatedAt),
      }));

      return {
        qnas,
        pagination: data.pagination,
        statistics: data.statistics,
      };
    } catch (error: any) {
      console.error('Q&A list error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Q&A 목록 조회에 실패했습니다.');
    }
  }

  // Q&A 답변 작성
  async answerProductQnA(
    qnaId: string,
    answer: string,
    answeredBy?: string
  ): Promise<void> {
    try {
      await apiClient.put<ApiResponse>(`/qna/${qnaId}/answer`, {
        answer,
        answeredBy: answeredBy || '관리자', // 기본값으로 '관리자' 설정
      });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Q&A 답변 작성에 실패했습니다.'
      );
    }
  }
}
