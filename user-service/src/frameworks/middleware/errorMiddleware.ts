// ========================================
// Error Handler Middleware - Framework 계층
// src/framework/middleware/errorMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';

/**
 * 에러 타입 정의
 */
interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  originalError?: Error;
  service?: string;
}

/**
 * 에러 응답 형식
 */
interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  data: null;
  details?: any;
  stack?: string;
}

/**
 * 전역 에러 처리 미들웨어
 *
 * Express.js의 에러 핸들링 표준을 준수하여
 * 모든 에러를 통합 처리하고 일관된 응답 형식 제공
 *
 * 특징:
 * - Express 5.1.0 호환
 * - 개발/운영 환경별 다른 에러 정보 제공
 * - 보안 고려사항 적용
 * - 상세한 로깅
 */
export function globalErrorHandler() {
  return (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // 이미 응답이 시작된 경우 Express 기본 핸들러로 위임
    if (res.headersSent) {
      next(error);
      return;
    }

    // 에러 로깅
    logError(error, req);

    // 에러 타입별 처리
    const errorResponse = createErrorResponse(error, req);

    // HTTP 상태 코드 설정
    const statusCode = getStatusCode(error);

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * 404 Not Found 처리 미들웨어
 *
 * 모든 라우트를 거쳐도 매칭되지 않은 경우 호출
 */
export function notFoundHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const error: CustomError = new Error(
      `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`
    );
    error.statusCode = 404;
    error.code = 'ROUTE_NOT_FOUND';

    next(error);
  };
}

/**
 * 비동기 함수 에러 캐처 래퍼
 *
 * async/await 함수에서 발생한 에러를 자동으로 next()로 전달
 */
export function asyncErrorCatcher<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void>
) {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * HTTP 상태 코드 결정
 */
function getStatusCode(error: CustomError): number {
  // 명시적으로 설정된 상태 코드가 있으면 사용
  if (error.statusCode && error.statusCode >= 100 && error.statusCode < 600) {
    return error.statusCode;
  }

  // 에러 코드별 매핑
  switch (error.code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_USER_DATA':
    case 'EMAIL_REQUIRED':
    case 'PASSWORD_REQUIRED':
    case 'USER_ID_REQUIRED':
    case 'NO_UPDATE_DATA':
      return 400;

    case 'AUTHENTICATION_REQUIRED':
    case 'INVALID_TOKEN':
    case 'INVALID_CREDENTIALS':
      return 401;

    case 'ACCOUNT_DEACTIVATED':
    case 'EMAIL_NOT_VERIFIED':
    case 'INSUFFICIENT_PERMISSIONS':
    case 'ACCESS_DENIED':
      return 403;

    case 'USER_NOT_FOUND':
    case 'ROUTE_NOT_FOUND':
      return 404;

    case 'EMAIL_ALREADY_EXISTS':
    case 'ACCOUNT_ALREADY_DEACTIVATED':
      return 409;

    default:
      return 500;
  }
}

/**
 * 에러 응답 객체 생성
 */
function createErrorResponse(error: CustomError, req: Request): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // 기본 에러 응답
  const response: ErrorResponse = {
    success: false,
    message: getErrorMessage(error),
    error: error.code || 'INTERNAL_SERVER_ERROR',
    data: null,
  };

  // 개발 환경에서만 추가 정보 제공
  if (isDevelopment && !isTest) {
    // 스택 트레이스 추가 (타입 안전성 확보)
    if (error.stack) {
      response.stack = error.stack;
    }

    // 원본 에러 정보 추가
    if (error.originalError) {
      response.details = {
        originalError: {
          message: error.originalError.message,
          stack: error.originalError.stack,
        },
      };
    }

    // 서비스 정보 추가
    if (error.service) {
      response.details = {
        ...response.details,
        service: error.service,
      };
    }
  }

  return response;
}

/**
 * 사용자 친화적 에러 메시지 생성
 */
function getErrorMessage(error: CustomError): string {
  // 운영 환경에서는 보안상 상세한 에러 메시지 숨김
  const isProduction = process.env.NODE_ENV === 'production';

  // 도메인 에러는 사용자에게 직접 표시 가능
  const userFriendlyErrorCodes = [
    'VALIDATION_ERROR',
    'INVALID_USER_DATA',
    'EMAIL_ALREADY_EXISTS',
    'INVALID_CREDENTIALS',
    'USER_NOT_FOUND',
    'ACCOUNT_DEACTIVATED',
    'EMAIL_NOT_VERIFIED',
    'INSUFFICIENT_PERMISSIONS',
    'ACCESS_DENIED',
    'AUTHENTICATION_REQUIRED',
    'INVALID_TOKEN',
    'ROUTE_NOT_FOUND',
  ];

  if (error.code && userFriendlyErrorCodes.includes(error.code)) {
    return error.message;
  }

  // 운영 환경에서는 일반적인 메시지 반환
  if (isProduction) {
    return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  // 개발 환경에서는 상세한 메시지 반환
  return error.message || '내부 서버 오류가 발생했습니다.';
}

/**
 * 에러 로깅
 */
function logError(error: CustomError, req: Request): void {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent: string = req.get('User-Agent') ?? 'Unknown';
  const ip: string = req.ip ?? req.connection?.remoteAddress ?? 'Unknown';
  const userId = req.user?.id || 'Anonymous';

  // 에러 레벨 결정
  const statusCode = getStatusCode(error);
  const isClientError = statusCode >= 400 && statusCode < 500;
  const isServerError = statusCode >= 500;

  // 로그 형식
  const logData = {
    timestamp,
    level: isServerError ? 'ERROR' : isClientError ? 'WARN' : 'INFO',
    message: error.message,
    code: error.code,
    statusCode,
    method,
    url,
    userId,
    ip,
    userAgent,
    ...(error.originalError && { originalError: error.originalError.message }),
    ...(error.service && { service: error.service }),
  };

  // 서버 에러는 상세 로깅, 클라이언트 에러는 간단 로깅
  if (isServerError) {
    console.error(`
🚨 =============== Server Error ===============
🕐 Timestamp: ${timestamp}
🔍 Error: ${error.message}
📋 Code: ${error.code || 'UNKNOWN'}
🌐 Request: ${method} ${url}
👤 User: ${userId}
🌍 IP: ${ip}
📱 User-Agent: ${userAgent}
${error.stack ? `📚 Stack: ${error.stack}` : ''}
${error.originalError ? `🔗 Original: ${error.originalError.message}` : ''}
============================================
    `);
  } else if (isClientError) {
    console.warn(
      `[${timestamp}] ${statusCode} ${method} ${url} - ${error.message} (User: ${userId})`
    );
  }

  // 운영 환경에서는 외부 로깅 서비스에 전송 (예: ELK Stack, Sentry 등)
  if (process.env.NODE_ENV === 'production' && isServerError) {
    // TODO: 외부 로깅 서비스 연동
    // await externalLogger.log(logData);
  }
}

/**
 * 특정 에러 타입 체크 함수들
 */
export function isDomainError(error: any): boolean {
  return error?.name === 'DomainError';
}

export function isRepositoryError(error: any): boolean {
  return error?.name === 'RepositoryError';
}

export function isExternalServiceError(error: any): boolean {
  return error?.name === 'ExternalServiceError';
}

export function isValidationError(error: any): boolean {
  return error?.code === 'VALIDATION_ERROR';
}

// ========================================
// 에러 생성 헬퍼 함수들
// ========================================

/**
 * 일반적인 HTTP 에러 생성
 */
export function createHttpError(
  statusCode: number,
  message: string,
  code?: string
): CustomError {
  const error: CustomError = new Error(message);
  error.statusCode = statusCode;
  error.code = code || `HTTP_${statusCode}`;
  return error;
}

/**
 * 400 Bad Request 에러 생성
 */
export function createBadRequestError(
  message: string,
  code?: string
): CustomError {
  return createHttpError(400, message, code || 'BAD_REQUEST');
}

/**
 * 401 Unauthorized 에러 생성
 */
export function createUnauthorizedError(
  message: string = '인증이 필요합니다'
): CustomError {
  return createHttpError(401, message, 'UNAUTHORIZED');
}

/**
 * 403 Forbidden 에러 생성
 */
export function createForbiddenError(
  message: string = '권한이 없습니다'
): CustomError {
  return createHttpError(403, message, 'FORBIDDEN');
}

/**
 * 404 Not Found 에러 생성
 */
export function createNotFoundError(
  message: string = '리소스를 찾을 수 없습니다'
): CustomError {
  return createHttpError(404, message, 'NOT_FOUND');
}

/**
 * 409 Conflict 에러 생성
 */
export function createConflictError(
  message: string = '리소스 충돌이 발생했습니다'
): CustomError {
  return createHttpError(409, message, 'CONFLICT');
}

/**
 * 500 Internal Server Error 생성
 */
export function createInternalServerError(
  message: string = '내부 서버 오류가 발생했습니다'
): CustomError {
  return createHttpError(500, message, 'INTERNAL_SERVER_ERROR');
}

// ========================================
// 미들웨어 사용 예시
// ========================================
/*
// Express 앱에서 사용 예시
app.use('/api', userRoutes);

// 404 핸들러 (모든 라우트 다음에 배치)
app.use(notFoundHandler());

// 전역 에러 핸들러 (맨 마지막에 배치)
app.use(globalErrorHandler());

// 비동기 라우트 핸들러에서 사용 예시
router.get('/users/:id', asyncErrorCatcher(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    throw createNotFoundError('사용자를 찾을 수 없습니다');
  }
  res.json(user);
}));
*/
