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

  // Product Q&A 목록 조회 (문의관리용)
  async getProductQnAList(options?: {
    page?: number;
    limit?: number;
    answered?: boolean;
    search?: string;
  }): Promise<{
    qnas: Array<{
      id: string;
      productId: string;
      productName?: string;
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
    };
  }> {
    try {
      // 실제로는 모든 상품의 Q&A를 조회하는 전용 관리자 API가 필요하지만,
      // 현재는 개별 상품의 Q&A API를 활용하여 구현
      // 우선 상품 목록을 가져온 다음, 각 상품의 Q&A를 조회하는 방식으로 구현

      // 먼저 상품 목록 조회
      const productsResponse =
        await apiClient.get<ApiResponse>('/products?limit=50');
      const products = productsResponse.data.data?.products || [];

      let allQnas: any[] = [];
      let totalQuestions = 0;
      let answeredQuestions = 0;
      let unansweredQuestions = 0;
      let responseTimeSum = 0;
      let responseTimeCount = 0;

      // 각 상품의 Q&A 조회
      for (const product of products.slice(0, 10)) {
        // 성능을 위해 처음 10개 상품만
        try {
          const params = new URLSearchParams();
          params.append('page', '1');
          params.append('limit', '20');
          params.append('includePrivate', 'true'); // 관리자이므로 비공개 Q&A도 포함

          if (options?.answered !== undefined) {
            params.append('onlyAnswered', options.answered.toString());
          }

          const qnaResponse = await apiClient.get<ApiResponse>(
            `/products/${product.id}/qna?${params.toString()}`
          );

          if (qnaResponse.data.success && qnaResponse.data.data) {
            const productQnas = qnaResponse.data.data.qnas.map((qna: any) => ({
              ...qna,
              productId: product.id,
              productName: product.name,
            }));

            allQnas = [...allQnas, ...productQnas];

            // 통계 집계
            const stats = qnaResponse.data.data.statistics;
            totalQuestions += stats.totalQuestions;
            answeredQuestions += stats.answeredQuestions;
            unansweredQuestions += stats.unansweredQuestions;

            if (stats.averageResponseTimeHours > 0) {
              responseTimeSum +=
                stats.averageResponseTimeHours * stats.answeredQuestions;
              responseTimeCount += stats.answeredQuestions;
            }
          }
        } catch (productQnaError) {
          // 개별 상품 Q&A 조회 실패는 무시하고 계속 진행
          console.warn(
            `Failed to fetch Q&A for product ${product.id}:`,
            productQnaError
          );
        }
      }

      // 검색 필터링
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        allQnas = allQnas.filter(
          qna =>
            qna.question.toLowerCase().includes(searchLower) ||
            qna.userName.toLowerCase().includes(searchLower) ||
            (qna.productName &&
              qna.productName.toLowerCase().includes(searchLower)) ||
            (qna.answer && qna.answer.toLowerCase().includes(searchLower))
        );
      }

      // 정렬 (최신순)
      allQnas.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 페이지네이션 적용
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedQnas = allQnas.slice(startIndex, endIndex);

      const totalCount = allQnas.length;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        qnas: paginatedQnas,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        statistics: {
          totalQuestions,
          answeredQuestions,
          unansweredQuestions,
          averageResponseTimeHours:
            responseTimeCount > 0 ? responseTimeSum / responseTimeCount : 0,
        },
      };
    } catch (error: any) {
      console.error('Product QnA list error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '문의 목록 조회에 실패했습니다.'
      );
    }
  }

  // Q&A 답변 작성
  async answerProductQnA(qnaId: string, answer: string): Promise<void> {
    try {
      await apiClient.put<ApiResponse>(`/qna/${qnaId}/answer`, { answer });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Q&A 답변 작성에 실패했습니다.'
      );
    }
  }
}
