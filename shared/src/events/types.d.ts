export interface BaseEvent {
    eventType: string;
    version: string;
    eventId: string;
    aggregateId: string;
    timestamp: string;
    correlationId?: string;
    causationId?: string;
}
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
export interface UserDeactivatedEvent extends BaseEvent {
    eventType: 'UserDeactivated';
    payload: {
        userId: string;
        reason: string;
        deactivatedBy: string;
    };
}
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
export interface StockUpdatedEvent extends BaseEvent {
    eventType: 'StockUpdated';
    payload: {
        productId: string;
        sku: string;
        previousQuantity: number;
        newQuantity: number;
        availableQuantity: number;
        changeReason: 'purchase' | 'restock' | 'adjustment' | 'return' | 'damage';
        orderId?: string;
        updatedBy: string;
        location: string;
    };
}
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
export interface ServiceStoppedEvent extends BaseEvent {
    eventType: 'ServiceStopped';
    payload: {
        serviceName: string;
        instanceId: string;
        stoppedAt: string;
        reason: string;
    };
}
export type DomainEvent = UserRegisteredEvent | UserUpdatedEvent | UserDeactivatedEvent | ProductAddedEvent | ProductUpdatedEvent | StockUpdatedEvent | LowStockAlertEvent | OrderCreatedEvent | OrderPaymentCompletedEvent | OrderStatusUpdatedEvent | OrderCancelledEvent | CartItemAddedEvent | CartAbandonedEvent | ServiceStartedEvent | ServiceStoppedEvent;
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
export declare const KAFKA_TOPICS: {
    readonly USER_EVENTS: "user-events";
    readonly PRODUCT_EVENTS: "product-events";
    readonly ORDER_EVENTS: "order-events";
    readonly CART_EVENTS: "cart-events";
    readonly SYSTEM_EVENTS: "system-events";
    readonly NOTIFICATION_EVENTS: "notification-events";
    readonly DEAD_LETTER_QUEUE: "dead-letter-queue";
};
export declare const TOPIC_EVENT_MAPPING: {
    readonly "user-events": readonly ["UserRegistered", "UserUpdated", "UserDeactivated"];
    readonly "product-events": readonly ["ProductAdded", "ProductUpdated", "StockUpdated", "LowStockAlert"];
    readonly "order-events": readonly ["OrderCreated", "OrderPaymentCompleted", "OrderStatusUpdated", "OrderCancelled"];
    readonly "cart-events": readonly ["CartItemAdded", "CartAbandoned"];
    readonly "system-events": readonly ["ServiceStarted", "ServiceStopped"];
};
//# sourceMappingURL=types.d.ts.map