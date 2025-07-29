// ========================================
// 휴대폰 인증 컨트롤러
// src/frameworks/presentation/controllers/PhoneVerificationController.ts
// ========================================

import { Request, Response } from 'express';
import { PhoneVerificationService } from '../../../infrastructure/services/PhoneVerificationService';

export class PhoneVerificationController {
  constructor(private phoneVerificationService: PhoneVerificationService) {}

  /**
   * 휴대폰 인증 요청
   * POST /api/users/phone-verification/request
   */
  async requestVerification(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          error: '휴대폰 번호가 필요합니다.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.phoneVerificationService.requestVerification({
        phoneNumber: phoneNumber.replace(/[-\s]/g, ''), // 하이픈, 공백 제거
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            sessionId: result.sessionId,
            message: result.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('휴대폰 인증 요청 오류:', error);
      res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 인증 상태 확인
   * GET /api/users/phone-verification/status/:sessionId
   */
  async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: '세션 ID가 필요합니다.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const status = await this.phoneVerificationService.getVerificationStatus(sessionId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: '인증 세션을 찾을 수 없습니다.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Mock 인증 완료 (개발/테스트용)
   * POST /api/users/phone-verification/complete/:sessionId
   */
  async completeVerification(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: '세션 ID가 필요합니다.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.phoneVerificationService.completeVerification(sessionId);

      if (result.success) {
        // 인증된 휴대폰 번호도 함께 반환
        const phoneNumber = await this.phoneVerificationService.getVerifiedPhoneNumber(sessionId);

        res.status(200).json({
          success: true,
          data: {
            sessionId: result.sessionId,
            phoneNumber,
            message: result.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('인증 완료 처리 오류:', error);
      res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 인증 상태 통계 (개발용)
   * GET /api/users/phone-verification/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      // 개발 환경에서만 접근 가능
      if (process.env.NODE_ENV !== 'development') {
        res.status(404).json({
          success: false,
          error: 'Not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const stats = this.phoneVerificationService.getSessionStats();

      res.status(200).json({
        success: true,
        data: {
          stats,
          environment: 'development',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('통계 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 헬스 체크
   * GET /api/users/phone-verification/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.phoneVerificationService.getSessionStats();

      res.status(200).json({
        success: true,
        data: {
          service: 'Phone Verification Service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          sessions: {
            total: stats.total,
            active: stats.pending,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('헬스 체크 오류:', error);
      res.status(500).json({
        success: false,
        error: '서비스를 사용할 수 없습니다.',
        timestamp: new Date().toISOString(),
      });
    }
  }
}