// api-gateway/src/app.ts

import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { createProxyMiddleware } from 'http-proxy-middleware';
import multer from 'multer';

// Define simple types locally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ApiResponse<T = any> {
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
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

const getCurrentTimestamp = (): string => new Date().toISOString();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createLogger = (name: string) => console;

// Local error handler implementation

import { authRoutes } from './routes/auth';

// ========================================
// 타입 정의
// ========================================

// Extend Express Request interface globally
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

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

// ========================================
// 앱 초기화
// ========================================
const app = express();
const logger = createLogger('api-gateway');

// ========================================
// 이미지 프록시 라우트 (최우선 처리)
// ========================================

// 정적 이미지 파일 프록시 - 다른 미들웨어보다 먼저 처리
app.get('/uploads/products/:filename', async (req: Request, res: Response) => {
  try {
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3003';
    const imageUrl = `${productServiceUrl}/uploads/products/${req.params.filename}`;
    
    console.log(`[API Gateway] Image proxy request: ${imageUrl}`);
    
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 10000,
    });
    
    // Content-Type 헤더 전달
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }
    
    // CORS 헤더 추가
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    
    // 캐시 방지 헤더 추가 (이미지 업데이트 시 새로고침 보장)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // 이미지 스트림을 클라이언트로 파이프
    response.data.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(404).json({
      success: false,
      error: 'Image not found',
      timestamp: getCurrentTimestamp(),
    });
  }
});

// ========================================
// 기본 미들웨어 설정
// ========================================

// 보안 헤더 설정
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
  })
);

// CORS 설정
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Session-ID',
    ],
  })
);

// 요청 압축
app.use(compression());

// 요청 크기 제한
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 요청 로깅 (개발 환경에서만 상세 로그)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('common'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 프로덕션에서는 더 엄격하게
  message: {
    success: false,
    error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 요청 ID 추가 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ========================================
// 헬스체크 라우트
// ========================================
app.get('/health', (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  const response: ApiResponse = {
    success: true,
    data: healthData,
    message: 'API Gateway is healthy',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };

  res.status(HTTP_STATUS.OK).json(response);
});

app.get('/health/live', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      alive: true,
      timestamp: getCurrentTimestamp(),
      pid: process.pid,
    },
    message: 'Service is alive',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };

  res.status(HTTP_STATUS.OK).json(response);
});

app.get('/health/ready', (req: Request, res: Response) => {
  // 실제로는 데이터베이스, Redis 등의 연결 상태를 확인
  const checks = {
    memory: process.memoryUsage().heapUsed < 1024 * 1024 * 512, // 512MB 미만
    uptime: process.uptime() > 0,
    environment: !!process.env.NODE_ENV,
  };

  const ready = Object.values(checks).every(Boolean);

  const response: ApiResponse = {
    success: true,
    data: {
      ready,
      checks,
    },
    message: ready ? 'Service is ready' : 'Service is not ready',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };

  res.status(HTTP_STATUS.OK).json(response);
});

// ========================================
// API 라우트 설정
// ========================================
const API_VERSION = '/api/v1';

// 인증 관련 라우트
app.use(`${API_VERSION}/auth`, authRoutes);

// 디버깅: 등록된 라우트 확인
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [API Gateway] 등록된 라우트들:');
  console.log('   📝 Auth 라우트:');
  console.log('      - POST /api/v1/auth/login');
  console.log('      - POST /api/v1/auth/register');
  console.log('      - POST /api/v1/auth/pass-verification/request');
  console.log('      - GET  /api/v1/auth/pass-verification/status/:sessionId');
  console.log('      - POST /api/v1/auth/pass-verification/callback');
  console.log('   👤 User 라우트:');
  console.log('      - ALL  /api/v1/users/* (프록시 -> User Service)');
  console.log('   🛒 Product 라우트:');
  console.log('      - ALL  /api/v1/products/* (프록시 -> Product Service)');
  console.log('   🛍️  Cart 라우트:');
  console.log('      - ALL  /api/v1/cart/* (프록시 -> Cart Service)');
  console.log('   📦 Order 라우트:');
  console.log('      - ALL  /api/v1/orders/* (프록시 -> Order Service)');
  console.log('   🏥 Health 라우트:');
  console.log('      - GET  /health');
  console.log('      - GET  /health/live');
  console.log('      - GET  /health/ready');
}

// 사용자 라우트 (User Service로 프록시)
app.use(`${API_VERSION}/users`, async (req: Request, res: Response) => {
  try {
    const userServiceUrl =
      process.env.USER_SERVICE_URL || 'http://127.0.0.1:3002';

    // Debug logging for user proxy requests
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🔍 [API Gateway] User proxy request: ${req.method} ${req.url}`
      );
      console.log(
        `🔍 [API Gateway] Target URL: ${userServiceUrl}/api/users${req.url}`
      );
    }

    // 요청 헤더 복사 (인증 정보 등)
    const headers = { ...req.headers };
    delete headers.host; // host 헤더 제거

    // Authorization 헤더가 있으면 전달 (JWT 토큰)
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    // User Service로 프록시
    const proxyResponse = await axios({
      method: req.method,
      url: `${userServiceUrl}/api/users${req.url}`,
      data: req.body,
      headers,
      timeout: 30000, // 30초 타임아웃 설정
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ [API Gateway] User proxy success: ${proxyResponse.status}`
      );
    }

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    // User Service 에러 상세 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ [API Gateway] User Service 에러:`, error);
      if (isAxiosError(error) && error.response) {
        console.error(`❌ [API Gateway] 응답 상태: ${error.response.status}`);
        console.error(`❌ [API Gateway] 응답 데이터:`, error.response.data);
      }
    }

    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        (isAxiosError(error) && error.response?.data?.message) ||
        (isAxiosError(error) && error.message) ||
        'User Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(
        (isAxiosError(error) && error.response?.status) ||
          HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
      .json(response);
  }
});

// 카테고리 라우트 (Product Service로 프록시)
app.use(`${API_VERSION}/categories`, async (req: Request, res: Response) => {
  try {
    const productServiceUrl =
      process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3003';

    // 요청 헤더 복사
    const headers = { ...req.headers };
    delete headers.host; // host 헤더 제거

    // Debug logging for category proxy requests
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🔍 [API Gateway] Category proxy request: ${req.method} ${req.url}`
      );
      console.log(
        `🔍 [API Gateway] Target URL: ${productServiceUrl}/api/v1/categories${req.url}`
      );
    }

    // Product Service로 프록시
    const proxyResponse = await axios({
      method: req.method,
      url: `${productServiceUrl}/api/v1/categories${req.url}`,
      data: req.body,
      headers,
      timeout: 30000, // 30초 타임아웃 설정
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ [API Gateway] Category proxy success: ${proxyResponse.status}`
      );
    }

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    // Category Service 에러 상세 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ [API Gateway] Category Service 에러:`, error);
      if (isAxiosError(error) && error.response) {
        console.error(`❌ [API Gateway] 응답 상태: ${error.response.status}`);
        console.error(`❌ [API Gateway] 응답 데이터:`, error.response.data);
      }
    }

    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        (isAxiosError(error) && error.response?.data?.message) ||
        (isAxiosError(error) && error.message) ||
        'Category Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(
        (isAxiosError(error) && error.response?.status) ||
          HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
      .json(response);
  }
});

// Multer 설정 (메모리 저장)
const upload = multer({ storage: multer.memoryStorage() });

// 상품 생성 라우트 (이미지 업로드 포함)
app.post(`${API_VERSION}/products`, upload.array('images', 4), async (req: Request, res: Response) => {
  try {
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3003';
    const FormData = require('form-data');
    
    const formData = new FormData();
    
    // productData 추가
    if (req.body.productData) {
      formData.append('productData', req.body.productData);
    }
    
    // 썸네일 인덱스 추가
    if (req.body.thumbnailIndex) {
      formData.append('thumbnailIndex', req.body.thumbnailIndex);
    }
    
    // 파일들 추가
    const files = req.files as Express.Multer.File[];
    if (files && Array.isArray(files)) {
      files.forEach((file: Express.Multer.File) => {
        formData.append('images', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }
    
    const proxyResponse = await axios({
      method: 'POST',
      url: `${productServiceUrl}/api/v1/products`,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': req.headers.authorization,
        'X-Request-ID': req.id,
      },
      timeout: 60000,
    });

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error: (isAxiosError(error) && error.response?.data?.message) || 
             (isAxiosError(error) && error.message) || 
             'Product creation failed',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res.status((isAxiosError(error) && error.response?.status) || 500).json(response);
  }
});

// 상품 수정 라우트 (이미지 업로드 포함)
app.put(`${API_VERSION}/products/:id`, upload.array('images', 4), async (req: Request, res: Response) => {
  try {
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3003';
    const FormData = require('form-data');
    
    const formData = new FormData();
    
    // productData 추가
    if (req.body.productData) {
      formData.append('productData', req.body.productData);
    }
    
    // 썸네일 인덱스 추가
    if (req.body.thumbnailIndex) {
      formData.append('thumbnailIndex', req.body.thumbnailIndex);
    }
    
    // 파일들 추가
    const files = req.files as Express.Multer.File[];
    if (files && Array.isArray(files)) {
      files.forEach((file: Express.Multer.File) => {
        formData.append('images', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }
    
    const proxyResponse = await axios({
      method: 'PUT',
      url: `${productServiceUrl}/api/v1/products/${req.params.id}`,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': req.headers.authorization,
        'X-Request-ID': req.id,
      },
      timeout: 60000,
    });

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error: (isAxiosError(error) && error.response?.data?.message) || 
             (isAxiosError(error) && error.message) || 
             'Product update failed',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res.status((isAxiosError(error) && error.response?.status) || 500).json(response);
  }
});

// 나머지 상품 라우트 (일반 프록시)
app.use(`${API_VERSION}/products`, async (req: Request, res: Response) => {
  try {
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3003';
    const headers = { ...req.headers };
    delete headers.host;

    const proxyResponse = await axios({
      method: req.method,
      url: `${productServiceUrl}/api/v1/products${req.url}`,
      data: req.body,
      headers,
      timeout: 30000,
    });

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        (isAxiosError(error) && error.response?.data?.message) ||
        (isAxiosError(error) && error.message) ||
        'Product Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(
        (isAxiosError(error) && error.response?.status) ||
          HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
      .json(response);
  }
});

// 장바구니 라우트 (Cart Service로 프록시)
app.use(`${API_VERSION}/cart`, async (req: Request, res: Response) => {
  try {
    const cartServiceUrl =
      process.env.CART_SERVICE_URL || 'http://127.0.0.1:3006';

    // Debug logging for cart proxy requests
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] Cart proxy request: ${req.method} ${req.url}`);
      console.log(
        `[DEBUG] Target URL: ${cartServiceUrl}/api/v1/cart${req.url}`
      );
    }

    // 연결 테스트를 위한 간단한 헬스체크
    try {
      const healthCheck = await axios.get(`${cartServiceUrl}/health`, {
        timeout: 5000,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Cart service health check: ${healthCheck.status}`);
      }
    } catch (healthError: unknown) {
      if (process.env.NODE_ENV === 'development') {
        const error = healthError as Error;
        console.error(
          `[DEBUG] Cart service health check failed:`,
          error.message
        );
      }
    }

    // 요청 헤더 복사 (인증 정보, 세션 ID 등)
    const headers = { ...req.headers };
    delete headers.host; // host 헤더 제거

    // X-Session-ID 헤더가 있으면 전달
    if (req.headers['x-session-id']) {
      headers['x-session-id'] = req.headers['x-session-id'];
    }

    // Cart Service로 프록시
    // Use the full request URL to avoid query parameter duplication
    const proxyResponse = await axios({
      method: req.method,
      url: `${cartServiceUrl}/api/v1/cart${req.url}`,
      data: req.body,
      headers,
      timeout: 30000, // 30초 타임아웃 설정
      // Don't use params since req.url already contains query parameters
    });

    // Set-Cookie 헤더 전달 (세션 관리를 위해 필수)
    if (proxyResponse.headers['set-cookie']) {
      // 쿠키의 도메인을 클라이언트 도메인으로 수정
      const modifiedCookies = proxyResponse.headers['set-cookie'].map(
        (cookie: string) => {
          // 기존 도메인 제거하고 클라이언트가 접근할 수 있도록 수정
          return cookie.replace(/Domain=[^;]+;?\s*/i, '');
        }
      );
      res.set('Set-Cookie', modifiedCookies);
    }

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    // Cart Service가 실행되지 않는 경우 빈 장바구니 응답 제공
    // eslint-disable-next-line no-console
    console.log('Cart service error:', error);

    // Check for connection refused error (multiple ways it can appear)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorMessage = (error as any)?.message || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = (error as any)?.code || '';
    const isConnectionError =
      errorCode === 'ECONNREFUSED' ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('connect ECONNREFUSED');

    // eslint-disable-next-line no-console
    console.log('Error details:', {
      errorMessage,
      errorCode,
      isConnectionError,
      method: req.method,
    });

    if (isConnectionError && req.method === 'GET') {
      // eslint-disable-next-line no-console
      console.log('Returning cart fallback response');
      const response: ApiResponse = {
        success: true,
        data: {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          sessionId: null,
        },
        message: 'Cart Service is not available. Showing empty cart.',
        timestamp: getCurrentTimestamp(),
        requestId: req.id,
      };
      return res.status(HTTP_STATUS.OK).json(response);
    }

    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        (isAxiosError(error) && error.response?.data?.message) ||
        (isAxiosError(error) && error.message) ||
        'Cart Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(
        (isAxiosError(error) && error.response?.status) ||
          HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
      .json(response);
  }
});

// 주문 라우트 (Order Service로 프록시)
app.use(`${API_VERSION}/orders`, async (req: Request, res: Response) => {
  try {
    const orderServiceUrl =
      process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3004';

    // Debug logging for order proxy requests
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] Order proxy request: ${req.method} ${req.url}`);
      console.log(
        `[DEBUG] Target URL: ${orderServiceUrl}/api/orders${req.url}`
      );
    }

    // 연결 테스트를 위한 간단한 헬스체크
    try {
      const healthCheck = await axios.get(`${orderServiceUrl}/health`, {
        timeout: 5000,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[DEBUG] Order service health check: ${healthCheck.status}`
        );
      }
    } catch (healthError: unknown) {
      if (process.env.NODE_ENV === 'development') {
        const error = healthError as Error;
        console.error(
          `[DEBUG] Order service health check failed:`,
          error.message
        );
      }
    }

    // 요청 헤더 복사 (인증 정보, Authorization 등)
    const headers = { ...req.headers };
    delete headers.host; // host 헤더 제거

    // Authorization 헤더가 있으면 전달 (JWT 토큰)
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    // Order Service로 프록시
    // Order Service는 /api/orders 경로를 사용하므로 API_VERSION을 제거
    const proxyResponse = await axios({
      method: req.method,
      url: `${orderServiceUrl}/api/orders${req.url}`,
      data: req.body,
      headers,
      timeout: 30000, // 30초 타임아웃 설정
    });

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: unknown) {
    // Order Service가 실행되지 않는 경우 에러 응답
    console.log('Order service error:', error);

    // Check for connection refused error
    const errorMessage = error instanceof Error ? error.message : '';
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: string }).code
        : '';
    const isConnectionError =
      errorCode === 'ECONNREFUSED' ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('connect ECONNREFUSED');

    console.log('Order service error details:', {
      errorMessage,
      errorCode,
      isConnectionError,
      method: req.method,
    });

    if (isConnectionError) {
      const response: ApiResponse = {
        success: false,
        data: null,
        error:
          'Order Service가 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
        timestamp: getCurrentTimestamp(),
        requestId: req.id,
      };
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
    }

    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        (isAxiosError(error) && error.response?.data?.message) ||
        (isAxiosError(error) && error.message) ||
        'Order Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(
        (isAxiosError(error) && error.response?.status) ||
          HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
      .json(response);
  }
});

// ========================================
// 에러 핸들링 미들웨어
// ========================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `경로를 찾을 수 없습니다: ${req.originalUrl}`,
    error: { code: 'NOT_FOUND' },
    timestamp: getCurrentTimestamp(),
    requestId: req.headers['x-request-id'] as string || 'unknown'
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Gateway Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: getCurrentTimestamp()
  });

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: { code: 'INTERNAL_ERROR' },
    timestamp: getCurrentTimestamp(),
    requestId: req.headers['x-request-id'] as string || 'unknown'
  });
});

// ========================================
// 프로세스 에러 핸들링
// ========================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ========================================
// 로깅
// ========================================
logger.info('API Gateway application initialized', {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
});

export default app;
