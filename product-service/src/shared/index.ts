// ========================================
// Shared Module Entry Point
// ========================================

// 타입 내보내기 (중복 타입 제외)
export {
  ApiResponse,
  HTTP_STATUS,
  ErrorCode,
  UserRole,
  User,
  TokenPair,
  JwtPayload,
  Product,
  Category,
  OrderStatus,
  OrderItem,
  Order,
  Address,
  PaginationParams,
  PaginatedResponse,
  JwtConfig
} from './types';

// 설정 타입을 명시적으로 내보내기
export {
  ServiceConfig,
  DatabaseConfig,
  RedisConfig,
  AuthConfig,
  SERVICE_REGISTRY,
  getServiceConfig,
  getServiceUrl,
  getAllServiceUrls,
  HealthCheckConfig,
  DEFAULT_HEALTH_CHECK,
  DATABASE_DEFAULTS,
  REDIS_DEFAULTS,
  RATE_LIMIT_CONFIG,
  CORS_CONFIG
} from './config/serviceConfig';

// 유틸리티 내보내기
export * from './utils';

// 미들웨어 내보내기
export * from './middleware/authMiddleware';
export * from './middleware/errorHandler';
export * from './utils/validation';

// 부트스트랩 내보내기
export * from './utils/serviceBootstrap';

// 이벤트 시스템 내보내기 (Kafka 이벤트 드리븐 아키텍처)
export * from './events';

// ========================================
// 버전 정보
// ========================================
export const VERSION = '1.0.0';

// ========================================
// 환경별 설정 기본값
// ========================================
export const DEFAULT_CONFIG = {
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // requests per window
} as const;