// ========================================
// Shared Types - API 공통 타입 정의
// src/shared/types/index.ts
// ========================================

/**
 * 표준 API 응답 형식
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
  timestamp: string;
  requestId: string;
  pagination?: PaginationMeta;
}

/**
 * 페이지네이션 메타 정보
 */
export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * 도메인 에러 클래스
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "DomainError";
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/**
 * Repository 에러 클래스
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = "RepositoryError";
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}

/**
 * 성공/실패 Result 패턴
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string | Error;
}

/**
 * UseCase 기본 인터페이스
 */
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse>>;
}

/**
 * HTTP 헤더 상수
 */
export const HTTP_HEADERS = {
  REQUEST_ID: "x-request-id",
  CORRELATION_ID: "x-correlation-id",
  USER_ID: "x-user-id",
} as const;

/**
 * HTTP 상태 코드 상수
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * 에러 코드 상수
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  DUPLICATE_SKU: "DUPLICATE_SKU",
  INVALID_INPUT: "INVALID_INPUT",
} as const;
