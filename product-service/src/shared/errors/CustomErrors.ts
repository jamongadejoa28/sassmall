// ========================================
// 커스텀 에러 클래스 정의
// src/shared/errors/CustomErrors.ts
// ========================================

import { DomainError } from './DomainError';

/**
 * 데이터베이스 관련 에러
 */
export class DatabaseError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

/**
 * 캐시 관련 에러
 */
export class CacheError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'CACHE_ERROR', 500, details);
  }
}

/**
 * 인증 관련 에러
 */
export class AuthenticationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * 권한 관련 에러
 */
export class AuthorizationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

/**
 * 외부 서비스 관련 에러
 */
export class ExternalServiceError extends DomainError {
  constructor(message: string, serviceName: string, details?: any) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 503, { serviceName, ...details });
  }
}

/**
 * 설정 관련 에러
 */
export class ConfigurationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

/**
 * 타임아웃 에러
 */
export class TimeoutError extends DomainError {
  constructor(message: string, timeout: number, details?: any) {
    super(message, 'TIMEOUT_ERROR', 504, { timeout, ...details });
  }
}

/**
 * 리소스 부족 에러
 */
export class ResourceExhaustedError extends DomainError {
  constructor(message: string, resource: string, details?: any) {
    super(message, 'RESOURCE_EXHAUSTED_ERROR', 503, { resource, ...details });
  }
}

/**
 * 네트워크 관련 에러
 */
export class NetworkError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
  }
}

/**
 * 데이터 형식 관련 에러
 */
export class DataFormatError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_FORMAT_ERROR', 422, details);
  }
}