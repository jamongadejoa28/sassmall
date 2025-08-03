// ========================================
// Auth Middleware - Framework Layer
// cart-service/src/frameworks/middleware/authMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ========================================
// Types & Interfaces
// ========================================

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'admin' | 'customer';
  sessionId?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'customer';
  sessionId?: string;
  iat?: number;
  exp?: number;
}

// ========================================
// Auth Middleware Implementation
// ========================================

class CartAuthMiddleware {
  private jwtSecret: string;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  required = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({
          success: false,
          message: '인증 토큰이 필요합니다.',
          error: { code: 'MISSING_TOKEN' }
        });
        return;
      }

      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      
      (req as any).user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        sessionId: decoded.sessionId
      } as AuthenticatedUser;

      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: '토큰이 만료되었습니다.',
          error: { code: 'TOKEN_EXPIRED' }
        });
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다.',
          error: { code: 'INVALID_TOKEN' }
        });
      } else {
        res.status(500).json({
          success: false,
          message: '토큰 검증 중 오류가 발생했습니다.',
          error: { code: 'TOKEN_VERIFICATION_ERROR' }
        });
      }
    }
  };

  optional = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
        (req as any).user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          sessionId: decoded.sessionId
        } as AuthenticatedUser;
      }

      next();
    } catch (error) {
      // Optional이므로 토큰이 잘못되어도 계속 진행
      next();
    }
  };

  requireRole = (role: 'admin' | 'customer') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user as AuthenticatedUser;
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: { code: 'AUTHENTICATION_REQUIRED' }
        });
        return;
      }

      if (user.role !== role && user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '권한이 부족합니다.',
          error: { code: 'INSUFFICIENT_PERMISSIONS' }
        });
        return;
      }

      next();
    };
  };

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}

// ========================================
// Exported Instance
// ========================================

const cartAuthMiddleware = new CartAuthMiddleware(
  process.env.JWT_SECRET || 'cart-service-secret'
);

export const authMiddleware = {
  required: cartAuthMiddleware.required,
  optional: cartAuthMiddleware.optional,
  requireRole: cartAuthMiddleware.requireRole,
};

// ========================================
// Utility Functions
// ========================================

export const hasRole = (user: AuthenticatedUser, role: 'admin' | 'customer'): boolean => {
  return user.role === role || user.role === 'admin';
};

export const isAdmin = (user: AuthenticatedUser): boolean => {
  return user.role === 'admin';
};

export const createMockAuthMiddleware = () => {
  return {
    required: (req: Request, res: Response, next: NextFunction) => {
      (req as any).user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'customer' as const,
        sessionId: 'test-session-id'
      };
      next();
    },
    optional: (req: Request, res: Response, next: NextFunction) => {
      (req as any).user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'customer' as const,
        sessionId: 'test-session-id'
      };
      next();
    },
    requireRole: (role: 'admin' | 'customer') => (req: Request, res: Response, next: NextFunction) => {
      next();
    }
  };
};
