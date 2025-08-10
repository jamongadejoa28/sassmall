// ========================================
// Shared Authentication Middleware
// shared/src/middleware/authMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ========================================
// Types
// ========================================

export interface JWTPayload {
  userId?: string;
  sub?: string; // Different services use different field names
  email: string;
  role: 'customer' | 'admin';
  type?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  isActive: boolean;
}

export interface AuthMiddlewareConfig {
  jwtSecret: string;
  tokenHeader: string;
  tokenPrefix: string;
  ignoreExpiration?: boolean;
}

// ========================================
// Auth Middleware Class
// ========================================

export class SharedAuthMiddleware {
  private config: AuthMiddlewareConfig;

  constructor(config: Partial<AuthMiddlewareConfig> = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'default-secret-key',
      tokenHeader: config.tokenHeader || 'authorization',
      tokenPrefix: config.tokenPrefix || 'Bearer ',
      ignoreExpiration: config.ignoreExpiration || false,
    };

    // JWT secret validation
    if (this.config.jwtSecret === 'default-secret-key') {
      console.warn('⚠️ [SharedAuthMiddleware] Using default JWT secret. Change this in production!');
    }
  }

  /**
   * Required authentication middleware
   */
  required = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
          error: {
            code: 'AUTHENTICATION_REQUIRED',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = this.verifyToken(token);
      if (!user) {
        res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다',
          error: {
            code: 'INVALID_TOKEN',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      this.handleAuthError(error, res);
    }
  };

  /**
   * Optional authentication middleware
   */
  optional = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);

      if (token) {
        const user = this.verifyToken(token);
        if (user) {
          req.user = user;
        }
      }

      next();
    } catch (error) {
      console.warn('[SharedAuthMiddleware] Optional auth error (ignored):', error);
      next();
    }
  };

  /**
   * Role-based authentication middleware
   */
  requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          res.status(401).json({
            success: false,
            message: '인증이 필요합니다',
            error: {
              code: 'AUTHENTICATION_REQUIRED',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const user = this.verifyToken(token);
        if (!user) {
          res.status(401).json({
            success: false,
            message: '유효하지 않은 토큰입니다',
            error: {
              code: 'INVALID_TOKEN',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!allowedRoles.includes(user.role)) {
          res.status(403).json({
            success: false,
            message: '권한이 부족합니다',
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              requiredRoles: allowedRoles,
              userRole: user.role,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        req.user = user;
        next();
      } catch (error) {
        this.handleAuthError(error, res);
      }
    };
  };

  /**
   * Extract JWT token from HTTP headers
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers[this.config.tokenHeader] as string;

    if (!authHeader || !authHeader.startsWith(this.config.tokenPrefix)) {
      return null;
    }

    return authHeader.substring(this.config.tokenPrefix.length).trim();
  }

  /**
   * Verify JWT token and extract user information
   */
  private verifyToken(token: string): AuthenticatedUser | null {
    try {
      // Test environment simple token support
      if (process.env.NODE_ENV === 'test') {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const userPattern = /^user-[\w-]+$/;
        
        if (uuidPattern.test(token) || userPattern.test(token)) {
          return {
            id: token,
            email: `${token}@test.com`,
            role: 'customer',
            isActive: true,
          };
        }
      }

      const decoded = jwt.verify(token, this.config.jwtSecret, {
        ignoreExpiration: this.config.ignoreExpiration,
      }) as JWTPayload;

      // Handle different user ID field names across services
      const userId = decoded.userId || decoded.sub;
      
      if (!userId || !decoded.email) {
        console.error('[SharedAuthMiddleware] JWT payload missing required fields:', decoded);
        return null;
      }

      return {
        id: userId,
        email: decoded.email,
        role: decoded.role || 'customer',
        isActive: true,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        console.warn('[SharedAuthMiddleware] JWT verification failed:', error.message);
      } else if (error instanceof jwt.TokenExpiredError) {
        console.warn('[SharedAuthMiddleware] JWT token expired:', error.message);
      } else {
        console.error('[SharedAuthMiddleware] Unexpected JWT error:', error);
      }
      return null;
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: unknown, res: Response): void {
    console.error('[SharedAuthMiddleware] Authentication error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: '토큰이 만료되었습니다',
        error: {
          code: 'TOKEN_EXPIRED',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다',
        error: {
          code: 'INVALID_TOKEN',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: '인증 처리 중 오류가 발생했습니다',
      error: {
        code: 'AUTH_PROCESSING_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// ========================================
// Factory Functions
// ========================================

export function createAuthMiddleware(config?: Partial<AuthMiddlewareConfig>) {
  return new SharedAuthMiddleware(config);
}

export function createDevelopmentAuthMiddleware() {
  return new SharedAuthMiddleware({
    ignoreExpiration: true,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  });
}

export function createProductionAuthMiddleware() {
  return new SharedAuthMiddleware({
    ignoreExpiration: false,
    jwtSecret: process.env.JWT_SECRET,
  });
}

// ========================================
// Default Instance
// ========================================

const defaultAuthMiddleware = process.env.NODE_ENV === 'production'
  ? createProductionAuthMiddleware()
  : createDevelopmentAuthMiddleware();

export const authMiddleware = {
  required: defaultAuthMiddleware.required,
  optional: defaultAuthMiddleware.optional,
  requireRole: defaultAuthMiddleware.requireRole,
};

// ========================================
// Utility Functions
// ========================================

export function hasRole(user: AuthenticatedUser | undefined, role: string): boolean {
  return user?.role === role;
}

export function isAdmin(user: AuthenticatedUser | undefined): boolean {
  return hasRole(user, 'admin');
}

export function createMockAuthMiddleware(mockUser: AuthenticatedUser) {
  return {
    required: (req: Request, res: Response, next: NextFunction) => {
      req.user = mockUser;
      next();
    },
    optional: (req: Request, res: Response, next: NextFunction) => {
      req.user = mockUser;
      next();
    },
    requireRole: (allowedRoles: string[]) => {
      return (req: Request, res: Response, next: NextFunction) => {
        req.user = mockUser;
        next();
      };
    },
  };
}

// ========================================
// Express Request Type Extension
// ========================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}