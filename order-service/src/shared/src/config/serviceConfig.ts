// ========================================
// Shared Service Configuration
// shared/src/config/serviceConfig.ts
// ========================================

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

// ========================================
// Service Registry
// ========================================

export const SERVICE_REGISTRY = {
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
      db: 1, // Use different Redis DB for products
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
      db: 2, // Use different Redis DB for cart
    },
  },
  CLIENT: {
    name: 'client',
    port: 3000,
    healthPath: '/health',
    basePath: '/',
  },
} as const;

// ========================================
// Environment-based Configuration
// ========================================

export function getServiceConfig(serviceName: keyof typeof SERVICE_REGISTRY): ServiceConfig {
  const baseConfig = SERVICE_REGISTRY[serviceName];
  
  return {
    ...baseConfig,
    database: (baseConfig as any).database ? {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production',
      logging: process.env.NODE_ENV === 'development',
      ...(baseConfig as any).database,
    } : undefined,
    redis: (baseConfig as any).redis ? {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetries: 3,
      retryDelay: 1000,
      ...(baseConfig as any).redis,
    } : undefined,
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
      tokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: baseConfig.name,
    },
  };
}

// ========================================
// Service Discovery Helpers
// ========================================

export function getServiceUrl(serviceName: keyof typeof SERVICE_REGISTRY): string {
  const config = SERVICE_REGISTRY[serviceName];
  const host = process.env.NODE_ENV === 'production' 
    ? process.env[`${serviceName}_HOST`] || 'localhost'
    : 'localhost';
  
  return `http://${host}:${config.port}`;
}

export function getAllServiceUrls(): Record<string, string> {
  return Object.keys(SERVICE_REGISTRY).reduce((acc, serviceName) => {
    acc[serviceName] = getServiceUrl(serviceName as keyof typeof SERVICE_REGISTRY);
    return acc;
  }, {} as Record<string, string>);
}

// ========================================
// Health Check Configuration
// ========================================

export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
}

export const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
  timeout: 5000, // 5 seconds
  retries: 3,
  interval: 30000, // 30 seconds
};

// ========================================
// Common Database Settings
// ========================================

export const DATABASE_DEFAULTS = {
  maxConnections: 10,
  connectionTimeout: 30000,
  idleTimeout: 10000,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
} as const;

// ========================================
// Common Redis Settings
// ========================================

export const REDIS_DEFAULTS = {
  connectTimeout: 10000,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  showFriendlyErrorStack: true,
} as const;

// ========================================
// Rate Limiting Configuration
// ========================================

export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// ========================================
// CORS Configuration
// ========================================

export const CORS_CONFIG = {
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