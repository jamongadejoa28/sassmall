// ========================================
// Rate Limit Middleware - 속도 제한 미들웨어
// order-service/src/frameworks/middleware/rateLimitMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';

// 기본 속도 제한 설정
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15분
const DEFAULT_MAX_REQUESTS = 100; // 기본 최대 요청 수

// 사용자별 속도 제한을 위한 키 생성기
function generateKey(req: Request): string {
  // 인증된 사용자의 경우 사용자 ID 사용
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // 비인증 사용자의 경우 IP 주소 사용
  return `ip:${req.ip || 'unknown'}`;
}

// 커스텀 에러 응답
function onLimitReached(req: Request, res: Response): void {
  const retryAfter = Math.round(Date.now() / 1000 + 900); // 15분 후
  
  res.status(429).json({
    success: false,
    message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this source',
      retryAfter,
    },
    retryAfter,
  });
}

// 속도 제한 미들웨어 팩토리
export function rateLimitMiddleware(options?: Partial<Options>): RateLimitRequestHandler {
  const config: Partial<Options> = {
    windowMs: DEFAULT_WINDOW_MS,
    max: DEFAULT_MAX_REQUESTS,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: generateKey,
    handler: onLimitReached,
    message: {
      success: false,
      message: '요청 한도를 초과했습니다',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      },
    },
    ...options,
  };

  return rateLimit(config);
}

// 미리 정의된 속도 제한 설정들
export const rateLimitPresets = {
  // 일반 API 조회
  general: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 15분당 100회
  }),

  // 인증 관련 API (더 엄격)
  auth: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 20, // 15분당 20회
  }),

  // 주문 생성 (매우 엄격)
  createOrder: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 10, // 15분당 10회
  }),

  // 결제 요청 (엄격)
  payment: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 15, // 15분당 15회
  }),

  // 주문 취소 (엄격)
  cancel: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 5, // 15분당 5회
  }),

  // 관리자 API (관대)
  admin: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 200, // 15분당 200회
  }),

  // 실시간 조회 API (짧은 윈도우, 높은 빈도)
  realtime: rateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1분
    max: 60, // 1분당 60회
  }),
};

// IP 기반 속도 제한 (비인증 사용자용)
export const ipRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15분
  max: 50, // IP당 15분에 50회
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

// 사용자 기반 속도 제한 (인증된 사용자용)
export const userRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15분
  max: 300, // 사용자당 15분에 300회
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'unknown',
});

// 엔드포인트별 맞춤 속도 제한
export const endpointRateLimits = {
  // 주문 관련
  '/orders': rateLimitPresets.createOrder,
  '/orders/:orderId/cancel': rateLimitPresets.cancel,
  '/orders/:orderId/payment/request': rateLimitPresets.payment,

  // 조회 관련
  '/orders/:orderId': rateLimitPresets.general,
  '/orders/my-orders': rateLimitPresets.realtime,

  // 관리자 관련
  '/orders/:orderId/status': rateLimitPresets.admin,
  '/orders/:orderId/admin-cancel': rateLimitPresets.admin,
};