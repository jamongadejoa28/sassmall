export { ApiResponse, HTTP_STATUS, ErrorCode, UserRole, User, TokenPair, JwtPayload, Product, Category, OrderStatus, OrderItem, Order, Address, PaginationParams, PaginatedResponse, JwtConfig } from './types';
export { ServiceConfig, DatabaseConfig, RedisConfig, AuthConfig, SERVICE_REGISTRY, getServiceConfig, getServiceUrl, getAllServiceUrls, HealthCheckConfig, DEFAULT_HEALTH_CHECK, DATABASE_DEFAULTS, REDIS_DEFAULTS, RATE_LIMIT_CONFIG, CORS_CONFIG } from './config/serviceConfig';
export * from './utils';
export * from './middleware/authMiddleware';
export * from './middleware/errorHandler';
export * from './utils/validation';
export * from './utils/serviceBootstrap';
export * from './events';
export declare const VERSION = "1.0.0";
export declare const DEFAULT_CONFIG: {
    readonly JWT_EXPIRES_IN: "15m";
    readonly JWT_REFRESH_EXPIRES_IN: "7d";
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly MAX_PAGE_SIZE: 100;
    readonly LOG_LEVEL: "info";
    readonly RATE_LIMIT_WINDOW: number;
    readonly RATE_LIMIT_MAX: 100;
};
//# sourceMappingURL=index.d.ts.map