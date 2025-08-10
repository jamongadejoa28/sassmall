"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_CONFIG = exports.RATE_LIMIT_CONFIG = exports.REDIS_DEFAULTS = exports.DATABASE_DEFAULTS = exports.DEFAULT_HEALTH_CHECK = exports.SERVICE_REGISTRY = void 0;
exports.getServiceConfig = getServiceConfig;
exports.getServiceUrl = getServiceUrl;
exports.getAllServiceUrls = getAllServiceUrls;
exports.SERVICE_REGISTRY = {
    API_GATEWAY: {
        name: 'api-gateway',
        port: 3001,
        healthPath: '/health',
        basePath: '/api/v1',
    },
    USER_SERVICE: {
        name: 'user-service',
        port: 3002,
        healthPath: '/health',
        basePath: '/api/users',
        database: {
            database: 'user_service_db',
        },
    },
    PRODUCT_SERVICE: {
        name: 'product-service',
        port: 3003,
        healthPath: '/health',
        basePath: '/api/v1/products',
        database: {
            database: 'product_service_db',
        },
        redis: {
            db: 1,
        },
    },
    ORDER_SERVICE: {
        name: 'order-service',
        port: 3004,
        healthPath: '/health',
        basePath: '/api/orders',
        database: {
            database: 'order_service_db',
        },
    },
    CART_SERVICE: {
        name: 'cart-service',
        port: 3006,
        healthPath: '/health',
        basePath: '/api/v1/cart',
        redis: {
            db: 2,
        },
    },
    CLIENT: {
        name: 'client',
        port: 3000,
        healthPath: '/health',
        basePath: '/',
    },
};
function getServiceConfig(serviceName) {
    const baseConfig = exports.SERVICE_REGISTRY[serviceName];
    return {
        ...baseConfig,
        database: baseConfig.database ? {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.NODE_ENV === 'production',
            logging: process.env.NODE_ENV === 'development',
            ...baseConfig.database,
        } : undefined,
        redis: baseConfig.redis ? {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            maxRetries: 3,
            retryDelay: 1000,
            ...baseConfig.redis,
        } : undefined,
        auth: {
            jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
            tokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
            refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            issuer: baseConfig.name,
        },
    };
}
function getServiceUrl(serviceName) {
    const config = exports.SERVICE_REGISTRY[serviceName];
    const host = process.env.NODE_ENV === 'production'
        ? process.env[`${serviceName}_HOST`] || 'localhost'
        : 'localhost';
    return `http://${host}:${config.port}`;
}
function getAllServiceUrls() {
    return Object.keys(exports.SERVICE_REGISTRY).reduce((acc, serviceName) => {
        acc[serviceName] = getServiceUrl(serviceName);
        return acc;
    }, {});
}
exports.DEFAULT_HEALTH_CHECK = {
    timeout: 5000,
    retries: 3,
    interval: 30000,
};
exports.DATABASE_DEFAULTS = {
    maxConnections: 10,
    connectionTimeout: 30000,
    idleTimeout: 10000,
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
};
exports.REDIS_DEFAULTS = {
    connectTimeout: 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    showFriendlyErrorStack: true,
};
exports.RATE_LIMIT_CONFIG = {
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
        success: false,
        error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'TOO_MANY_REQUESTS',
    },
    standardHeaders: true,
    legacyHeaders: false,
};
exports.CORS_CONFIG = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Session-ID',
        'X-Request-ID',
    ],
};
//# sourceMappingURL=serviceConfig.js.map