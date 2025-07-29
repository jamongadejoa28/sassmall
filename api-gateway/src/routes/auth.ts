import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import {
  asyncHandler,
  createValidationError,
} from '../middleware/errorHandler';

// Define types locally
// Note: User interface defined for potential future use
// interface User {
//   id: string;
//   email: string;
//   name: string;
//   role: UserRole;
//   isEmailVerified?: boolean;
//   isActive: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// Note: UserRole enum defined for potential future use
// enum UserRole {
//   USER = 'user',
//   ADMIN = 'admin',
//   CUSTOMER = 'customer',
// }

// Note: TokenPair interface defined for potential future use
// interface TokenPair {
//   accessToken: string;
//   refreshToken: string;
//   expiresIn: number;
// }

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  requestId?: string;
  error?: string;
}

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

const createLogger = () => console;

// Request interface is extended globally in app.ts

const router = Router();
const logger = createLogger();

// 진단용 라우트 (맨 앞에 배치)
router.get('/diagnose', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AUTH 라우터가 정상 작동 중입니다!',
    timestamp: new Date().toISOString(),
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  });
});

// User Service URL
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Error type guard for axios errors
interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return typeof error === 'object' && error !== null;
}

// ===== 유효성 검사 규칙 =====
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('유효한 이메일을 입력해주세요'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다'),
];

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('이름은 최소 2자 이상이어야 합니다'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('유효한 이메일을 입력해주세요'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      '비밀번호는 최소 8자이며, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다'
    ),
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('리프레시 토큰이 필요합니다'),
];

// ===== 헬퍼 함수 =====
const checkValidationErrors = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(
      '입력 데이터가 올바르지 않습니다',
      errors.array()
    );
  }
};

// ===== 라우트 정의 =====

/**
 * @route POST /auth/login
 * @desc 사용자 로그인 - User Service로 프록시
 */
router.post(
  '/login',
  loginValidation,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);

    try {
      logger.info('Proxying login request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.post(
        `${USER_SERVICE_URL}/api/users/login`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
          },
          timeout: 10000, // 10초 타임아웃
        }
      );

      logger.info('Login request successful', {
        userId: response.data?.data?.user?.id,
        requestId: req.id,
      });

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Login proxy error:', error);

      if (isAxiosError(error) && error.response) {
        // User Service에서 온 에러 응답 그대로 전달
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        // 연결 실패 등의 경우
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route POST /auth/register
 * @desc 사용자 회원가입 - User Service로 프록시
 */
router.post(
  '/register',
  registerValidation,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);

    try {
      logger.info('Proxying register request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.post(
        `${USER_SERVICE_URL}/api/users/register`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
          },
          timeout: 15000, // 15초 타임아웃 (회원가입은 시간이 더 걸릴 수 있음)
        }
      );

      logger.info('Register request successful', {
        userId: response.data?.data?.user?.id,
        requestId: req.id,
      });

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Register proxy error:', error);

      if (isAxiosError(error) && error.response) {
        // User Service에서 온 에러 응답 그대로 전달
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        // 연결 실패 등의 경우
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route POST /auth/refresh
 * @desc 토큰 갱신 - User Service로 프록시
 */
router.post(
  '/refresh',
  refreshTokenValidation,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);

    try {
      logger.info('Proxying refresh request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.post(
        `${USER_SERVICE_URL}/api/users/refresh`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
          },
          timeout: 10000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Refresh proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route POST /auth/logout
 * @desc 로그아웃 - User Service로 프록시
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Proxying logout request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.post(
        `${USER_SERVICE_URL}/api/users/logout`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
            Authorization: req.headers.authorization, // 인증 헤더 전달
          },
          timeout: 10000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Logout proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route GET /auth/profile
 * @desc 현재 사용자 정보 조회 - User Service로 프록시
 */
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Proxying profile request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.get(
        `${USER_SERVICE_URL}/api/users/profile`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
            Authorization: req.headers.authorization, // 인증 헤더 전달
          },
          timeout: 10000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Profile proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route PUT /auth/profile
 * @desc 사용자 정보 업데이트 - User Service로 프록시
 */
router.put(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Proxying profile update request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.put(
        `${USER_SERVICE_URL}/api/users/profile`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
            Authorization: req.headers.authorization, // 인증 헤더 전달
          },
          timeout: 15000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Profile update proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route DELETE /auth/profile
 * @desc 계정 비활성화 - User Service로 프록시
 */
router.delete(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Proxying account deactivation request to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      const response = await axios.delete(
        `${USER_SERVICE_URL}/api/users/profile`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
            Authorization: req.headers.authorization, // 인증 헤더 전달
          },
          timeout: 15000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Account deactivation proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route POST /auth/phone-verification/request
 * @desc 휴대폰 인증 요청 - User Service로 프록시
 */
router.post(
  '/phone-verification/request',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('📱 [Phone API] 인증 요청 프록시 시작', {
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
        phoneNumber: req.body.phoneNumber
          ? '***' + req.body.phoneNumber.slice(-4)
          : 'none',
      });

      const response = await axios.post(
        `${USER_SERVICE_URL}/api/users/phone-verification/request`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
          },
          timeout: 15000,
        }
      );

      logger.info('✅ [Phone API] User Service 응답 성공', {
        status: response.status,
        requestId: req.id,
      });

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('❌ [Phone API] 프록시 에러:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userServiceUrl: USER_SERVICE_URL,
        requestId: req.id,
      });

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route GET /auth/phone-verification/status/:sessionId
 * @desc 휴대폰 인증 상태 확인 - User Service로 프록시
 */
router.get(
  '/phone-verification/status/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Proxying phone verification status to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        sessionId: req.params.sessionId,
        requestId: req.id,
      });

      const response = await axios.get(
        `${USER_SERVICE_URL}/api/users/phone-verification/status/${req.params.sessionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
          },
          timeout: 10000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Phone verification status proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

/**
 * @route POST /auth/phone-verification/complete/:sessionId
 * @desc 휴대폰 인증 완료 - User Service로 프록시
 */
router.post(
  '/phone-verification/complete/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Proxying phone verification complete to User Service', {
        userServiceUrl: USER_SERVICE_URL,
        sessionId: req.params.sessionId,
        requestId: req.id,
      });

      const response = await axios.post(
        `${USER_SERVICE_URL}/api/users/phone-verification/complete/${req.params.sessionId}`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.id,
          },
          timeout: 15000,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      logger.error('Phone verification complete proxy error:', error);

      if (isAxiosError(error) && error.response) {
        res
          .status(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(error.response.data);
      } else {
        const response: ApiResponse = {
          success: false,
          data: null,
          error:
            'User Service에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
      }
    }
  })
);

// 테스트 라우트 추가
router.get('/phone-test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Phone verification 라우트 테스트 성공',
    timestamp: new Date().toISOString(),
  });
});

export { router as authRoutes };
