// api-gateway/src/middleware/errorhandler.ts

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
// Simple logger implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createLogger = (name: string) => console;
const logger = createLogger('api-gateway');

// ========================================
// 커스텀 에러 클래스들
// ========================================

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  public validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationAppError';
    this.validationErrors = validationErrors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalServerError';
  }
}

// ========================================
// 유효성 검사 에러 생성 헬퍼 함수
// ========================================

export const createValidationError = (
  message: string,
  validationErrors: ValidationError[]
): ValidationAppError => {
  return new ValidationAppError(message, validationErrors);
};

// ========================================
// 에러 응답 형식 정의
// ========================================

interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  requestId: string;
  stack?: string;
  details?: unknown;
}

// ========================================
// 에러 핸들러 미들웨어
// ========================================

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  // AppError 인스턴스인 경우
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'UNKNOWN_ERROR';

    // ValidationAppError인 경우 유효성 검사 세부사항 추가
    if (error instanceof ValidationAppError) {
      details = {
        validationErrors: error.validationErrors.map(err => ({
          field: err.type === 'field' ? err.path : undefined,
          message: err.msg,
          value: err.type === 'field' ? err.value : undefined,
        })),
      };
    }
  }
  // JWT 에러 처리
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }
  // Validation 에러 처리
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
  }
  // MongoDB 에러 처리
  else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }
  // Express-validator 에러 처리
  else if (error.name === 'ValidatorError') {
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
  }

  // 에러 로깅
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    statusCode,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.headers['x-request-id'] || 'unknown',
  };

  if (statusCode >= 500) {
    logger.error('Server Error', errorInfo);
  } else {
    logger.warn('Client Error', errorInfo);
  }

  // 에러 응답 생성
  const errorResponse: ErrorResponse = {
    success: false,
    error: message, // 에러 클래스명 대신 사용자 친화적 메시지 사용
    message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    requestId: (req.headers['x-request-id'] as string) || 'unknown',
  };

  // 유효성 검사 에러 세부사항 추가
  if (details) {
    errorResponse.details = details;
  }

  // 개발 환경에서만 스택 트레이스 포함
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// ========================================
// 404 에러 핸들러 (한국어 메시지로 수정)
// ========================================

export const notFoundHandler = (req: Request, res: Response): void => {
  // 한국어 메시지로 변경
  const error = new NotFoundError(
    `경로를 찾을 수 없습니다: ${req.originalUrl}`
  );

  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  const errorResponse: ErrorResponse = {
    success: false,
    error: error.message,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    timestamp: new Date().toISOString(),
    requestId: (req.headers['x-request-id'] as string) || 'unknown',
  };

  res.status(error.statusCode).json(errorResponse);
};

// ========================================
// 비동기 함수 에러 캐처
// ========================================

export const asyncHandler = (
  fn: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void | Response>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ========================================
// 프로세스 종료 핸들러
// ========================================

export const handleProcessExit = () => {
  // Graceful shutdown을 위한 프로세스 종료 핸들러
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // 서버 종료 로직
    process.exit(0);
  };

  // 시그널 핸들러 등록
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 처리되지 않은 예외 핸들러
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // 처리되지 않은 Promise 거부 핸들러
  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    }
  );
};
