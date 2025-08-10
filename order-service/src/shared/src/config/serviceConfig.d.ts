export interface ServiceConfig {
    name: string;
    port: number;
    healthPath: string;
    basePath: string;
    database?: DatabaseConfig;
    redis?: RedisConfig;
    auth?: AuthConfig;
}
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    logging?: boolean;
}
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetries?: number;
    retryDelay?: number;
}
export interface AuthConfig {
    jwtSecret: string;
    tokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
}
export declare const SERVICE_REGISTRY: {
    readonly API_GATEWAY: {
        readonly name: "api-gateway";
        readonly port: 3001;
        readonly healthPath: "/health";
        readonly basePath: "/api/v1";
    };
    readonly USER_SERVICE: {
        readonly name: "user-service";
        readonly port: 3002;
        readonly healthPath: "/health";
        readonly basePath: "/api/users";
        readonly database: {
            readonly database: "user_service_db";
        };
    };
    readonly PRODUCT_SERVICE: {
        readonly name: "product-service";
        readonly port: 3003;
        readonly healthPath: "/health";
        readonly basePath: "/api/v1/products";
        readonly database: {
            readonly database: "product_service_db";
        };
        readonly redis: {
            readonly db: 1;
        };
    };
    readonly ORDER_SERVICE: {
        readonly name: "order-service";
        readonly port: 3004;
        readonly healthPath: "/health";
        readonly basePath: "/api/orders";
        readonly database: {
            readonly database: "order_service_db";
        };
    };
    readonly CART_SERVICE: {
        readonly name: "cart-service";
        readonly port: 3006;
        readonly healthPath: "/health";
        readonly basePath: "/api/v1/cart";
        readonly redis: {
            readonly db: 2;
        };
    };
    readonly CLIENT: {
        readonly name: "client";
        readonly port: 3000;
        readonly healthPath: "/health";
        readonly basePath: "/";
    };
};
export declare function getServiceConfig(serviceName: keyof typeof SERVICE_REGISTRY): ServiceConfig;
export declare function getServiceUrl(serviceName: keyof typeof SERVICE_REGISTRY): string;
export declare function getAllServiceUrls(): Record<string, string>;
export interface HealthCheckConfig {
    timeout: number;
    retries: number;
    interval: number;
}
export declare const DEFAULT_HEALTH_CHECK: HealthCheckConfig;
export declare const DATABASE_DEFAULTS: {
    readonly maxConnections: 10;
    readonly connectionTimeout: 30000;
    readonly idleTimeout: 10000;
    readonly synchronize: boolean;
    readonly logging: boolean;
    readonly entities: readonly ["src/**/*.entity.ts"];
    readonly migrations: readonly ["src/migrations/*.ts"];
};
export declare const REDIS_DEFAULTS: {
    readonly connectTimeout: 10000;
    readonly lazyConnect: true;
    readonly maxRetriesPerRequest: 3;
    readonly retryDelayOnFailover: 100;
    readonly enableReadyCheck: false;
    readonly showFriendlyErrorStack: true;
};
export declare const RATE_LIMIT_CONFIG: {
    windowMs: number;
    max: number;
    message: {
        success: boolean;
        error: string;
        code: string;
    };
    standardHeaders: boolean;
    legacyHeaders: boolean;
};
export declare const CORS_CONFIG: {
    origin: string;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
};
//# sourceMappingURL=serviceConfig.d.ts.map