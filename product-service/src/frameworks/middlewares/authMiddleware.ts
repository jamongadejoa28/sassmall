// ========================================
// Authentication Middleware - Framework 계층
// src/frameworks/middlewares/authMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../services/JwtTokenService';
import { ApiResponse } from '../../shared/types';

/**
 * Authentication Middleware - JWT 토큰 인증 미들웨어
 *
 * 역할:
 * - JWT 토큰 추출 및 검증
 * - 사용자 정보를 req.user에 설정
 * - 인증 실패 시 적절한 에러 응답
 * - 옵셔널 인증 지원
 *
 * 특징:
 * - User Service와 동일한 토큰 형식 사용
 * - Bearer Token 표준 준수
 * - 상세한 에러 응답
 * - 보안 모범 사례 적용
 */

// JWT 토큰 서비스 인스턴스
const jwtTokenService = new JwtTokenService();

/**
 * 필수 인증 미들웨어
 *
 * 토큰이 없거나 유효하지 않으면 401 에러 반환
 */
export function requireAuth() {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. Authorization 헤더에서 토큰 추출
      const token = extractTokenFromHeader(req);

      if (!token) {
        const response: ApiResponse<null> = {
          success: false,
          message: '로그인 후 이용해주세요',
          error: {
            code: 'AUTHENTICATION_REQUIRED',
          },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || 'unknown',
        };

        res.status(401).json(response);
        return;
      }

      // 2. 토큰 검증
      const userPayload = jwtTokenService.verifyAccessToken(token);

      if (!userPayload) {
        const response: ApiResponse<null> = {
          success: false,
          message: '유효하지 않거나 만료된 토큰입니다',
          error: {
            code: 'INVALID_TOKEN',
          },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || 'unknown',
        };

        res.status(401).json(response);
        return;
      }

      // 3. 사용자 정보를 request에 추가
      req.user = {
        id: userPayload.id,
        email: userPayload.email,
        role: userPayload.role,
      };

      // 4. 다음 미들웨어로 진행
      next();
    } catch (error) {
      console.error('[Product Service Auth Middleware] 인증 오류:', error);

      const response: ApiResponse<null> = {
        success: false,
        message: '인증 처리 중 오류가 발생했습니다',
        error: {
          code: 'AUTHENTICATION_ERROR',
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(500).json(response);
    }
  };
}

/**
 * 옵셔널 인증 미들웨어
 *
 * 토큰이 있으면 검증하지만, 없어도 다음 미들웨어로 진행
 * 공개 API에서 로그인 사용자에게 추가 정보 제공 시 사용
 */
export function optionalAuth() {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. Authorization 헤더에서 토큰 추출
      const token = extractTokenFromHeader(req);

      // 토큰이 없으면 그냥 진행
      if (!token) {
        next();
        return;
      }

      // 2. 토큰 검증
      const userPayload = jwtTokenService.verifyAccessToken(token);

      // 유효한 토큰인 경우에만 사용자 정보 설정
      if (userPayload) {
        req.user = {
          id: userPayload.id,
          email: userPayload.email,
          role: userPayload.role,
        };
      }

      // 3. 토큰이 유효하지 않아도 다음 미들웨어로 진행
      next();
    } catch (error) {
      // 옵셔널 인증에서는 에러가 발생해도 진행
      console.warn('[Product Service Optional Auth] 토큰 검증 실패 (진행 계속):', error);
      next();
    }
  };
}

/**
 * 관리자 권한 확인 미들웨어
 *
 * requireAuth 이후에 사용해야 함
 * 관리자가 아니면 403 에러 반환
 */
export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 인증 미들웨어에서 설정된 사용자 정보 확인
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          message: '인증이 필요합니다',
          error: {
            code: 'AUTHENTICATION_REQUIRED',
          },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || 'unknown',
        };

        res.status(401).json(response);
        return;
      }

      // 관리자 권한 확인
      if (req.user.role !== 'admin') {
        const response: ApiResponse<null> = {
          success: false,
          message: '관리자 권한이 필요합니다',
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
          },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || 'unknown',
        };

        res.status(403).json(response);
        return;
      }

      // 관리자 권한 확인 완료
      next();
    } catch (error) {
      console.error('[Product Service Admin Auth] 권한 확인 오류:', error);

      const response: ApiResponse<null> = {
        success: false,
        message: '권한 확인 중 오류가 발생했습니다',
        error: {
          code: 'AUTHORIZATION_ERROR',
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId || 'unknown',
      };

      res.status(500).json(response);
    }
  };
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Bearer 토큰 형식 확인
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return null;
  }

  // Bearer 접두사 제거하고 토큰 추출
  const token = authHeader.substring(bearerPrefix.length).trim();

  if (!token) {
    return null;
  }

  return token;
}

// ========================================
// Express Request 타입 확장
// ========================================
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'customer' | 'admin';
      };
    }
  }
}

// ========================================
// 미들웨어 사용 예시
// ========================================
/*
// 필수 인증이 필요한 보호된 라우트
router.post('/products/:id/qna', requireAuth(), qnaController.createQnA);

// 관리자만 접근 가능한 라우트
router.put('/qna/:qnaId/answer', requireAuth(), requireAdmin(), qnaController.answerQnA);

// 옵셔널 인증 (로그인 사용자에게 추가 정보 제공)
router.get('/products/:id/qna', optionalAuth(), qnaController.getQnA);
*/