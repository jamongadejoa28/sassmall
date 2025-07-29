// ========================================
// Validation Middleware - Framework 계층
// src/framework/middleware/validationMiddleware.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import {
  body,
  param,
  validationResult,
  ValidationChain,
} from 'express-validator';

/**
 * 검증 결과 처리 미들웨어
 *
 * express-validator의 검증 결과를 확인하고
 * 에러가 있으면 400 상태 코드와 함께 상세한 에러 메시지 반환
 */
export function handleValidationErrors() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error: any) => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined,
      }));

      res.status(400).json({
        success: false,
        message: '입력 데이터 검증에 실패했습니다',
        error: 'VALIDATION_ERROR',
        data: null,
        details: formattedErrors,
      });
      return;
    }

    next();
  };
}

// ========================================
// 사용자 등록 검증 규칙
// ========================================
export const validateUserRegistration = (): ValidationChain[] => [
  // 이름 검증
  body('name')
    .trim()
    .notEmpty()
    .withMessage('이름은 필수 항목입니다')
    .isLength({ min: 2, max: 100 })
    .withMessage('이름은 2자 이상 100자 이하여야 합니다')
    .matches(/^[가-힣a-zA-Z\s]+$/)
    .withMessage('이름은 한글, 영문, 공백만 사용할 수 있습니다'),

  // 이메일 검증
  body('email')
    .trim()
    .notEmpty()
    .withMessage('이메일은 필수 항목입니다')
    .isEmail()
    .withMessage('유효한 이메일 주소를 입력해주세요')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('이메일은 255자를 초과할 수 없습니다'),

  // 비밀번호 검증
  body('password')
    .notEmpty()
    .withMessage('비밀번호는 필수 항목입니다')
    .isLength({ min: 8, max: 128 })
    .withMessage('비밀번호는 8자 이상 128자 이하여야 합니다')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage(
      '비밀번호는 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다'
    ),

  // 역할 검증 (선택적)
  body('role')
    .optional()
    .isIn(['customer', 'admin'])
    .withMessage('역할은 customer 또는 admin만 가능합니다'),
];

// ========================================
// 사용자 로그인 검증 규칙
// ========================================
export const validateUserLogin = (): ValidationChain[] => [
  // 이메일 검증
  body('email')
    .trim()
    .notEmpty()
    .withMessage('이메일은 필수 항목입니다')
    .isEmail()
    .withMessage('유효한 이메일 주소를 입력해주세요')
    .normalizeEmail(),

  // 비밀번호 검증
  body('password')
    .notEmpty()
    .withMessage('비밀번호는 필수 항목입니다')
    .isLength({ min: 1 })
    .withMessage('비밀번호를 입력해주세요'),
];

// ========================================
// 사용자 프로필 업데이트 검증 규칙
// ========================================
export const validateUserProfileUpdate = (): ValidationChain[] => [
  // 이름 검증 (선택적)
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('이름은 2자 이상 100자 이하여야 합니다')
    .matches(/^[가-힣a-zA-Z\s]+$/)
    .withMessage('이름은 한글, 영문, 공백만 사용할 수 있습니다'),

  // 전화번호 검증 (선택적)
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9-+\s()]+$/)
    .withMessage('올바른 전화번호 형식을 입력해주세요')
    .isLength({ min: 10, max: 20 })
    .withMessage('전화번호는 10자 이상 20자 이하여야 합니다'),

  // 주소 검증 (선택적)
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('주소는 500자를 초과할 수 없습니다'),

  // 최소 하나의 필드는 있어야 함
  body().custom((value: any, { req }: any) => {
    const { name, phoneNumber, address } = req.body;
    if (!name && !phoneNumber && !address) {
      throw new Error('업데이트할 정보를 하나 이상 입력해주세요');
    }
    return true;
  }),
];

// ========================================
// 사용자 ID 파라미터 검증 규칙
// ========================================
export const validateUserId = (): ValidationChain[] => [
  param('userId')
    .notEmpty()
    .withMessage('사용자 ID는 필수입니다')
    .isUUID()
    .withMessage('유효한 사용자 ID 형식이 아닙니다'),
];

// ========================================
// 비밀번호 변경 검증 규칙
// ========================================
export const validatePasswordChange = (): ValidationChain[] => [
  // 현재 비밀번호
  body('currentPassword')
    .notEmpty()
    .withMessage('현재 비밀번호는 필수 항목입니다'),

  // 새 비밀번호
  body('newPassword')
    .notEmpty()
    .withMessage('새 비밀번호는 필수 항목입니다')
    .isLength({ min: 8, max: 128 })
    .withMessage('새 비밀번호는 8자 이상 128자 이하여야 합니다')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage(
      '새 비밀번호는 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다'
    ),

  // 비밀번호 확인
  body('confirmPassword')
    .notEmpty()
    .withMessage('비밀번호 확인은 필수 항목입니다')
    .custom((value: any, { req }: any) => {
      if (value !== req.body.newPassword) {
        throw new Error('새 비밀번호와 비밀번호 확인이 일치하지 않습니다');
      }
      return true;
    }),

  // 현재 비밀번호와 새 비밀번호가 다른지 확인
  body('newPassword').custom((value: any, { req }: any) => {
    if (value === req.body.currentPassword) {
      throw new Error('새 비밀번호는 현재 비밀번호와 달라야 합니다');
    }
    return true;
  }),
];

// ========================================
// 이메일 인증 토큰 검증 규칙
// ========================================
export const validateEmailVerificationToken = (): ValidationChain[] => [
  body('token')
    .notEmpty()
    .withMessage('인증 토큰은 필수 항목입니다')
    .isUUID()
    .withMessage('유효한 인증 토큰 형식이 아닙니다'),
];

// ========================================
// 비밀번호 재설정 요청 검증 규칙
// ========================================
export const validatePasswordResetRequest = (): ValidationChain[] => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('이메일은 필수 항목입니다')
    .isEmail()
    .withMessage('유효한 이메일 주소를 입력해주세요')
    .normalizeEmail(),
];

// ========================================
// 비밀번호 재설정 검증 규칙
// ========================================
export const validatePasswordReset = (): ValidationChain[] => [
  body('token')
    .notEmpty()
    .withMessage('재설정 토큰은 필수 항목입니다')
    .isUUID()
    .withMessage('유효한 재설정 토큰 형식이 아닙니다'),

  body('newPassword')
    .notEmpty()
    .withMessage('새 비밀번호는 필수 항목입니다')
    .isLength({ min: 8, max: 128 })
    .withMessage('새 비밀번호는 8자 이상 128자 이하여야 합니다')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage(
      '새 비밀번호는 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다'
    ),

  body('confirmPassword')
    .notEmpty()
    .withMessage('비밀번호 확인은 필수 항목입니다')
    .custom((value: any, { req }: any) => {
      if (value !== req.body.newPassword) {
        throw new Error('새 비밀번호와 비밀번호 확인이 일치하지 않습니다');
      }
      return true;
    }),
];

// ========================================
// 공통 검증 유틸리티
// ========================================

/**
 * 사용자 정의 검증 규칙 생성 헬퍼
 */
export function createCustomValidation(
  field: string,
  validator: (value: any, req: Request) => boolean | Promise<boolean>,
  message: string
): ValidationChain {
  return body(field).custom(async (value: any, { req }: any) => {
    const isValid = await validator(value, req as Request);
    if (!isValid) {
      throw new Error(message);
    }
    return true;
  });
}

/**
 * 조건부 검증 규칙 생성 헬퍼
 */
export function conditionalValidation(
  condition: (req: Request) => boolean,
  validationChain: ValidationChain
): ValidationChain {
  return validationChain.if((value: any, { req }: any) => condition(req as Request));
}

// ========================================
// 검증 미들웨어 사용 예시
// ========================================
/*
// 라우터에서 사용 예시
router.post('/register', 
  validateUserRegistration(),
  handleValidationErrors(),
  userController.register
);

router.post('/login',
  validateUserLogin(),
  handleValidationErrors(),
  userController.login
);

router.put('/profile',
  requireAuth(tokenService),
  validateUserProfileUpdate(),
  handleValidationErrors(),
  userController.updateProfile
);
*/
