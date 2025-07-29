// ========================================
// Session Middleware - Framework Layer
// cart-service/src/frameworks/middleware/sessionMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * SessionMiddleware - 세션 관리 미들웨어
 *
 * 책임:
 * 1. 비로그인 사용자를 위한 세션 ID 생성 및 관리
 * 2. 쿠키 기반 세션 추적
 * 3. 세션 유효성 검증
 * 4. Express Request 객체에 sessionId 추가
 *
 * 비즈니스 로직:
 * - 쿠키에 세션 ID가 없으면 새로 생성
 * - 기존 세션 ID가 있으면 재사용
 * - 보안을 위한 쿠키 설정 (HttpOnly, Secure)
 * - 세션 만료 시간 관리 (30일)
 *
 * 취업 포트폴리오 어필 포인트:
 * - 보안 고려사항 (HttpOnly, SameSite)
 * - 환경별 설정 (개발/운영)
 * - 세션 관리 전략
 */

export interface SessionConfig {
  sessionName?: string;
  maxAge?: number; // 밀리초 단위
  secure?: boolean; // HTTPS에서만 전송
  httpOnly?: boolean; // JavaScript 접근 차단
  sameSite?: "strict" | "lax" | "none";
  domain?: string;
  path?: string;
}

class SessionMiddleware {
  private config: SessionConfig & {
    sessionName: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: "strict" | "lax" | "none";
    domain: string;
    path: string;
  };

  constructor(config: Partial<SessionConfig> = {}) {
    // 기본 설정값 (취업 포트폴리오 프로젝트에 최적화)
    this.config = {
      sessionName: config.sessionName || "cart_session_id",
      maxAge: config.maxAge || 30 * 24 * 60 * 60 * 1000, // 30일
      secure: config.secure ?? false, // 로컬 개발 편의성을 위해 기본값 false
      httpOnly: config.httpOnly ?? true, // XSS 방지 (필수)
      sameSite: config.sameSite || "lax", // CSRF 방지하면서 호환성 유지
      domain: config.domain || "",
      path: config.path || "/",
    };
  }

  /**
   * 세션 미들웨어 메인 로직
   */
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 1. 기존 세션 ID 확인
      let sessionId = this.getSessionIdFromCookie(req);

      // 2. 세션 ID가 없거나 유효하지 않으면 새로 생성
      if (!sessionId || !this.isValidSessionId(sessionId)) {
        sessionId = this.generateSessionId();
        // 헤더 기반에서는 쿠키 설정 안함
        if (!req.headers['x-session-id']) {
          this.setSessionCookie(res, sessionId);
        }

        console.log(`[SessionMiddleware] 🆕 새 세션 생성: ${sessionId}`);
      } else {
        // 기존 세션 갱신 (헤더 기반에서는 쿠키 갱신 안함)
        if (!req.headers['x-session-id']) {
          this.setSessionCookie(res, sessionId);
        }

        console.log(`[SessionMiddleware] 🔄 기존 세션 사용: ${sessionId}`);
      }

      // 3. Request 객체에 세션 ID 추가
      req.sessionId = sessionId;

      // 4. 세션 관련 헬퍼 메서드 추가
      req.getSessionId = () => sessionId;
      req.renewSession = () => {
        const newSessionId = this.generateSessionId();
        this.setSessionCookie(res, newSessionId);
        req.sessionId = newSessionId;
        return newSessionId;
      };

      next();
    } catch (error) {
      console.error("[SessionMiddleware] 세션 처리 중 오류:", error);

      // 오류 발생 시에도 임시 세션 ID 제공 (서비스 중단 방지)
      const fallbackSessionId = this.generateSessionId();
      req.sessionId = fallbackSessionId;
      req.getSessionId = () => fallbackSessionId;
      req.renewSession = () => fallbackSessionId;

      next();
    }
  };

  /**
   * 쿠키에서 세션 ID 추출
   */
  private getSessionIdFromCookie(req: Request): string | undefined {
    // 1. 헤더에서 세션 ID 확인 (우선순위 높음)
    const headerSessionId = req.headers['x-session-id'] as string;
    if (headerSessionId) {
      console.log(`[SessionMiddleware] ✅ 헤더에서 세션 ID 발견: ${headerSessionId}`);
      return headerSessionId;
    }
    
    // 2. 쿠키에서 세션 ID 확인 (fallback)
    const cookieSessionId = req.cookies?.[this.config.sessionName];
    if (cookieSessionId) {
      console.log(`[SessionMiddleware] 🍪 쿠키에서 세션 ID 발견: ${cookieSessionId}`);
      return cookieSessionId;
    }
    
    console.log(`[SessionMiddleware] ❌ 세션 ID를 찾을 수 없음 (헤더, 쿠키 모두 없음)`);
    return undefined;
  }

  /**
   * 세션 쿠키 설정
   */
  private setSessionCookie(res: Response, sessionId: string): void {
    res.cookie(this.config.sessionName, sessionId, {
      maxAge: this.config.maxAge,
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      domain: this.config.domain || undefined,
      path: this.config.path,
    });
  }

  /**
   * 새로운 세션 ID 생성
   */
  private generateSessionId(): string {
    // UUID v4 사용 - 보안성과 유일성 보장
    return `sess_${uuidv4()}`;
  }

  /**
   * 세션 ID 유효성 검증
   */
  private isValidSessionId(sessionId: string): boolean {
    // 기본 형식 검증: sess_ 접두사 + UUID 형태
    const sessionPattern =
      /^sess_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return sessionPattern.test(sessionId);
  }

  /**
   * 세션 삭제 (로그아웃 시 사용)
   */
  clearSession = (res: Response): void => {
    res.clearCookie(this.config.sessionName, {
      domain: this.config.domain,
      path: this.config.path,
    });
  };

  /**
   * 설정 정보 조회 (디버깅용)
   */
  getConfig(): Required<SessionConfig> {
    return { ...this.config };
  }
}

// ========================================
// Express Request 타입 확장
// ========================================

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      getSessionId?: () => string;
      renewSession?: () => string;
    }
  }
}

// ========================================
// 팩토리 함수 및 기본 인스턴스
// ========================================

/**
 * 환경별 세션 미들웨어 생성
 */
export function createSessionMiddleware(config?: Partial<SessionConfig>) {
  return new SessionMiddleware(config);
}

/**
 * 개발 환경용 세션 미들웨어
 * 로컬 개발 및 테스트에 최적화된 설정
 */
export function createDevelopmentSessionMiddleware() {
  return new SessionMiddleware({
    secure: false, // HTTP에서도 동작 (로컬 개발용)
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (개발 편의성)
    domain: "", // 도메인 설정 제거 (크로스 도메인 대응)
  });
}

/**
 * 기본 세션 미들웨어 인스턴스
 * 취업 포트폴리오 프로젝트에 최적화된 설정
 */
const defaultSessionMiddleware = createDevelopmentSessionMiddleware();

export const sessionMiddleware = defaultSessionMiddleware.middleware;

// ========================================
// 유틸리티 함수들
// ========================================

/**
 * 세션 ID 형식 검증 (외부에서 사용)
 */
export function isValidSessionId(sessionId: string): boolean {
  const sessionPattern =
    /^sess_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return sessionPattern.test(sessionId);
}

/**
 * 세션 ID에서 정보 추출
 */
export function extractSessionInfo(sessionId: string): {
  isValid: boolean;
  prefix: string;
  uuid: string;
} {
  if (!isValidSessionId(sessionId)) {
    return { isValid: false, prefix: "", uuid: "" };
  }

  const [prefix, uuid] = sessionId.split("_", 2);
  return { isValid: true, prefix, uuid };
}
