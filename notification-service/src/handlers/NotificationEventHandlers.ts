// ========================================
// Notification Event Handlers - 이벤트별 알림 처리
// ========================================

import {
  UserRegisteredEvent,
  UserDeactivatedEvent,
  ProductAddedEvent,
  StockUpdatedEvent,
  LowStockAlertEvent,
  OrderCreatedEvent,
  OrderPaymentCompletedEvent,
  OrderStatusUpdatedEvent,
  OrderCancelledEvent,
  CartAbandonedEvent
} from '../shared';
import { EmailNotificationService } from '../services/EmailNotificationService';
import { SMSNotificationService } from '../services/SMSNotificationService';
import { NotificationLogger } from '../services/NotificationLogger';

/**
 * Notification Event Handlers
 * 각 도메인 이벤트에 따른 알림 처리를 담당
 */
export class NotificationEventHandlers {
  private emailService: EmailNotificationService;
  private smsService: SMSNotificationService;
  private logger: NotificationLogger;

  constructor() {
    this.emailService = new EmailNotificationService();
    this.smsService = new SMSNotificationService();
    this.logger = new NotificationLogger();
  }

  // ========================================
  // User Events Handlers
  // ========================================

  /**
   * 사용자 등록 이벤트 처리
   * 환영 이메일 발송
   */
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      console.log('📧 [NotificationService] UserRegistered 이벤트 처리:', {
        userId: event.payload.userId,
        email: event.payload.email,
        eventId: event.eventId,
      });

      // 환영 이메일 발송
      await this.emailService.sendWelcomeEmail({
        to: event.payload.email,
        userName: event.payload.name,
        userId: event.payload.userId,
        registrationSource: event.payload.registrationSource,
      });

      // 로그 기록
      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.payload.userId,
        notificationType: 'email',
        recipient: event.payload.email,
        status: 'sent',
        template: 'welcome_email',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 환영 이메일 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] UserRegistered 처리 실패:', {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 실패 로그 기록
      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.payload.userId,
        notificationType: 'email',
        recipient: event.payload.email,
        status: 'failed',
        template: 'welcome_email',
        error: error instanceof Error ? error.message : 'Unknown error',
        sentAt: new Date(),
      });
    }
  }

  /**
   * 사용자 계정 비활성화 이벤트 처리
   * 계정 비활성화 알림 이메일 발송
   */
  async handleUserDeactivated(event: UserDeactivatedEvent): Promise<void> {
    try {
      console.log('📧 [NotificationService] UserDeactivated 이벤트 처리:', {
        userId: event.payload.userId,
        reason: event.payload.reason,
        eventId: event.eventId,
      });

      // 계정 비활성화 알림 이메일 발송 (Mock)
      await this.emailService.sendAccountDeactivationEmail({
        userId: event.payload.userId,
        reason: event.payload.reason,
        deactivatedBy: event.payload.deactivatedBy,
      });

      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.payload.userId,
        notificationType: 'email',
        recipient: 'user@example.com', // 실제로는 사용자 정보 조회 필요
        status: 'sent',
        template: 'account_deactivation',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 계정 비활성화 알림 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] UserDeactivated 처리 실패:', error);
    }
  }

  // ========================================
  // Product Events Handlers
  // ========================================

  /**
   * 상품 추가 이벤트 처리
   * 관리자에게 새 상품 등록 알림
   */
  async handleProductAdded(event: ProductAddedEvent): Promise<void> {
    try {
      console.log('📧 [NotificationService] ProductAdded 이벤트 처리:', {
        productId: event.payload.productId,
        productName: event.payload.name,
        eventId: event.eventId,
      });

      // 관리자에게 신상품 등록 알림 (Mock)
      await this.emailService.sendNewProductNotification({
        productId: event.payload.productId,
        productName: event.payload.name,
        brand: event.payload.brand,
        price: event.payload.price,
        categoryName: event.payload.categoryName,
        createdBy: event.payload.createdBy,
      });

      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        productId: event.payload.productId,
        notificationType: 'email',
        recipient: 'admin@shopping-mall.com',
        status: 'sent',
        template: 'new_product_notification',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 신상품 등록 알림 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] ProductAdded 처리 실패:', error);
    }
  }

  /**
   * 재고 업데이트 이벤트 처리
   * 재고 변동 로그 기록 (중요한 변동에 대해서만 알림)
   */
  async handleStockUpdated(event: StockUpdatedEvent): Promise<void> {
    try {
      console.log('📦 [NotificationService] StockUpdated 이벤트 처리:', {
        productId: event.payload.productId,
        sku: event.payload.sku,
        previousQuantity: event.payload.previousQuantity,
        newQuantity: event.payload.newQuantity,
        changeReason: event.payload.changeReason,
        eventId: event.eventId,
      });

      // 중요한 재고 변동에 대해서만 알림 (대량 차감, 0 재고 등)
      const quantityChange = event.payload.newQuantity - event.payload.previousQuantity;
      const isSignificantChange = Math.abs(quantityChange) > 100 || event.payload.newQuantity === 0;

      if (isSignificantChange) {
        await this.emailService.sendStockUpdateNotification({
          productId: event.payload.productId,
          sku: event.payload.sku,
          previousQuantity: event.payload.previousQuantity,
          newQuantity: event.payload.newQuantity,
          changeReason: event.payload.changeReason,
          location: event.payload.location,
        });

        await this.logger.logNotification({
          eventId: event.eventId,
          eventType: event.eventType,
          productId: event.payload.productId,
          notificationType: 'email',
          recipient: 'inventory@shopping-mall.com',
          status: 'sent',
          template: 'stock_update_notification',
          sentAt: new Date(),
        });
      }

      console.log('✅ [NotificationService] 재고 업데이트 처리 완료');

    } catch (error) {
      console.error('❌ [NotificationService] StockUpdated 처리 실패:', error);
    }
  }

  /**
   * 재고 부족 경고 이벤트 처리
   * 재고 부족 긴급 알림 (이메일 + SMS)
   */
  async handleLowStockAlert(event: LowStockAlertEvent): Promise<void> {
    try {
      console.log('🚨 [NotificationService] LowStockAlert 이벤트 처리:', {
        productId: event.payload.productId,
        sku: event.payload.sku,
        currentQuantity: event.payload.currentQuantity,
        urgencyLevel: event.payload.urgencyLevel,
        eventId: event.eventId,
      });

      // 이메일 알림 발송
      await this.emailService.sendLowStockAlert({
        productId: event.payload.productId,
        sku: event.payload.sku,
        productName: event.payload.productName,
        currentQuantity: event.payload.currentQuantity,
        lowStockThreshold: event.payload.lowStockThreshold,
        urgencyLevel: event.payload.urgencyLevel,
        location: event.payload.location,
      });

      // 긴급 상황(critical)인 경우 SMS도 발송
      if (event.payload.urgencyLevel === 'critical') {
        await this.smsService.sendLowStockAlert({
          sku: event.payload.sku,
          productName: event.payload.productName,
          currentQuantity: event.payload.currentQuantity,
        });
      }

      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        productId: event.payload.productId,
        notificationType: event.payload.urgencyLevel === 'critical' ? 'email_sms' : 'email',
        recipient: 'inventory@shopping-mall.com',
        status: 'sent',
        template: 'low_stock_alert',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 재고 부족 알림 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] LowStockAlert 처리 실패:', error);
    }
  }

  // ========================================
  // Order Events Handlers
  // ========================================

  /**
   * 주문 생성 이벤트 처리
   * 주문 확인 이메일 발송
   */
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      console.log('📧 [NotificationService] OrderCreated 이벤트 처리:', {
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        userId: event.payload.userId,
        totalAmount: event.payload.totalAmount,
        eventId: event.eventId,
      });

      // 주문 확인 이메일 발송
      await this.emailService.sendOrderConfirmation({
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        userId: event.payload.userId,
        totalAmount: event.payload.totalAmount,
        items: event.payload.items,
        shippingAddress: event.payload.shippingAddress,
        paymentMethod: event.payload.paymentMethod,
      });

      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.payload.userId,
        orderId: event.payload.orderId,
        notificationType: 'email',
        recipient: 'customer@example.com', // 실제로는 사용자 이메일 조회 필요
        status: 'sent',
        template: 'order_confirmation',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 주문 확인 이메일 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] OrderCreated 처리 실패:', error);
    }
  }

  /**
   * 결제 완료 이벤트 처리
   * 결제 완료 이메일 + SMS 발송
   */
  async handleOrderPaymentCompleted(event: OrderPaymentCompletedEvent): Promise<void> {
    try {
      console.log('💳 [NotificationService] OrderPaymentCompleted 이벤트 처리:', {
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        totalAmount: event.payload.totalAmount,
        paymentMethod: event.payload.paymentMethod,
        eventId: event.eventId,
      });

      // 결제 완료 이메일 발송
      await this.emailService.sendPaymentConfirmation({
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        userId: event.payload.userId,
        totalAmount: event.payload.totalAmount,
        paymentId: event.payload.paymentId,
        paymentMethod: event.payload.paymentMethod,
        paidAt: new Date(event.payload.paidAt),
      });

      // 결제 완료 SMS 발송 (선택사항)
      await this.smsService.sendPaymentConfirmation({
        orderNumber: event.payload.orderNumber,
        totalAmount: event.payload.totalAmount,
      });

      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.payload.userId,
        orderId: event.payload.orderId,
        notificationType: 'email_sms',
        recipient: 'customer@example.com',
        status: 'sent',
        template: 'payment_confirmation',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 결제 완료 알림 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] OrderPaymentCompleted 처리 실패:', error);
    }
  }

  /**
   * 주문 상태 업데이트 이벤트 처리
   * 배송 상태 변경 알림
   */
  async handleOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void> {
    try {
      console.log('📦 [NotificationService] OrderStatusUpdated 이벤트 처리:', {
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        previousStatus: event.payload.previousStatus,
        newStatus: event.payload.newStatus,
        eventId: event.eventId,
      });

      // 중요한 상태 변경에 대해서만 알림 (배송 준비, 배송 중, 배송 완료)
      const notifiableStatuses = ['preparing', 'shipped', 'delivered'];
      
      if (notifiableStatuses.includes(event.payload.newStatus.toLowerCase())) {
        await this.emailService.sendOrderStatusUpdate({
          orderId: event.payload.orderId,
          orderNumber: event.payload.orderNumber,
          userId: event.payload.userId,
          previousStatus: event.payload.previousStatus,
          newStatus: event.payload.newStatus,
          trackingNumber: event.payload.trackingNumber,
          estimatedDeliveryDate: event.payload.estimatedDeliveryDate ? new Date(event.payload.estimatedDeliveryDate) : undefined,
        });

        await this.logger.logNotification({
          eventId: event.eventId,
          eventType: event.eventType,
          userId: event.payload.userId,
          orderId: event.payload.orderId,
          notificationType: 'email',
          recipient: 'customer@example.com',
          status: 'sent',
          template: 'order_status_update',
          sentAt: new Date(),
        });
      }

      console.log('✅ [NotificationService] 주문 상태 업데이트 알림 처리 완료');

    } catch (error) {
      console.error('❌ [NotificationService] OrderStatusUpdated 처리 실패:', error);
    }
  }

  /**
   * 주문 취소 이벤트 처리
   * 주문 취소 알림 및 환불 안내
   */
  async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    try {
      console.log('❌ [NotificationService] OrderCancelled 이벤트 처리:', {
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        cancelReason: event.payload.cancelReason,
        refundRequired: event.payload.refundRequired,
        eventId: event.eventId,
      });

      // 주문 취소 알림 이메일 발송
      await this.emailService.sendOrderCancellation({
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        userId: event.payload.userId,
        totalAmount: event.payload.totalAmount,
        cancelReason: event.payload.cancelReason,
        refundRequired: event.payload.refundRequired,
        refundAmount: event.payload.refundAmount,
      });

      await this.logger.logNotification({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.payload.userId,
        orderId: event.payload.orderId,
        notificationType: 'email',
        recipient: 'customer@example.com',
        status: 'sent',
        template: 'order_cancellation',
        sentAt: new Date(),
      });

      console.log('✅ [NotificationService] 주문 취소 알림 발송 완료');

    } catch (error) {
      console.error('❌ [NotificationService] OrderCancelled 처리 실패:', error);
    }
  }

  // ========================================
  // Cart Events Handlers
  // ========================================

  /**
   * 장바구니 포기 이벤트 처리
   * 장바구니 복구 유도 마케팅 이메일
   */
  async handleCartAbandoned(event: CartAbandonedEvent): Promise<void> {
    try {
      console.log('🛒 [NotificationService] CartAbandoned 이벤트 처리:', {
        cartId: event.payload.cartId,
        userId: event.payload.userId,
        totalAmount: event.payload.totalAmount,
        abandonedDurationMinutes: event.payload.abandonedDurationMinutes,
        eventId: event.eventId,
      });

      // 장바구니 복구 유도 이메일 (24시간 후 발송 등의 조건이 있을 수 있음)
      if (event.payload.abandonedDurationMinutes >= 1440) { // 24시간 이후
        await this.emailService.sendCartAbandonmentReminder({
          cartId: event.payload.cartId,
          userId: event.payload.userId || '',
          items: event.payload.items,
          totalAmount: event.payload.totalAmount,
          lastActiveAt: new Date(event.payload.lastActiveAt),
        });

        await this.logger.logNotification({
          eventId: event.eventId,
          eventType: event.eventType,
          userId: event.payload.userId,
          cartId: event.payload.cartId,
          notificationType: 'email',
          recipient: 'customer@example.com',
          status: 'sent',
          template: 'cart_abandonment_reminder',
          sentAt: new Date(),
        });
      }

      console.log('✅ [NotificationService] 장바구니 포기 이벤트 처리 완료');

    } catch (error) {
      console.error('❌ [NotificationService] CartAbandoned 처리 실패:', error);
    }
  }
}