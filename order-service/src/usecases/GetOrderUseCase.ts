// ========================================
// Get Order UseCase - 주문 조회 유스케이스
// order-service/src/usecases/GetOrderUseCase.ts
// ========================================

import { Order } from '../entities/Order';
import { OrderRepository } from '../adapters/OrderRepository';

export interface GetOrderRequest {
  orderId?: string;
  orderNumber?: string;
  userId?: string; // 권한 확인용
}

export interface GetOrderResponse {
  success: boolean;
  order?: Order;
  errorMessage?: string;
}

export interface GetOrdersRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetOrdersResponse {
  success: boolean;
  orders?: Order[];
  totalCount?: number;
  errorMessage?: string;
}

export class GetOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  // 단일 주문 조회
  async getOrder(request: GetOrderRequest): Promise<GetOrderResponse> {
    try {
      // 입력 유효성 검증
      if (!request.orderId && !request.orderNumber) {
        return {
          success: false,
          errorMessage: '주문 ID 또는 주문번호가 필요합니다',
        };
      }

      let order: Order | null = null;

      // 주문 조회
      if (request.orderId) {
        order = await this.orderRepository.findById(request.orderId);
      } else if (request.orderNumber) {
        order = await this.orderRepository.findByOrderNumber(request.orderNumber);
      }

      if (!order) {
        return {
          success: false,
          errorMessage: '주문을 찾을 수 없습니다',
        };
      }

      // 권한 확인 (본인 주문인지 확인)
      if (request.userId && order.userId !== request.userId) {
        return {
          success: false,
          errorMessage: '접근 권한이 없습니다',
        };
      }

      return {
        success: true,
        order,
      };

    } catch (error) {
      console.error('주문 조회 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 조회 중 오류가 발생했습니다',
      };
    }
  }

  // 사용자 주문 목록 조회
  async getOrdersByUser(request: GetOrdersRequest): Promise<GetOrdersResponse> {
    try {
      // 입력 유효성 검증
      if (!request.userId || request.userId.trim().length === 0) {
        return {
          success: false,
          errorMessage: '사용자 ID는 필수 항목입니다',
        };
      }

      // 페이지네이션 기본값 설정
      const limit = request.limit || 20;
      const offset = request.offset || 0;

      // 사용자 주문 목록 조회
      const orders = await this.orderRepository.findByUserId(request.userId, limit, offset);
      
      // 전체 주문 개수 조회
      const totalCount = await this.orderRepository.count({ userId: request.userId });

      return {
        success: true,
        orders,
        totalCount,
      };

    } catch (error) {
      console.error('사용자 주문 목록 조회 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 목록 조회 중 오류가 발생했습니다',
      };
    }
  }

  // 주문 상세 정보 조회 (배송 정보, 결제 정보 포함)
  async getOrderDetail(orderId: string, userId?: string): Promise<GetOrderResponse> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return {
          success: false,
          errorMessage: '주문을 찾을 수 없습니다',
        };
      }

      // 권한 확인 (본인 주문인지 확인)
      if (userId && order.userId !== userId) {
        return {
          success: false,
          errorMessage: '접근 권한이 없습니다',
        };
      }

      return {
        success: true,
        order,
      };

    } catch (error) {
      console.error('주문 상세 조회 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 상세 조회 중 오류가 발생했습니다',
      };
    }
  }

  // 주문 요약 정보 조회
  async getOrderSummary(orderId: string, userId?: string): Promise<{
    success: boolean;
    summary?: {
      orderNumber: string;
      status: string;
      itemCount: number;
      totalAmount: number;
      orderedAt: Date;
    };
    errorMessage?: string;
  }> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return {
          success: false,
          errorMessage: '주문을 찾을 수 없습니다',
        };
      }

      // 권한 확인
      if (userId && order.userId !== userId) {
        return {
          success: false,
          errorMessage: '접근 권한이 없습니다',
        };
      }

      const summary = order.getOrderSummary();

      return {
        success: true,
        summary: {
          orderNumber: order.orderNumber || '',
          status: order.status,
          itemCount: summary.itemCount,
          totalAmount: summary.totalAmount,
          orderedAt: order.orderedAt,
        },
      };

    } catch (error) {
      console.error('주문 요약 조회 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 요약 조회 중 오류가 발생했습니다',
      };
    }
  }
}