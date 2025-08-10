"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventFactory = void 0;
const uuid_1 = require("uuid");
class EventFactory {
    constructor(serviceName = 'unknown-service', version = '1.0.0') {
        this.serviceName = serviceName;
        this.version = version;
    }
    createBaseEvent(eventType, aggregateId, correlationId, causationId) {
        return {
            eventType,
            version: this.version,
            eventId: (0, uuid_1.v4)(),
            aggregateId,
            timestamp: new Date().toISOString(),
            correlationId: correlationId || (0, uuid_1.v4)(),
            causationId: causationId,
        };
    }
    createUserRegisteredEvent(userId, payload, correlationId) {
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
    createUserUpdatedEvent(userId, updatedFields, previousValues, correlationId) {
        return {
            ...this.createBaseEvent('UserUpdated', userId, correlationId),
            payload: {
                userId,
                updatedFields,
                previousValues,
            },
        };
    }
    createUserDeactivatedEvent(userId, reason, deactivatedBy, correlationId) {
        return {
            ...this.createBaseEvent('UserDeactivated', userId, correlationId),
            payload: {
                userId,
                reason,
                deactivatedBy,
            },
        };
    }
    createProductAddedEvent(productId, payload, correlationId) {
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
    createProductUpdatedEvent(productId, updatedFields, previousValues, updatedBy, correlationId) {
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
    createStockUpdatedEvent(productId, payload, correlationId) {
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
    createLowStockAlertEvent(productId, payload, correlationId) {
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
    createOrderCreatedEvent(orderId, payload, correlationId) {
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
    createOrderPaymentCompletedEvent(orderId, payload, correlationId) {
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
    createOrderStatusUpdatedEvent(orderId, payload, correlationId) {
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
    createOrderCancelledEvent(orderId, payload, correlationId) {
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
    createCartItemAddedEvent(cartId, payload, correlationId) {
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
    createCartAbandonedEvent(cartId, payload, correlationId) {
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
    createServiceStartedEvent(instanceId, payload, correlationId) {
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
    createServiceStoppedEvent(instanceId, payload, correlationId) {
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
    setServiceName(serviceName) {
        this.serviceName = serviceName;
    }
    setVersion(version) {
        this.version = version;
    }
    getServiceName() {
        return this.serviceName;
    }
    getVersion() {
        return this.version;
    }
}
exports.EventFactory = EventFactory;
//# sourceMappingURL=EventFactory.js.map