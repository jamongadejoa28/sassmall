export interface ApiResponse<T = any> {
    success: boolean;
    data: T | null;
    message?: string;
    error?: string;
    timestamp: string;
    requestId: string;
}
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
    CONFLICT_ERROR = "CONFLICT_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export declare enum UserRole {
    ADMIN = "admin",
    CUSTOMER = "customer"
}
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    jti?: string;
    iat?: number;
    exp?: number;
}
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    stock: number;
    rating: number;
    reviewCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Category {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum OrderStatus {
    PENDING = "pending",
    PAID = "paid",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}
export interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
}
export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    shippingAddress: Address;
    paymentMethod: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface JwtConfig {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
}
//# sourceMappingURL=index.d.ts.map