// ========================================
// Event Factory - 도메인 이벤트 생성 팩토리
// ========================================

import { v4 as uuidv4 } from 'uuid';
import {
  BaseEvent,
  UserRegisteredEvent,
  UserUpdatedEvent,
  UserDeactivatedEvent,
  ProductAddedEvent,
  ProductUpdatedEvent,
  StockUpdatedEvent,
  LowStockAlertEvent,
  OrderCreatedEvent,
  OrderPaymentCompletedEvent,
  OrderStatusUpdatedEvent,
  OrderCancelledEvent,
  CartItemAddedEvent,
  CartAbandonedEvent,
  ServiceStartedEvent,
  ServiceStoppedEvent,
} from './types';

/**
 * Event Factory
 * 도메인 이벤트를 쉽게 생성할 수 있는 팩토리 클래스
 * 공통 필드 자동 생성 및 타입 안전성 보장
 */
export class EventFactory {
  private serviceName: string;
  private version: string;

  constructor(serviceName: string = 'unknown-service', version: string = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
  }

  /**
   * 기본 이벤트 메타데이터 생성
   */
  private createBaseEvent<T extends string>(
    eventType: T,
    aggregateId: string,
    correlationId?: string,
    causationId?: string
  ): BaseEvent & { eventType: T } {
    return {
      eventType,
      version: this.version,
      eventId: uuidv4(),
      aggregateId,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || uuidv4(),
      causationId: causationId,
    };
  }

  // ========================================
  // User Service Events
  // ========================================

  /**
   * 사용자 등록 이벤트 생성
   */
  createUserRegisteredEvent(
    userId: string,
    payload: {
      email: string;
      name: string;
      role: string;
      isActive?: boolean;
      registrationSource?: 'web' | 'mobile' | 'admin';
    },
    correlationId?: string
  ): UserRegisteredEvent {
    return {
      ...this.createBaseEvent('UserRegistered', userId, correlationId),
      payload: {
        userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        isActive: payload.isActive ?? true,
        registrationSource: payload.registrationSource ?? 'web',
      },
    };
  }

  /**
   * 사용자 정보 업데이트 이벤트 생성
   */
  createUserUpdatedEvent(
    userId: string,
    updatedFields: Record<string, any>,
    previousValues: Record<string, any>,
    correlationId?: string
  ): UserUpdatedEvent {
    return {
      ...this.createBaseEvent('UserUpdated', userId, correlationId),
      payload: {
        userId,
        updatedFields,
        previousValues,
      },
    };
  }

  /**
   * 사용자 비활성화 이벤트 생성
   */
  createUserDeactivatedEvent(
    userId: string,
    reason: string,
    deactivatedBy: string,
    correlationId?: string
  ): UserDeactivatedEvent {
    return {
      ...this.createBaseEvent('UserDeactivated', userId, correlationId),
      payload: {
        userId,
        reason,
        deactivatedBy,
      },
    };
  }

  // ========================================
  // Product Service Events  
  // ========================================

  /**
   * 상품 추가 이벤트 생성
   */
  createProductAddedEvent(
    productId: string,
    payload: {
      name: string;
      description: string;
      price: number;
      originalPrice?: number;
      brand: string;
      sku: string;
      categoryId: string;
      categoryName: string;
      isActive?: boolean;
      isFeatured?: boolean;
      createdBy: string;
    },
    correlationId?: string
  ): ProductAddedEvent {
    return {
      ...this.createBaseEvent('ProductAdded', productId, correlationId),
      payload: {
        productId,
        name: payload.name,
        description: payload.description,
        price: payload.price,
        originalPrice: payload.originalPrice,
        brand: payload.brand,
        sku: payload.sku,
        categoryId: payload.categoryId,
        categoryName: payload.categoryName,
        isActive: payload.isActive ?? true,
        isFeatured: payload.isFeatured ?? false,
        createdBy: payload.createdBy,
      },
    };
  }

  /**
   * 상품 정보 업데이트 이벤트 생성
   */
  createProductUpdatedEvent(
    productId: string,
    updatedFields: Record<string, any>,
    previousValues: Record<string, any>,
    updatedBy: string,
    correlationId?: string
  ): ProductUpdatedEvent {
    return {
      ...this.createBaseEvent('ProductUpdated', productId, correlationId),
      payload: {
        productId,
        updatedFields,
        previousValues,
        updatedBy,
      },
    };
  }

  /**
   * 재고 업데이트 이벤트 생성
   */
  createStockUpdatedEvent(
    productId: string,
    payload: {
      sku: string;
      previousQuantity: number;
      newQuantity: number;
      availableQuantity: number;
      changeReason: 'purchase' | 'restock' | 'adjustment' | 'return' | 'damage';
      orderId?: string;
      updatedBy: string;
      location: string;
    },
    correlationId?: string
  ): StockUpdatedEvent {
    return {
      ...this.createBaseEvent('StockUpdated', productId, correlationId),
      payload: {
        productId,
        sku: payload.sku,
        previousQuantity: payload.previousQuantity,
        newQuantity: payload.newQuantity,
        availableQuantity: payload.availableQuantity,
        changeReason: payload.changeReason,
        orderId: payload.orderId,
        updatedBy: payload.updatedBy,
        location: payload.location,
      },
    };
  }

  /**
   * 재고 부족 경고 이벤트 생성
   */
  createLowStockAlertEvent(
    productId: string,
    payload: {
      sku: string;
      productName: string;
      currentQuantity: number;
      lowStockThreshold: number;
      location: string;
      urgencyLevel: 'warning' | 'critical';
    },
    correlationId?: string
  ): LowStockAlertEvent {
    return {
      ...this.createBaseEvent('LowStockAlert', productId, correlationId),
      payload: {
        productId,
        sku: payload.sku,
        productName: payload.productName,
        currentQuantity: payload.currentQuantity,
        lowStockThreshold: payload.lowStockThreshold,
        location: payload.location,
        urgencyLevel: payload.urgencyLevel,
      },
    };
  }

  // ========================================
  // Order Service Events
  // ========================================

  /**
   * 주문 생성 이벤트 생성
   */
  createOrderCreatedEvent(
    orderId: string,
    payload: {
      orderNumber: string;
      userId: string;
      totalAmount: number;
      shippingAmount: number;
      taxAmount: number;
      discountAmount: number;
      status: string;
      items: Array<{
        productId: string;
        sku: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        zipCode: string;
      };
      paymentMethod: string;
    },
    correlationId?: string
  ): OrderCreatedEvent {
    return {
      ...this.createBaseEvent('OrderCreated', orderId, correlationId),
      payload: {
        orderId,
        orderNumber: payload.orderNumber,
        userId: payload.userId,
        totalAmount: payload.totalAmount,
        shippingAmount: payload.shippingAmount,
        taxAmount: payload.taxAmount,
        discountAmount: payload.discountAmount,
        status: payload.status,
        items: payload.items,
        shippingAddress: payload.shippingAddress,
        paymentMethod: payload.paymentMethod,
      },
    };
  }

  /**
   * 결제 완료 이벤트 생성
   */
  createOrderPaymentCompletedEvent(
    orderId: string,
    payload: {
      orderNumber: string;
      userId: string;
      totalAmount: number;
      paymentId: string;
      paymentMethod: string;
      paymentProvider: string;
      transactionId: string;
      paidAt: string;
    },
    correlationId?: string
  ): OrderPaymentCompletedEvent {
    return {
      ...this.createBaseEvent('OrderPaymentCompleted', orderId, correlationId),
      payload: {
        orderId,
        orderNumber: payload.orderNumber,
        userId: payload.userId,
        totalAmount: payload.totalAmount,
        paymentId: payload.paymentId,
        paymentMethod: payload.paymentMethod,
        paymentProvider: payload.paymentProvider,
        transactionId: payload.transactionId,
        paidAt: payload.paidAt,
      },
    };
  }

  /**
   * 주문 상태 업데이트 이벤트 생성
   */
  createOrderStatusUpdatedEvent(
    orderId: string,
    payload: {
      orderNumber: string;
      userId: string;
      previousStatus: string;
      newStatus: string;
      reason?: string;
      updatedBy: string;
      estimatedDeliveryDate?: string;
      trackingNumber?: string;
    },
    correlationId?: string
  ): OrderStatusUpdatedEvent {
    return {
      ...this.createBaseEvent('OrderStatusUpdated', orderId, correlationId),
      payload: {
        orderId,
        orderNumber: payload.orderNumber,
        userId: payload.userId,
        previousStatus: payload.previousStatus,
        newStatus: payload.newStatus,
        reason: payload.reason,
        updatedBy: payload.updatedBy,
        estimatedDeliveryDate: payload.estimatedDeliveryDate,
        trackingNumber: payload.trackingNumber,
      },
    };
  }

  /**
   * 주문 취소 이벤트 생성
   */
  createOrderCancelledEvent(
    orderId: string,
    payload: {
      orderNumber: string;
      userId: string;
      totalAmount: number;
      cancelReason: string;
      cancelledBy: string;
      refundRequired: boolean;
      refundAmount?: number;
      items: Array<{
        productId: string;
        sku: string;
        quantity: number;
      }>;
    },
    correlationId?: string
  ): OrderCancelledEvent {
    return {
      ...this.createBaseEvent('OrderCancelled', orderId, correlationId),
      payload: {
        orderId,
        orderNumber: payload.orderNumber,
        userId: payload.userId,
        totalAmount: payload.totalAmount,
        cancelReason: payload.cancelReason,
        cancelledBy: payload.cancelledBy,
        refundRequired: payload.refundRequired,
        refundAmount: payload.refundAmount,
        items: payload.items,
      },
    };
  }

  // ========================================
  // Cart Service Events
  // ========================================

  /**
   * 장바구니 아이템 추가 이벤트 생성
   */
  createCartItemAddedEvent(
    cartId: string,
    payload: {
      userId?: string;
      sessionId?: string;
      productId: string;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalItems: number;
      totalAmount: number;
    },
    correlationId?: string
  ): CartItemAddedEvent {
    return {
      ...this.createBaseEvent('CartItemAdded', cartId, correlationId),
      payload: {
        cartId,
        userId: payload.userId,
        sessionId: payload.sessionId,
        productId: payload.productId,
        sku: payload.sku,
        productName: payload.productName,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        totalItems: payload.totalItems,
        totalAmount: payload.totalAmount,
      },
    };
  }

  /**
   * 장바구니 포기 이벤트 생성
   */
  createCartAbandonedEvent(
    cartId: string,
    payload: {
      userId?: string;
      sessionId?: string;
      items: Array<{
        productId: string;
        sku: string;
        productName: string;
        quantity: number;
        unitPrice: number;
      }>;
      totalAmount: number;
      lastActiveAt: string;
      abandonedDurationMinutes: number;
    },
    correlationId?: string
  ): CartAbandonedEvent {
    return {
      ...this.createBaseEvent('CartAbandoned', cartId, correlationId),
      payload: {
        cartId,
        userId: payload.userId,
        sessionId: payload.sessionId,
        items: payload.items,
        totalAmount: payload.totalAmount,
        lastActiveAt: payload.lastActiveAt,
        abandonedDurationMinutes: payload.abandonedDurationMinutes,
      },
    };
  }

  // ========================================
  // System Events
  // ========================================

  /**
   * 서비스 시작 이벤트 생성
   */
  createServiceStartedEvent(
    instanceId: string,
    payload: {
      serviceName: string;
      version: string;
      environment: string;
      startedAt: string;
    },
    correlationId?: string
  ): ServiceStartedEvent {
    return {
      ...this.createBaseEvent('ServiceStarted', instanceId, correlationId),
      payload: {
        serviceName: payload.serviceName,
        version: payload.version,
        environment: payload.environment,
        instanceId,
        startedAt: payload.startedAt,
      },
    };
  }

  /**
   * 서비스 종료 이벤트 생성
   */
  createServiceStoppedEvent(
    instanceId: string,
    payload: {
      serviceName: string;
      stoppedAt: string;
      reason: string;
    },
    correlationId?: string
  ): ServiceStoppedEvent {
    return {
      ...this.createBaseEvent('ServiceStopped', instanceId, correlationId),
      payload: {
        serviceName: payload.serviceName,
        instanceId,
        stoppedAt: payload.stoppedAt,
        reason: payload.reason,
      },
    };
  }

  // ========================================
  // 유틸리티 메소드
  // ========================================

  /**
   * 서비스 이름 변경
   */
  setServiceName(serviceName: string): void {
    this.serviceName = serviceName;
  }

  /**
   * 이벤트 버전 변경
   */
  setVersion(version: string): void {
    this.version = version;
  }

  /**
   * 현재 설정된 서비스 이름 조회
   */
  getServiceName(): string {
    return this.serviceName;
  }

  /**
   * 현재 설정된 이벤트 버전 조회
   */
  getVersion(): string {
    return this.version;
  }
}