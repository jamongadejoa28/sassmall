// ========================================
// Rate Limit Middleware - Framework Layer (단순화)
// cart-service/src/frameworks/middleware/rateLimitMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from "express";

/**
 * RateLimitMiddleware - API 요청 제한 (취업 포트폴리오용 단순화)
 *
 * 책임:
 * 1. IP 기반 요청 횟수 제한
 * 2. 메모리 기반 간단한 구현 (프로덕션에서는 Redis 권장)
 * 3. API 남용 방지
 *
 * 취업 포트폴리오 어필 포인트:
 * - 보안 인식 (API 남용 방지)
 * - 설정 가능한 구조
 * - 메모리 효율적 관리
 *
 * 주의: 실제 프로덕션에서는 Redis 기반 구현 권장
 */

// ========================================
// 타입 정의
// ========================================

export interface RateLimitConfig {
  windowMs: number; // 시간 윈도우 (밀리초)
  max: number; // 최대 요청 수
  message?: string | object; // 제한 시 응답 메시지
  skipSuccessfulRequests?: boolean; // 성공 요청만 카운트할지 여부
  skipFailedRequests?: boolean; // 실패 요청 제외할지 여부
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// ========================================
// Rate Limiter 클래스
// ========================================

class MemoryRateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || {
        success: false,
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        code: "RATE_LIMIT_EXCEEDED",
      },
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
    };

    // 주기적으로 만료된 기록 정리 (메모리 누수 방지)
    setInterval(() => {
      this.cleanupExpiredRecords();
    }, this.config.windowMs);
  }

  /**
   * Rate limit 미들웨어 생성
   */
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.generateKey(req);
    const now = Date.now();

    // 현재 요청 기록 조회 또는 생성
    let record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // 새로운 윈도우 시작
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.requests.set(key, record);
    }

    // 요청 카운트 증가
    record.count++;

    // Rate limit 체크
    if (record.count > this.config.max) {
      res.status(429).json(this.config.message);
      return;
    }

    // 응답 헤더 추가 (클라이언트 정보 제공)
    res.set({
      "X-RateLimit-Limit": this.config.max.toString(),
      "X-RateLimit-Remaining": Math.max(
        0,
        this.config.max - record.count
      ).toString(),
      "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
    });

    next();
  };

  /**
   * 요청 식별 키 생성 (IP 기반)
   */
  private generateKey(req: Request): string {
    // IP 주소 추출 (프록시 고려)
    const ip =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "unknown";

    return `rate_limit:${ip}`;
  }

  /**
   * 만료된 기록 정리 (메모리 관리)
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        expiredKeys.push(key);
      }
    }

    // 만료된 키 삭제
    expiredKeys.forEach((key) => {
      this.requests.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`[RateLimiter] 만료된 기록 ${expiredKeys.length}개 정리됨`);
    }
  }

  /**
   * 현재 상태 조회 (디버깅용)
   */
  getStats(): { totalKeys: number; activeWindows: number } {
    const now = Date.now();
    let activeWindows = 0;

    for (const record of this.requests.values()) {
      if (now <= record.resetTime) {
        activeWindows++;
      }
    }

    return {
      totalKeys: this.requests.size,
      activeWindows,
    };
  }

  /**
   * 특정 키의 제한 해제 (관리자용)
   */
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

// ========================================
// 팩토리 함수들
// ========================================

/**
 * 기본 Rate Limiter 생성
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new MemoryRateLimiter(config);
  return limiter.middleware;
}

/**
 * 장바구니 서비스용 Rate Limiter (취업 포트폴리오 최적화)
 */
export function createCartRateLimiter() {
  return rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 15분당 100회 (충분히 여유로운 설정)
    message: {
      success: false,
      error: "요청이 너무 많습니다. 15분 후 다시 시도해주세요.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: "15분",
    },
  });
}

/**
 * 개발 환경용 Rate Limiter (제한 완화)
 */
export function createDevelopmentRateLimiter() {
  return rateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1분
    max: 1000, // 1분당 1000회 (개발 편의성)
    message: {
      success: false,
      error: "개발 환경 - 요청 제한 (1분당 1000회)",
      code: "DEV_RATE_LIMIT",
    },
  });
}

/**
 * 엄격한 Rate Limiter (로그인 등 보안 중요 API용)
 */
export function createStrictRateLimiter() {
  return rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15분
    max: 5, // 15분당 5회
    message: {
      success: false,
      error: "보안을 위해 요청이 제한되었습니다. 15분 후 다시 시도해주세요.",
      code: "SECURITY_RATE_LIMIT",
      retryAfter: "15분",
    },
  });
}

// ========================================
// 환경별 기본 설정
// ========================================

/**
 * 환경에 따른 기본 Rate Limiter
 */
export const defaultRateLimiter =
  process.env.NODE_ENV === "development"
    ? createDevelopmentRateLimiter()
    : createCartRateLimiter();

// ========================================
// 유틸리티 함수들
// ========================================

/**
 * IP 주소 추출 헬퍼
 */
export function extractClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string;
  const realIP = req.headers["x-real-ip"] as string;
  const remoteIP = req.connection.remoteAddress;

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return remoteIP || "unknown";
}

/**
 * Rate limit 정보를 응답 헤더에 추가하는 헬퍼
 */
export function addRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  res.set({
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(resetTime).toISOString(),
    "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
  });
}
