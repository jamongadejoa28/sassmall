"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPIC_EVENT_MAPPING = exports.KAFKA_TOPICS = void 0;
exports.KAFKA_TOPICS = {
    USER_EVENTS: 'user-events',
    PRODUCT_EVENTS: 'product-events',
    ORDER_EVENTS: 'order-events',
    CART_EVENTS: 'cart-events',
    SYSTEM_EVENTS: 'system-events',
    NOTIFICATION_EVENTS: 'notification-events',
    DEAD_LETTER_QUEUE: 'dead-letter-queue',
};
exports.TOPIC_EVENT_MAPPING = {
    [exports.KAFKA_TOPICS.USER_EVENTS]: [
        'UserRegistered',
        'UserUpdated',
        'UserDeactivated'
    ],
    [exports.KAFKA_TOPICS.PRODUCT_EVENTS]: [
        'ProductAdded',
        'ProductUpdated',
        'StockUpdated',
        'LowStockAlert'
    ],
    [exports.KAFKA_TOPICS.ORDER_EVENTS]: [
        'OrderCreated',
        'OrderPaymentCompleted',
        'OrderStatusUpdated',
        'OrderCancelled'
    ],
    [exports.KAFKA_TOPICS.CART_EVENTS]: [
        'CartItemAdded',
        'CartAbandoned'
    ],
    [exports.KAFKA_TOPICS.SYSTEM_EVENTS]: [
        'ServiceStarted',
        'ServiceStopped'
    ]
};
//# sourceMappingURL=types.js.map