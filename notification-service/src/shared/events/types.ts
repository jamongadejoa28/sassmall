// ========================================
// Event Types for Microservice Shopping Mall
// CLAUDE.md 요구사항에 따른 이벤트 스키마 정의
// ========================================

/**
 * 기본 이벤트 인터페이스
 * 모든 도메인 이벤트가 구현해야 하는 기본 구조
 */
export interface BaseEvent {
  eventType: string;
  version: string;
  eventId: string;
  aggregateId: string;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
}

// ========================================
// User Service Events
// ========================================

/**
 * 사용자 등록 이벤트
 * 새로운 사용자가 시스템에 등록되었을 때 발생
 */
export interface UserRegisteredEvent extends BaseEvent {
  eventType: 'UserRegistered';
  payload: {
    userId: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    registrationSource: 'web' | 'mobile' | 'admin';
  };
}

/**
 * 사용자 정보 업데이트 이벤트
 * 사용자 프로필이 수정되었을 때 발생
 */
export interface UserUpdatedEvent extends BaseEvent {
  eventType: 'UserUpdated';
  payload: {
    userId: string;
    updatedFields: {
      name?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
    };
    previousValues: {
      name?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
    };
  };
}

/**
 * 사용자 비활성화 이벤트
 * 사용자 계정이 비활성화되었을 때 발생
 */
export interface UserDeactivatedEvent extends BaseEvent {
  eventType: 'UserDeactivated';
  payload: {
    userId: string;
    reason: string;
    deactivatedBy: string;
  };
}

// ========================================
// Product Service Events
// ========================================

/**
 * 상품 추가 이벤트
 * 새로운 상품이 등록되었을 때 발생
 */
export interface ProductAddedEvent extends BaseEvent {
  eventType: 'ProductAdded';
  payload: {
    productId: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    brand: string;
    sku: string;
    categoryId: string;
    categoryName: string;
    isActive: boolean;
    isFeatured: boolean;
    createdBy: string;
  };
}

/**
 * 상품 정보 업데이트 이벤트
 * 상품 정보가 수정되었을 때 발생
 */
export interface ProductUpdatedEvent extends BaseEvent {
  eventType: 'ProductUpdated';
  payload: {
    productId: string;
    updatedFields: {
      name?: string;
      description?: string;
      price?: number;
      originalPrice?: number;
      isActive?: boolean;
      isFeatured?: boolean;
    };
    previousValues: Record<string, any>;
    updatedBy: string;
  };
}

/**
 * 재고 업데이트 이벤트
 * 상품 재고가 변경되었을 때 발생
 */
export interface StockUpdatedEvent extends BaseEvent {
  eventType: 'StockUpdated';
  payload: {
    productId: string;
    sku: string;
    previousQuantity: number;
    newQuantity: number;
    availableQuantity: number;
    changeReason: 'purchase' | 'restock' | 'adjustment' | 'return' | 'damage';
    orderId?: string; // 구매로 인한 재고 감소인 경우
    updatedBy: string;
    location: string;
  };
}

/**
 * 재고 부족 경고 이벤트
 * 재고가 임계점 이하로 떨어졌을 때 발생
 */
export interface LowStockAlertEvent extends BaseEvent {
  eventType: 'LowStockAlert';
  payload: {
    productId: string;
    sku: string;
    productName: string;
    currentQuantity: number;
    lowStockThreshold: number;
    location: string;
    urgencyLevel: 'warning' | 'critical';
  };
}

// ========================================
// Order Service Events  
// ========================================

/**
 * 주문 생성 이벤트
 * 새로운 주문이 생성되었을 때 발생
 */
export interface OrderCreatedEvent extends BaseEvent {
  eventType: 'OrderCreated';
  payload: {
    orderId: string;
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
  };
}

/**
 * 결제 완료 이벤트
 * 주문 결제가 성공적으로 완료되었을 때 발생
 */
export interface OrderPaymentCompletedEvent extends BaseEvent {
  eventType: 'OrderPaymentCompleted';
  payload: {
    orderId: string;
    orderNumber: string;
    userId: string;
    totalAmount: number;
    paymentId: string;
    paymentMethod: string;
    paymentProvider: string;
    transactionId: string;
    paidAt: string;
  };
}

/**
 * 주문 상태 변경 이벤트
 * 주문 상태가 변경되었을 때 발생
 */
export interface OrderStatusUpdatedEvent extends BaseEvent {
  eventType: 'OrderStatusUpdated';
  payload: {
    orderId: string;
    orderNumber: string;
    userId: string;
    previousStatus: string;
    newStatus: string;
    reason?: string;
    updatedBy: string;
    estimatedDeliveryDate?: string;
    trackingNumber?: string;
  };
}

/**
 * 주문 취소 이벤트
 * 주문이 취소되었을 때 발생
 */
export interface OrderCancelledEvent extends BaseEvent {
  eventType: 'OrderCancelled';
  payload: {
    orderId: string;
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
  };
}

// ========================================
// Cart Service Events
// ========================================

/**
 * 장바구니에 상품 추가 이벤트
 * 사용자가 장바구니에 상품을 추가했을 때 발생
 */
export interface CartItemAddedEvent extends BaseEvent {
  eventType: 'CartItemAdded';
  payload: {
    cartId: string;
    userId?: string;
    sessionId?: string;
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalItems: number;
    totalAmount: number;
  };
}

/**
 * 장바구니 포기 이벤트
 * 사용자가 일정 시간 이상 장바구니를 방치했을 때 발생 (마케팅 목적)
 */
export interface CartAbandonedEvent extends BaseEvent {
  eventType: 'CartAbandoned';
  payload: {
    cartId: string;
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
  };
}

// ========================================
// System Events
// ========================================

/**
 * 서비스 시작 이벤트
 * 마이크로서비스가 시작되었을 때 발생
 */
export interface ServiceStartedEvent extends BaseEvent {
  eventType: 'ServiceStarted';
  payload: {
    serviceName: string;
    version: string;
    environment: string;
    instanceId: string;
    startedAt: string;
  };
}

/**
 * 서비스 종료 이벤트
 * 마이크로서비스가 종료될 때 발생
 */
export interface ServiceStoppedEvent extends BaseEvent {
  eventType: 'ServiceStopped';
  payload: {
    serviceName: string;
    instanceId: string;
    stoppedAt: string;
    reason: string;
  };
}

// ========================================
// Event Union Types
// ========================================

/**
 * 모든 도메인 이벤트의 Union Type
 * 타입 안전성을 보장하기 위해 사용
 */
export type DomainEvent =
  // User Events
  | UserRegisteredEvent
  | UserUpdatedEvent
  | UserDeactivatedEvent
  // Product Events
  | ProductAddedEvent
  | ProductUpdatedEvent
  | StockUpdatedEvent
  | LowStockAlertEvent
  // Order Events
  | OrderCreatedEvent
  | OrderPaymentCompletedEvent
  | OrderStatusUpdatedEvent
  | OrderCancelledEvent
  // Cart Events
  | CartItemAddedEvent
  | CartAbandonedEvent
  // System Events
  | ServiceStartedEvent
  | ServiceStoppedEvent;

/**
 * 이벤트 타입별 맵핑
 * 타입 추론을 위한 도우미 타입
 */
export type EventTypeMap = {
  'UserRegistered': UserRegisteredEvent;
  'UserUpdated': UserUpdatedEvent;
  'UserDeactivated': UserDeactivatedEvent;
  'ProductAdded': ProductAddedEvent;
  'ProductUpdated': ProductUpdatedEvent;
  'StockUpdated': StockUpdatedEvent;
  'LowStockAlert': LowStockAlertEvent;
  'OrderCreated': OrderCreatedEvent;
  'OrderPaymentCompleted': OrderPaymentCompletedEvent;
  'OrderStatusUpdated': OrderStatusUpdatedEvent;
  'OrderCancelled': OrderCancelledEvent;
  'CartItemAdded': CartItemAddedEvent;
  'CartAbandoned': CartAbandonedEvent;
  'ServiceStarted': ServiceStartedEvent;
  'ServiceStopped': ServiceStoppedEvent;
};

/**
 * Kafka 토픽 정의
 * CLAUDE.md 요구사항에 따른 도메인별 토픽 구조
 */
export const KAFKA_TOPICS = {
  // 도메인별 토픽
  USER_EVENTS: 'user-events',
  PRODUCT_EVENTS: 'product-events',
  ORDER_EVENTS: 'order-events',
  CART_EVENTS: 'cart-events',
  SYSTEM_EVENTS: 'system-events',
  
  // 알림용 토픽 (Notification Service에서 구독)
  NOTIFICATION_EVENTS: 'notification-events',
  
  // Dead Letter Queue (처리 실패 이벤트)
  DEAD_LETTER_QUEUE: 'dead-letter-queue',
} as const;

/**
 * 토픽별 이벤트 맵핑
 * 각 토픽에서 어떤 이벤트들이 발행되는지 정의
 */
export const TOPIC_EVENT_MAPPING = {
  [KAFKA_TOPICS.USER_EVENTS]: [
    'UserRegistered',
    'UserUpdated', 
    'UserDeactivated'
  ],
  [KAFKA_TOPICS.PRODUCT_EVENTS]: [
    'ProductAdded',
    'ProductUpdated',
    'StockUpdated',
    'LowStockAlert'
  ],
  [KAFKA_TOPICS.ORDER_EVENTS]: [
    'OrderCreated',
    'OrderPaymentCompleted',
    'OrderStatusUpdated',
    'OrderCancelled'
  ],
  [KAFKA_TOPICS.CART_EVENTS]: [
    'CartItemAdded',
    'CartAbandoned'
  ],
  [KAFKA_TOPICS.SYSTEM_EVENTS]: [
    'ServiceStarted',
    'ServiceStopped'
  ]
} as const;