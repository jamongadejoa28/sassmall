// ========================================
// Admin Middleware - 관리자 권한 미들웨어
// order-service/src/frameworks/middleware/adminMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // 사용자 인증 확인
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '인증이 필요합니다',
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication is required for admin access',
        },
      });
      return;
    }

    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다',
        error: {
          code: 'ADMIN_ACCESS_REQUIRED',
          message: 'This operation requires admin privileges',
        },
      });
      return;
    }

    // 계정 활성 상태 확인
    if (!req.user.isActive) {
      res.status(403).json({
        success: false,
        message: '비활성화된 관리자 계정입니다',
        error: {
          code: 'INACTIVE_ADMIN_ACCOUNT',
          message: 'Admin account is deactivated',
        },
      });
      return;
    }

    // 관리자 권한 로깅 (보안 감사용)
    console.info('관리자 API 접근:', {
      adminId: req.user.id,
      adminEmail: req.user.email,
      endpoint: `${req.method} ${req.originalUrl}`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    next();

  } catch (error) {
    console.error('관리자 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      message: '권한 확인 중 서버 오류가 발생했습니다',
      error: {
        code: 'ADMIN_MIDDLEWARE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}