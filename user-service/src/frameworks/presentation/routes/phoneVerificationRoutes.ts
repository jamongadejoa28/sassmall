// ========================================
// 휴대폰 인증 라우트
// src/frameworks/presentation/routes/phoneVerificationRoutes.ts
// ========================================

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { PhoneVerificationController } from '../controllers/PhoneVerificationController';
import { PhoneVerificationService } from '../../../infrastructure/services/PhoneVerificationService';
import { handleValidationErrors } from '../../middleware/validationMiddleware';

// 서비스 인스턴스 생성
const phoneVerificationService = new PhoneVerificationService();
const phoneVerificationController = new PhoneVerificationController(phoneVerificationService);

const router = Router();

/**
 * 휴대폰 인증 요청
 * POST /request
 */
router.post(
  '/request',
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('휴대폰 번호가 필요합니다.')
      .matches(/^010[-]?\d{4}[-]?\d{4}$/)
      .withMessage('올바른 휴대폰 번호 형식이 아닙니다. (010-0000-0000)'),
    handleValidationErrors(),
  ],
  phoneVerificationController.requestVerification.bind(phoneVerificationController)
);

/**
 * 인증 상태 확인
 * GET /status/:sessionId
 */
router.get(
  '/status/:sessionId',
  [
    param('sessionId')
      .isUUID()
      .withMessage('유효한 세션 ID가 필요합니다.'),
    handleValidationErrors(),
  ],
  phoneVerificationController.getVerificationStatus.bind(phoneVerificationController)
);

/**
 * Mock 인증 완료 (개발/테스트용)
 * POST /complete/:sessionId
 */
router.post(
  '/complete/:sessionId',
  [
    param('sessionId')
      .isUUID()
      .withMessage('유효한 세션 ID가 필요합니다.'),
    handleValidationErrors(),
  ],
  (req: Request, res: Response) => phoneVerificationController.completeVerification(req, res)
);

/**
 * 헬스 체크
 * GET /health
 */
router.get('/health', (req: Request, res: Response) => 
  phoneVerificationController.healthCheck(req, res)
);

/**
 * 통계 정보 (개발 환경에서만)
 * GET /stats
 */
router.get('/stats', (req: Request, res: Response) => 
  phoneVerificationController.getStats(req, res)
);

export default router;