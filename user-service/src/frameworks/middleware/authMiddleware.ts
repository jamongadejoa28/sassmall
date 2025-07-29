// ========================================
// Authentication Middleware - Framework 계층
// src/framework/middleware/authMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../../usecases/types';

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
 * - Express 5.1.0 호환
 * - Bearer Token 표준 준수
 * - 상세한 에러 응답
 * - 보안 모범 사례 적용
 */

/**
 * 필수 인증 미들웨어
 *
 * 토큰이 없거나 유효하지 않으면 401 에러 반환
 */
export function requireAuth(tokenService: TokenService) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. Authorization 헤더에서 토큰 추출
      const token = extractTokenFromHeader(req);

      if (!token) {
        res.status(401).json({
          success: false,
          message: '인증 토큰이 필요합니다',
          error: 'AUTHENTICATION_REQUIRED',
          data: null,
        });
        return;
      }

      // 2. 토큰 검증
      const userPayload = tokenService.verifyAccessToken(token);

      if (!userPayload) {
        res.status(401).json({
          success: false,
          message: '유효하지 않거나 만료된 토큰입니다',
          error: 'INVALID_TOKEN',
          data: null,
        });
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
      console.error('[Auth Middleware] 인증 오류:', error);

      res.status(500).json({
        success: false,
        message: '인증 처리 중 오류가 발생했습니다',
        error: 'AUTHENTICATION_ERROR',
        data: null,
      });
    }
  };
}

/**
 * 옵셔널 인증 미들웨어
 *
 * 토큰이 있으면 검증하지만, 없어도 다음 미들웨어로 진행
 * 공개 API에서 로그인 사용자에게 추가 정보 제공 시 사용
 */
export function optionalAuth(tokenService: TokenService) {
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
      const userPayload = tokenService.verifyAccessToken(token);

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
      console.warn('[Optional Auth] 토큰 검증 실패 (진행 계속):', error);
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
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
          error: 'AUTHENTICATION_REQUIRED',
          data: null,
        });
        return;
      }

      // 관리자 권한 확인
      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다',
          error: 'INSUFFICIENT_PERMISSIONS',
          data: null,
        });
        return;
      }

      // 관리자 권한 확인 완료
      next();
    } catch (error) {
      console.error('[Admin Auth] 권한 확인 오류:', error);

      res.status(500).json({
        success: false,
        message: '권한 확인 중 오류가 발생했습니다',
        error: 'AUTHORIZATION_ERROR',
        data: null,
      });
    }
  };
}

/**
 * 자기 자신 또는 관리자 권한 확인 미들웨어
 *
 * 사용자가 자신의 정보에 접근하거나 관리자인 경우 허용
 * URL 파라미터에서 userId를 추출하여 확인
 */
export function requireSelfOrAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 인증 미들웨어에서 설정된 사용자 정보 확인
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
          error: 'AUTHENTICATION_REQUIRED',
          data: null,
        });
        return;
      }

      // 관리자는 모든 사용자 정보에 접근 가능
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // URL 파라미터에서 userId 추출
      const targetUserId = req.params.userId || req.params.id;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다',
          error: 'USER_ID_REQUIRED',
          data: null,
        });
        return;
      }

      // 자기 자신의 정보인지 확인
      if (req.user.id !== targetUserId) {
        res.status(403).json({
          success: false,
          message: '자신의 정보만 접근할 수 있습니다',
          error: 'ACCESS_DENIED',
          data: null,
        });
        return;
      }

      // 권한 확인 완료
      next();
    } catch (error) {
      console.error('[Self/Admin Auth] 권한 확인 오류:', error);

      res.status(500).json({
        success: false,
        message: '권한 확인 중 오류가 발생했습니다',
        error: 'AUTHORIZATION_ERROR',
        data: null,
      });
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
// Express Request 타입 확장 (이미 UserController에서 정의했지만 재정의)
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
router.get('/profile', requireAuth(tokenService), userController.getProfile);

// 관리자만 접근 가능한 라우트
router.get('/admin/users', requireAuth(tokenService), requireAdmin(), adminController.getUsers);

// 자기 자신 또는 관리자만 접근 가능한 라우트
router.put('/users/:userId', requireAuth(tokenService), requireSelfOrAdmin(), userController.updateUser);

// 옵셔널 인증 (로그인 사용자에게 추가 정보 제공)
router.get('/products', optionalAuth(tokenService), productController.getProducts);
*/
