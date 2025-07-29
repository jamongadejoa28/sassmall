import { apiClient } from '../../shared/utils/api';
import { ApiResponse } from '../../shared/types';

interface CreateOrderRequest {
  cartItems: Array<{
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    productImageUrl?: string;
    productOptions?: Record<string, any>;
  }>;
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

interface OrderResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  order?: any;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    totalPrice: number;
    productImageUrl?: string;
    productOptions?: Record<string, any>;
  }>;
  shippingAddress: {
    postalCode: string;
    address: string;
    detailAddress?: string;
    recipientName: string;
    recipientPhone: string;
  };
  paymentMethod: string;
  paymentId?: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  memo?: string;
  orderedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentRequest {
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

interface PaymentResponse {
  paymentId: string;
  redirectUrl: string;
  orderInfo: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  };
}

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
}

// 통합된 apiClient 사용 - 인터셉터는 shared/utils/api.ts에서 관리됨

export class OrderApiAdapter {
  // 토큰 관리는 apiClient의 인터셉터에서 자동 처리됨

  // 주문 생성
  async createOrder(
    data: CreateOrderRequest
  ): Promise<ApiResponse<OrderResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<OrderResponse>>(
        '/orders',
        data
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Order creation failed: ${error.response.status}`);
      }

      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          `경로를 찾을 수 없습니다: ${error.config?.url || '/orders'}`
      );
    }
  }

  // 주문 상세 조회
  async getOrder(
    orderId: string
  ): Promise<ApiResponse<{ order: OrderDetails }>> {
    try {
      const response = await apiClient.get<
        ApiResponse<{ order: OrderDetails }>
      >(`/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Order fetch failed: ${error.response.status}`);
      }
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '주문 정보를 조회하는 중에 문제가 발생했습니다.'
      );
    }
  }

  // 내 주문 목록 조회
  async getMyOrders(
    limit: number = 20,
    offset: number = 0
  ): Promise<
    ApiResponse<{
      orders: OrderDetails[];
      totalCount: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>
  > {
    try {
      const response = await apiClient.get('/orders/my-orders', {
        params: { limit, offset },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Orders list fetch failed: ${error.response.status}`);
      }
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '주문 목록을 조회하는 중에 문제가 발생했습니다.'
      );
    }
  }

  // 주문 취소
  async cancelOrder(
    orderId: string,
    reason: string
  ): Promise<
    ApiResponse<{
      order: OrderDetails;
      refundInfo?: any;
    }>
  > {
    try {
      const response = await apiClient.post(`/orders/${orderId}/cancel`, {
        reason,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Order cancellation failed: ${error.response.status}`);
      }
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '주문을 취소하는 중에 문제가 발생했습니다.'
      );
    }
  }

  // 결제 요청
  async requestPayment(
    orderId: string,
    paymentData: PaymentRequest
  ): Promise<ApiResponse<PaymentResponse>> {
    try {
      const response = await apiClient.post(
        `/orders/${orderId}/payment/request`,
        paymentData
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Payment request failed: ${error.response.status}`);
      }
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '결제를 요청하는 중에 문제가 발생했습니다.'
      );
    }
  }

  // 결제 승인 (TossPayments 콜백 처리)
  async approvePayment(
    paymentKey: string,
    orderId: string,
    amount?: number
  ): Promise<
    ApiResponse<{
      paymentKey: string;
      orderId: string;
      paymentInfo: any;
      orderNumber?: string;
      totalAmount?: number;
    }>
  > {
    try {
      const requestBody: Record<string, any> = { paymentKey, orderId };
      if (amount) {
        requestBody.amount = amount;
      }

      const response = await apiClient.post(
        '/orders/payment/approve',
        requestBody
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Payment approval failed: ${error.response.status}`);
      }
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '결제 승인 처리 중에 문제가 발생했습니다.'
      );
    }
  }

  // 주문 요약 정보 조회
  async getOrderSummary(orderId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/orders/${orderId}/summary`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Order summary fetch failed: ${error.response.status}`);
      }
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '주문 요약 정보를 조회하는 중에 문제가 발생했습니다.'
      );
    }
  }

  // 결제 상태 확인 (폴링용)
  async checkPaymentStatus(
    orderId: string
  ): Promise<ApiResponse<{ status: string; paymentInfo?: any }>> {
    try {
      const response = await apiClient.get(
        `/orders/${orderId}/payment/status`,
        {
          timeout: 10000, // 상태 확인은 짧은 타임아웃
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('결제 상태 확인 실패:', error);
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          '결제 상태를 확인할 수 없습니다.'
      );
    }
  }

  // 헬스체크 (연결 상태 확인)
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Export types for use in components
export type {
  CreateOrderRequest,
  OrderResponse,
  OrderDetails,
  PaymentRequest,
  PaymentResponse,
  ApiResponse,
  RetryConfig,
};
