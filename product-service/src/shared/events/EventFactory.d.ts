import { UserRegisteredEvent, UserUpdatedEvent, UserDeactivatedEvent, ProductAddedEvent, ProductUpdatedEvent, StockUpdatedEvent, LowStockAlertEvent, OrderCreatedEvent, OrderPaymentCompletedEvent, OrderStatusUpdatedEvent, OrderCancelledEvent, CartItemAddedEvent, CartAbandonedEvent, ServiceStartedEvent, ServiceStoppedEvent } from './types';
export declare class EventFactory {
    private serviceName;
    private version;
    constructor(serviceName?: string, version?: string);
    private createBaseEvent;
    createUserRegisteredEvent(userId: string, payload: {
        email: string;
        name: string;
        role: string;
        isActive?: boolean;
        registrationSource?: 'web' | 'mobile' | 'admin';
    }, correlationId?: string): UserRegisteredEvent;
    createUserUpdatedEvent(userId: string, updatedFields: Record<string, any>, previousValues: Record<string, any>, correlationId?: string): UserUpdatedEvent;
    createUserDeactivatedEvent(userId: string, reason: string, deactivatedBy: string, correlationId?: string): UserDeactivatedEvent;
    createProductAddedEvent(productId: string, payload: {
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
    }, correlationId?: string): ProductAddedEvent;
    createProductUpdatedEvent(productId: string, updatedFields: Record<string, any>, previousValues: Record<string, any>, updatedBy: string, correlationId?: string): ProductUpdatedEvent;
    createStockUpdatedEvent(productId: string, payload: {
        sku: string;
        previousQuantity: number;
        newQuantity: number;
        availableQuantity: number;
        changeReason: 'purchase' | 'restock' | 'adjustment' | 'return' | 'damage';
        orderId?: string;
        updatedBy: string;
        location: string;
    }, correlationId?: string): StockUpdatedEvent;
    createLowStockAlertEvent(productId: string, payload: {
        sku: string;
        productName: string;
        currentQuantity: number;
        lowStockThreshold: number;
        location: string;
        urgencyLevel: 'warning' | 'critical';
    }, correlationId?: string): LowStockAlertEvent;
    createOrderCreatedEvent(orderId: string, payload: {
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
    }, correlationId?: string): OrderCreatedEvent;
    createOrderPaymentCompletedEvent(orderId: string, payload: {
        orderNumber: string;
        userId: string;
        totalAmount: number;
        paymentId: string;
        paymentMethod: string;
        paymentProvider: string;
        transactionId: string;
        paidAt: string;
    }, correlationId?: string): OrderPaymentCompletedEvent;
    createOrderStatusUpdatedEvent(orderId: string, payload: {
        orderNumber: string;
        userId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string;
        updatedBy: string;
        estimatedDeliveryDate?: string;
        trackingNumber?: string;
    }, correlationId?: string): OrderStatusUpdatedEvent;
    createOrderCancelledEvent(orderId: string, payload: {
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
    }, correlationId?: string): OrderCancelledEvent;
    createCartItemAddedEvent(cartId: string, payload: {
        userId?: string;
        sessionId?: string;
        productId: string;
        sku: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalItems: number;
        totalAmount: number;
    }, correlationId?: string): CartItemAddedEvent;
    createCartAbandonedEvent(cartId: string, payload: {
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
    }, correlationId?: string): CartAbandonedEvent;
    createServiceStartedEvent(instanceId: string, payload: {
        serviceName: string;
        version: string;
        environment: string;
        startedAt: string;
    }, correlationId?: string): ServiceStartedEvent;
    createServiceStoppedEvent(instanceId: string, payload: {
        serviceName: string;
        stoppedAt: string;
        reason: string;
    }, correlationId?: string): ServiceStoppedEvent;
    setServiceName(serviceName: string): void;
    setVersion(version: string): void;
    getServiceName(): string;
    getVersion(): string;
}
//# sourceMappingURL=EventFactory.d.ts.map