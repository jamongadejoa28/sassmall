// ========================================
// Update Order Status UseCase - 주문 상태 업데이트 유스케이스
// order-service/src/usecases/UpdateOrderStatusUseCase.ts
// ========================================

import { Order } from '../entities/Order';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderRepository } from '../adapters/OrderRepository';
import { ProductServiceAdapter } from '../adapters/ProductServiceAdapter';
import { 
  EventPublisher as KafkaEventPublisher,
  EventFactory,
  OrderStatusUpdatedEvent,
  OrderCancelledEvent
} from '../shared';

export interface UpdateOrderStatusRequest {
  orderId: string;
  newStatus: OrderStatus;
  adminUserId?: string; // 관리자 권한 확인용
  reason?: string; // 상태 변경 사유
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  order?: Order;
  errorMessage?: string;
}

export interface BulkUpdateStatusRequest {
  orderIds: string[];
  newStatus: OrderStatus;
  adminUserId: string;
  reason?: string;
}

export interface BulkUpdateStatusResponse {
  success: boolean;
  updatedCount?: number;
  failedOrderIds?: string[];
  errorMessage?: string;
}

// 외부 서비스 인터페이스
export interface EventPublisher {
  publishOrderStatusChanged(orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus, reason?: string): Promise<void>;
}

export interface NotificationService {
  sendOrderStatusNotification(userId: string, orderNumber: string, newStatus: OrderStatus): Promise<void>;
}

export class UpdateOrderStatusUseCase {
  private readonly kafkaEventPublisher: KafkaEventPublisher;
  private readonly eventFactory: EventFactory;

  constructor(
    private orderRepository: OrderRepository,
    private productService: ProductServiceAdapter,
    private eventPublisher?: EventPublisher,
    private notificationService?: NotificationService
  ) {
    this.kafkaEventPublisher = new KafkaEventPublisher(['kafka:29092'], 'order-service');
    this.eventFactory = new EventFactory('order-service', '1.0.0');
  }

  // 단일 주문 상태 업데이트
  async updateStatus(request: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> {
    try {
      // 입력 유효성 검증
      if (!request.orderId || request.orderId.trim().length === 0) {
        return {
          success: false,
          errorMessage: '주문 ID는 필수 항목입니다',
        };
      }

      if (!request.newStatus) {
        return {
          success: false,
          errorMessage: '새로운 상태는 필수 항목입니다',
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

      // 상태 변경 권한 확인
      const hasPermission = this.checkUpdatePermission(order, request.newStatus, request.adminUserId);
      if (!hasPermission.allowed) {
        return {
          success: false,
          errorMessage: hasPermission.reason,
        };
      }

      const oldStatus = order.status;

      // 상태 변경 시도
      try {
        order.updateStatus(request.newStatus);
      } catch (statusError) {
        return {
          success: false,
          errorMessage: statusError instanceof Error ? statusError.message : '상태 변경이 불가능합니다',
        };
      }

      // 데이터베이스 업데이트
      const updatedOrder = await this.orderRepository.update(request.orderId, {
        status: request.newStatus,
      });

      // 주문 완료 시 재고 감소 처리
      if (request.newStatus === OrderStatus.DELIVERED) {
        await this.decreaseInventoryForCompletedOrder(updatedOrder);
      }

      // 이벤트 발행 (비동기, 실패해도 주문 상태 변경은 성공)
      try {
        // Kafka 이벤트 발행
        if (request.newStatus === OrderStatus.CANCELLED) {
          await this.publishOrderCancelledEvent(updatedOrder, request.reason || '');
        } else {
          await this.publishOrderStatusUpdatedEvent(updatedOrder, oldStatus, request.newStatus, request.reason);
        }

        // 기존 이벤트 발행 (하위 호환성)
        if (this.eventPublisher) {
          await this.eventPublisher.publishOrderStatusChanged(
            request.orderId,
            oldStatus,
            request.newStatus,
            request.reason
          );
        }

        // 고객 알림 발송
        if (this.notificationService) {
          await this.notificationService.sendOrderStatusNotification(
            updatedOrder.userId,
            updatedOrder.orderNumber || '',
            request.newStatus
          );
        }
      } catch (eventError) {
        console.error('이벤트 발행 또는 알림 발송 실패:', eventError);
        // 이벤트 실패는 로그만 남기고 성공 처리
      }

      return {
        success: true,
        order: updatedOrder,
      };

    } catch (error) {
      console.error('주문 상태 업데이트 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 상태 업데이트 중 오류가 발생했습니다',
      };
    }
  }

  // 벌크 주문 상태 업데이트
  async updateStatusBulk(request: BulkUpdateStatusRequest): Promise<BulkUpdateStatusResponse> {
    try {
      // 입력 유효성 검증
      if (!request.orderIds || request.orderIds.length === 0) {
        return {
          success: false,
          errorMessage: '주문 ID 목록은 필수 항목입니다',
        };
      }

      if (request.orderIds.length > 100) {
        return {
          success: false,
          errorMessage: '한 번에 업데이트할 수 있는 주문은 최대 100개입니다',
        };
      }

      if (!request.adminUserId) {
        return {
          success: false,
          errorMessage: '관리자 권한이 필요합니다',
        };
      }

      const failedOrderIds: string[] = [];
      let updatedCount = 0;

      // 각 주문 상태 개별 업데이트 (권한 및 상태 변경 가능성 확인)
      for (const orderId of request.orderIds) {
        try {
          const updateResult = await this.updateStatus({
            orderId,
            newStatus: request.newStatus,
            adminUserId: request.adminUserId,
            reason: request.reason,
          });

          if (updateResult.success) {
            updatedCount++;
          } else {
            failedOrderIds.push(orderId);
          }
        } catch (error) {
          console.error(`주문 ${orderId} 상태 업데이트 실패:`, error);
          failedOrderIds.push(orderId);
        }
      }

      return {
        success: true,
        updatedCount,
        failedOrderIds: failedOrderIds.length > 0 ? failedOrderIds : undefined,
      };

    } catch (error) {
      console.error('벌크 주문 상태 업데이트 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '벌크 상태 업데이트 중 오류가 발생했습니다',
      };
    }
  }

  // 배송 시작 처리
  async startShipping(orderId: string, adminUserId: string, trackingNumber?: string): Promise<UpdateOrderStatusResponse> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return {
          success: false,
          errorMessage: '주문을 찾을 수 없습니다',
        };
      }

      if (order.status !== OrderStatus.PREPARING_SHIPMENT) {
        return {
          success: false,
          errorMessage: '배송 준비 상태의 주문만 배송 시작할 수 있습니다',
        };
      }

      const result = await this.updateStatus({
        orderId,
        newStatus: OrderStatus.SHIPPING,
        adminUserId,
        reason: trackingNumber ? `배송 시작 - 운송장: ${trackingNumber}` : '배송 시작',
      });

      return result;

    } catch (error) {
      console.error('배송 시작 처리 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '배송 시작 처리 중 오류가 발생했습니다',
      };
    }
  }

  // 배송 완료 처리
  async completeDelivery(orderId: string, adminUserId: string): Promise<UpdateOrderStatusResponse> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return {
          success: false,
          errorMessage: '주문을 찾을 수 없습니다',
        };
      }

      if (order.status !== OrderStatus.SHIPPING) {
        return {
          success: false,
          errorMessage: '배송 중인 주문만 배송 완료 처리할 수 있습니다',
        };
      }

      const result = await this.updateStatus({
        orderId,
        newStatus: OrderStatus.DELIVERED,
        adminUserId,
        reason: '배송 완료',
      });

      return result;

    } catch (error) {
      console.error('배송 완료 처리 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '배송 완료 처리 중 오류가 발생했습니다',
      };
    }
  }

  // 상태 변경 권한 확인
  private checkUpdatePermission(order: Order, newStatus: OrderStatus, adminUserId?: string): {
    allowed: boolean;
    reason?: string;
  } {
    // 특정 상태 변경은 관리자만 가능
    const adminOnlyStatuses = [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING_SHIPMENT,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
    ];

    if (adminOnlyStatuses.includes(newStatus) && !adminUserId) {
      return {
        allowed: false,
        reason: '해당 상태 변경은 관리자 권한이 필요합니다',
      };
    }

    // 취소/환불 관련 제한
    if (newStatus === OrderStatus.CANCELLED) {
      if (!order.canBeCancelled()) {
        return {
          allowed: false,
          reason: '현재 상태에서는 취소할 수 없습니다',
        };
      }
    }

    if (newStatus === OrderStatus.REFUND_IN_PROGRESS) {
      if (!order.canBeRefunded()) {
        return {
          allowed: false,
          reason: '현재 상태에서는 환불할 수 없습니다',
        };
      }
    }

    return { allowed: true };
  }

  // 주문 완료 시 재고 감소 처리
  private async decreaseInventoryForCompletedOrder(order: Order): Promise<void> {
    try {
      console.log(`📦 [UpdateOrderStatusUseCase] 주문 완료로 인한 재고 감소 시작 - 주문번호: ${order.orderNumber}`);
      
      const inventoryPromises = order.items.map(async (item) => {
        try {
          const success = await this.productService.decreaseInventory(
            item.productId,
            item.quantity,
            order.orderNumber
          );

          if (!success) {
            console.error(`❌ [UpdateOrderStatusUseCase] 재고 감소 실패 - 상품ID: ${item.productId}, 수량: ${item.quantity}`);
          } else {
            console.log(`✅ [UpdateOrderStatusUseCase] 재고 감소 성공 - 상품ID: ${item.productId}, 수량: ${item.quantity}`);
          }

          return success;
        } catch (error) {
          console.error(`❌ [UpdateOrderStatusUseCase] 재고 감소 중 오류 - 상품ID: ${item.productId}:`, error);
          return false;
        }
      });

      // 모든 재고 감소 작업 완료 대기
      const results = await Promise.all(inventoryPromises);
      
      const successCount = results.filter(Boolean).length;
      const failedCount = results.length - successCount;

      if (failedCount > 0) {
        console.warn(`⚠️ [UpdateOrderStatusUseCase] 재고 감소 부분 실패 - 성공: ${successCount}, 실패: ${failedCount}, 주문번호: ${order.orderNumber}`);
      } else {
        console.log(`✅ [UpdateOrderStatusUseCase] 모든 재고 감소 완료 - 주문번호: ${order.orderNumber}`);
      }

    } catch (error) {
      console.error(`❌ [UpdateOrderStatusUseCase] 재고 감소 처리 중 전체 오류 - 주문번호: ${order.orderNumber}:`, error);
      // 재고 감소 실패는 로그만 남기고 주문 상태 변경은 계속 진행
      // 실제 운영환경에서는 별도의 보상 트랜잭션이나 알림 시스템 필요
    }
  }

  // ========================================
  // Kafka 이벤트 발행
  // ========================================

  /**
   * 주문 상태 변경 이벤트 발행
   */
  private async publishOrderStatusUpdatedEvent(
    order: Order,
    previousStatus: OrderStatus,
    newStatus: OrderStatus,
    reason?: string
  ): Promise<void> {
    try {
      // Kafka EventPublisher 연결 확인
      if (!(await this.kafkaEventPublisher.isConnected())) {
        await this.kafkaEventPublisher.connect();
      }

      // OrderStatusUpdatedEvent 생성
      const orderStatusUpdatedEvent = this.eventFactory.createOrderStatusUpdatedEvent(
        order.id!,
        {
          orderNumber: order.orderNumber!,
          userId: order.userId,
          previousStatus,
          newStatus,
          reason,
          trackingNumber: this.getTrackingNumber(order),
          estimatedDeliveryDate: this.getEstimatedDeliveryDate(order, newStatus),
          updatedBy: 'system',
        }
      );

      // Kafka 이벤트 발행
      await this.kafkaEventPublisher.publish(orderStatusUpdatedEvent);

      console.log('✅ [OrderService] 주문 상태 변경 이벤트 발행 완료:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        previousStatus,
        newStatus,
        reason,
      });

    } catch (error) {
      // 이벤트 발행 실패는 로그만 남기고 무시 (비즈니스 로직에 영향 X)
      console.error('❌ [OrderService] 주문 상태 변경 이벤트 발행 실패:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Dead Letter Queue로 실패한 이벤트 전송 시도
      if (error instanceof Error) {
        const failedStatusEvent = this.eventFactory.createOrderStatusUpdatedEvent(
          order.id!,
          {
            orderNumber: order.orderNumber!,
            userId: order.userId,
            previousStatus,
            newStatus,
            reason,
            trackingNumber: this.getTrackingNumber(order),
            estimatedDeliveryDate: this.getEstimatedDeliveryDate(order, newStatus),
              updatedBy: 'system',
          }
        );
        
        await this.kafkaEventPublisher.sendToDeadLetterQueue(failedStatusEvent, error, 0);
      }
    }
  }

  /**
   * 주문 취소 이벤트 발행
   */
  private async publishOrderCancelledEvent(order: Order, reason: string): Promise<void> {
    try {
      // Kafka EventPublisher 연결 확인
      if (!(await this.kafkaEventPublisher.isConnected())) {
        await this.kafkaEventPublisher.connect();
      }

      // OrderCancelledEvent 생성
      const orderCancelledEvent = this.eventFactory.createOrderCancelledEvent(
        order.id!,
        {
          orderNumber: order.orderNumber!,
          userId: order.userId,
          totalAmount: order.totalAmount,
          cancelReason: reason,
          refundRequired: true,
          refundAmount: order.totalAmount, // 전액 환불
          cancelledBy: 'system',
          items: order.items.map(item => ({
            productId: item.productId,
            sku: item.sku || `SKU-${item.productId.substring(0, 8)}`,
            quantity: item.quantity,
          })),
        }
      );

      // Kafka 이벤트 발행
      await this.kafkaEventPublisher.publish(orderCancelledEvent);

      console.log('✅ [OrderService] 주문 취소 이벤트 발행 완료:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        reason,
      });

    } catch (error) {
      // 이벤트 발행 실패는 로그만 남기고 무시 (비즈니스 로직에 영향 X)
      console.error('❌ [OrderService] 주문 취소 이벤트 발행 실패:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Dead Letter Queue로 실패한 이벤트 전송 시도
      if (error instanceof Error) {
        const failedCancelEvent = this.eventFactory.createOrderCancelledEvent(
          order.id!,
          {
            orderNumber: order.orderNumber!,
            userId: order.userId,
            totalAmount: order.totalAmount,
            cancelReason: reason,
            refundRequired: true,
            refundAmount: order.totalAmount,
            cancelledBy: 'system',
            items: order.items.map(item => ({
              productId: item.productId,
              sku: item.sku || `SKU-${item.productId.substring(0, 8)}`,
              quantity: item.quantity,
            })),
          }
        );
        
        await this.kafkaEventPublisher.sendToDeadLetterQueue(failedCancelEvent, error, 0);
      }
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  private getTrackingNumber(order: Order): string | undefined {
    // 실제 구현에서는 order에서 tracking number 조회
    // 현재는 Mock 데이터
    return order.status === OrderStatus.SHIPPING ? `TRACK-${order.id?.substring(0, 8)}` : undefined;
  }

  private getEstimatedDeliveryDate(order: Order, status: OrderStatus): string | undefined {
    if (status === OrderStatus.SHIPPING) {
      // 배송 시작일로부터 3일 후 예상 배송일 설정
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + 3);
      return estimatedDate.toISOString();
    }
    return undefined;
  }
}