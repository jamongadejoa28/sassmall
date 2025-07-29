// ========================================
// Authentication Middleware - 인증 미들웨어
// order-service/src/frameworks/middleware/authMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 사용자 정보 인터페이스
interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  isActive: boolean;
}

// Express Request 확장
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface JwtPayload {
  sub: string;  // User Service uses 'sub' instead of 'userId'
  email: string;
  role: 'customer' | 'admin';
  type: string;
  iss: string;
  iat?: number;
  exp?: number;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다',
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required',
        },
      });
      return;
    }

    // Bearer 토큰 형식 확인
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰 형식입니다',
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Token must be in Bearer format',
        },
      });
      return;
    }

    // JWT 토큰 검증
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      res.status(500).json({
        success: false,
        message: '서버 설정 오류',
        error: {
          code: 'SERVER_CONFIGURATION_ERROR',
          message: 'JWT secret is not configured',
        },
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      // 토큰 유효성 추가 검증
      if (!decoded.sub || !decoded.email) {
        res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다',
          error: {
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'Token payload is incomplete',
          },
        });
        return;
      }

      // 토큰 타입 확인 (access token인지 확인)
      if (decoded.type !== 'access') {
        res.status(401).json({
          success: false,
          message: '잘못된 토큰 타입입니다',
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Only access tokens are allowed',
          },
        });
        return;
      }

      // Request 객체에 사용자 정보 설정
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.email.split('@')[0] || 'Unknown', // 이메일에서 이름 추출
        role: decoded.role,
        isActive: true, // User Service에서 발급한 토큰이면 활성 상태로 간주
      };

      next();

    } catch (jwtError) {
      console.error('JWT 검증 실패:', jwtError);

      let errorMessage = '유효하지 않은 토큰입니다';
      let errorCode = 'INVALID_TOKEN';

      if (jwtError instanceof jwt.TokenExpiredError) {
        errorMessage = '토큰이 만료되었습니다';
        errorCode = 'TOKEN_EXPIRED';
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        errorMessage = '잘못된 토큰입니다';
        errorCode = 'MALFORMED_TOKEN';
      }

      res.status(401).json({
        success: false,
        message: errorMessage,
        error: {
          code: errorCode,
          message: jwtError instanceof Error ? jwtError.message : 'JWT verification failed',
        },
      });
      return;
    }

  } catch (error) {
    console.error('인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      message: '인증 처리 중 서버 오류가 발생했습니다',
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// 선택적 인증 미들웨어 (인증이 있으면 사용자 정보를 설정하지만, 없어도 통과)
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // 인증 헤더가 없으면 그냥 통과
      next();
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      if (decoded.sub && decoded.email && decoded.type === 'access') {
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.email.split('@')[0] || 'Unknown',
          role: decoded.role,
          isActive: true,
        };
      }
    } catch (jwtError) {
      // JWT 오류는 무시하고 계속 진행
      const errorMessage = jwtError instanceof Error ? jwtError.message : 'JWT verification failed';
      console.warn('선택적 인증에서 JWT 검증 실패:', errorMessage);
    }

    next();

  } catch (error) {
    console.error('선택적 인증 미들웨어 오류:', error);
    // 오류가 발생해도 계속 진행
    next();
  }
}

// 사용자 역할 확인 미들웨어 팩토리
export function requireRole(roles: ('customer' | 'admin')[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '인증이 필요합니다',
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication is required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: '접근 권한이 없습니다',
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required roles: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}