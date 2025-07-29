// ========================================
// Cancel Order UseCase - 주문 취소 유스케이스
// order-service/src/usecases/CancelOrderUseCase.ts
// ========================================

import { Order } from '../entities/Order';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderRepository } from '../adapters/OrderRepository';
import { PaymentService } from '../adapters/PaymentService';

export interface CancelOrderRequest {
  orderId: string;
  userId?: string; // 고객이 취소하는 경우
  adminUserId?: string; // 관리자가 취소하는 경우
  reason: string;
  refundAmount?: number; // 부분 환불 금액 (없으면 전액)
}

export interface CancelOrderResponse {
  success: boolean;
  order?: Order;
  refundInfo?: {
    refunded: boolean;
    refundAmount: number;
    refundId?: string;
  };
  errorMessage?: string;
}

// 외부 서비스 인터페이스
export interface ProductService {
  releaseStock(productId: string, quantity: number): Promise<boolean>;
}

export interface EventPublisher {
  publishOrderCancelled(orderId: string, reason: string, refundAmount?: number): Promise<void>;
}

export interface NotificationService {
  sendOrderCancelNotification(userId: string, orderNumber: string, reason: string): Promise<void>;
}

export class CancelOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private paymentService: PaymentService,
    private productService: ProductService,
    private eventPublisher?: EventPublisher,
    private notificationService?: NotificationService
  ) {}

  // 주문 취소 처리
  async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    try {
      // 입력 유효성 검증
      const validationResult = this.validateRequest(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          errorMessage: validationResult.errorMessage,
        };
      }

      // 주문 조회
      const order = await this.orderRepository.findById(request.orderId);
      if (!order) {
        return {
          success: false,
          errorMessage: '주문을 찾을 수 없습니다',
        };
      }

      // 취소 권한 확인
      const permissionCheck = this.checkCancelPermission(order, request.userId, request.adminUserId);
      if (!permissionCheck.allowed) {
        return {
          success: false,
          errorMessage: permissionCheck.reason,
        };
      }

      // 주문 취소 가능 여부 확인
      if (!order.canBeCancelled()) {
        return {
          success: false,
          errorMessage: '현재 상태에서는 주문을 취소할 수 없습니다',
        };
      }

      let refundInfo: CancelOrderResponse['refundInfo'] = undefined;

      // 결제 완료된 주문인 경우 환불 처리
      if (order.status === OrderStatus.PAYMENT_COMPLETED || order.status === OrderStatus.CONFIRMED) {
        try {
          const refundResult = await this.processRefund(order, request.refundAmount);
          refundInfo = refundResult;

          if (!refundResult.refunded) {
            return {
              success: false,
              errorMessage: '환불 처리에 실패했습니다. 주문 취소를 완료할 수 없습니다',
            };
          }
        } catch (refundError) {
          console.error('환불 처리 중 오류:', refundError);
          return {
            success: false,
            errorMessage: '환불 처리 중 오류가 발생했습니다',
          };
        }
      }

      // 재고 복원 처리
      try {
        await this.restoreStock(order);
      } catch (stockError) {
        console.error('재고 복원 실패:', stockError);
        // 재고 복원 실패는 로그만 남기고 계속 진행 (수동 처리 필요)
      }

      // 주문 상태를 취소로 변경
      order.updateStatus(OrderStatus.CANCELLED);
      const updatedOrder = await this.orderRepository.update(request.orderId, {
        status: OrderStatus.CANCELLED,
      });

      // 이벤트 발행 및 알림 (비동기, 실패해도 취소 처리는 성공)
      try {
        if (this.eventPublisher) {
          await this.eventPublisher.publishOrderCancelled(
            request.orderId,
            request.reason,
            refundInfo?.refundAmount
          );
        }

        if (this.notificationService) {
          await this.notificationService.sendOrderCancelNotification(
            updatedOrder.userId,
            updatedOrder.orderNumber || '',
            request.reason
          );
        }
      } catch (eventError) {
        console.error('이벤트 발행 또는 알림 발송 실패:', eventError);
        // 이벤트 실패는 로그만 남기고 성공 처리
      }

      return {
        success: true,
        order: updatedOrder,
        refundInfo,
      };

    } catch (error) {
      console.error('주문 취소 처리 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 취소 처리 중 오류가 발생했습니다',
      };
    }
  }

  // 고객 주문 취소 (제한된 조건에서만 가능)
  async customerCancelOrder(orderId: string, userId: string, reason: string): Promise<CancelOrderResponse> {
    return this.cancelOrder({
      orderId,
      userId,
      reason,
    });
  }

  // 관리자 주문 취소
  async adminCancelOrder(orderId: string, adminUserId: string, reason: string, refundAmount?: number): Promise<CancelOrderResponse> {
    return this.cancelOrder({
      orderId,
      adminUserId,
      reason,
      refundAmount,
    });
  }

  // 입력 유효성 검증
  private validateRequest(request: CancelOrderRequest): {
    isValid: boolean;
    errorMessage?: string;
  } {
    if (!request.orderId || request.orderId.trim().length === 0) {
      return { isValid: false, errorMessage: '주문 ID는 필수 항목입니다' };
    }

    if (!request.userId && !request.adminUserId) {
      return { isValid: false, errorMessage: '사용자 ID 또는 관리자 ID가 필요합니다' };
    }

    if (!request.reason || request.reason.trim().length === 0) {
      return { isValid: false, errorMessage: '취소 사유는 필수 항목입니다' };
    }

    if (request.reason.length > 500) {
      return { isValid: false, errorMessage: '취소 사유는 500자를 초과할 수 없습니다' };
    }

    if (request.refundAmount !== undefined && request.refundAmount <= 0) {
      return { isValid: false, errorMessage: '환불 금액은 0보다 커야 합니다' };
    }

    return { isValid: true };
  }

  // 취소 권한 확인
  private checkCancelPermission(order: Order, userId?: string, adminUserId?: string): {
    allowed: boolean;
    reason?: string;
  } {
    // 관리자는 모든 주문 취소 가능
    if (adminUserId) {
      return { allowed: true };
    }

    // 고객은 본인 주문만 취소 가능
    if (userId) {
      if (order.userId !== userId) {
        return {
          allowed: false,
          reason: '본인의 주문만 취소할 수 있습니다',
        };
      }

      // 고객이 직접 취소할 수 있는 상태 제한
      const customerCancellableStatuses = [
        OrderStatus.PENDING,
        OrderStatus.PAYMENT_IN_PROGRESS,
        OrderStatus.PAYMENT_FAILED,
      ];

      if (!customerCancellableStatuses.includes(order.status as OrderStatus)) {
        return {
          allowed: false,
          reason: '현재 주문 상태에서는 고객이 직접 취소할 수 없습니다. 고객센터에 문의해주세요',
        };
      }
    }

    return { allowed: true };
  }

  // 환불 처리
  private async processRefund(order: Order, refundAmount?: number): Promise<{
    refunded: boolean;
    refundAmount: number;
    refundId?: string;
  }> {
    if (!order.paymentId) {
      return {
        refunded: false,
        refundAmount: 0,
      };
    }

    const actualRefundAmount = refundAmount || order.totalAmount;

    try {
      const refundResult = await this.paymentService.refundPayment(
        order.paymentId,
        actualRefundAmount,
        '주문 취소로 인한 환불'
      );

      return {
        refunded: refundResult.success,
        refundAmount: actualRefundAmount,
        refundId: refundResult.paymentId,
      };

    } catch (error) {
      console.error('환불 처리 실패:', error);
      return {
        refunded: false,
        refundAmount: 0,
      };
    }
  }

  // 재고 복원
  private async restoreStock(order: Order): Promise<void> {
    const restorePromises = order.items.map(async (item) => {
      try {
        const restored = await this.productService.releaseStock(item.productId, item.quantity);
        if (!restored) {
          console.error(`재고 복원 실패: 상품 ID ${item.productId}, 수량 ${item.quantity}`);
        }
      } catch (error) {
        console.error(`재고 복원 중 오류: 상품 ID ${item.productId}`, error);
      }
    });

    await Promise.allSettled(restorePromises);
  }
}