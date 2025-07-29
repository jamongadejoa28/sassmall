// ========================================
// Common Middlewares - 공통 미들웨어
// src/frameworks/web/middlewares/common.ts
// ========================================

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { HTTP_HEADERS, ApiResponse } from "../../shared/types";
import { logger } from "../../infrastructure/logging/Logger";

/**
 * Request ID 생성 미들웨어
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers[HTTP_HEADERS.REQUEST_ID] as string) || uuidv4();
  (req as any).requestId = requestId;
  res.setHeader(HTTP_HEADERS.REQUEST_ID, requestId);
  next();
}

/**
 * 로깅 미들웨어 - 구조화된 로깅 적용
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = (req as any).requestId;

  // 요청 시작 로그
  logger.http(`${req.method} ${req.originalUrl} - START`, {
    requestId,
    ...(req.user?.id && { userId: req.user.id }),
    method: req.method,
    url: req.originalUrl,
    metadata: {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
    }
  });

  // 응답 완료 시 로그
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });

  next();
}

/**
 * 에러 핸들링 미들웨어 - 구조화된 로깅 적용
 */
export function errorHandlingMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as any).requestId || "unknown";
  const timestamp = new Date().toISOString();

  // 구조화된 에러 로깅
  logger.error(`Request failed: ${req.method} ${req.originalUrl}`, {
    requestId,
    ...(req.user?.id && { userId: req.user.id }),
    method: req.method,
    url: req.originalUrl,
    error,
    statusCode: (error as any).statusCode || 500,
    metadata: {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      body: req.body
    }
  });

  if (res.headersSent) {
    return next(error);
  }

  const response: ApiResponse<null> = {
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "서버 내부 오류가 발생했습니다"
        : error.message,
    error: {
      code: error.code || "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    },
    data: null,
    timestamp,
    requestId,
  };

  res.status(error.statusCode || 500).json(response);
}

/**
 * 404 Not Found 핸들러
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as any).requestId || "unknown";

  const response: ApiResponse<null> = {
    success: false,
    message: `요청하신 경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
    error: {
      code: "NOT_FOUND",
    },
    data: null,
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(404).json(response);
}

/**
 * 헬스체크 핸들러 - 향상된 헬스체크 적용
 */
export async function healthCheckHandler(req: Request, res: Response): Promise<void> {
  const requestId = (req as any).requestId || "unknown";

  try {
    const { healthChecker } = await import("../../infrastructure/health/HealthChecker");
    const healthResult = await healthChecker.checkLiveness();

    const response: ApiResponse<any> = {
      success: healthResult.status === 'healthy',
      message: `Product Service is ${healthResult.status}`,
      data: healthResult,
      timestamp: new Date().toISOString(),
      requestId,
    };

    const statusCode = healthResult.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed', { error: error as Error, requestId });
    
    const response: ApiResponse<null> = {
      success: false,
      message: "Health check failed",
      error: {
        code: "HEALTH_CHECK_ERROR",
        details: (error as Error).message
      },
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(503).json(response);
  }
}

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: 서비스 상태 확인
 *     description: |
 *       Product Service의 현재 상태와 시스템 정보를 반환합니다.
 *       
 *       **확인 항목:**
 *       - 서비스 실행 상태
 *       - 메모리 사용량
 *       - 서버 가동 시간
 *       - 환경 설정 정보
 *       
 *       **용도:**
 *       - 로드 밸런서 헬스 체크
 *       - 모니터링 시스템 연동
 *       - 서비스 상태 확인
 *     responses:
 *       200:
 *         description: 서비스가 정상적으로 작동중입니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                   description: 요청 성공 여부
 *                 message:
 *                   type: string
 *                   example: "Product Service is healthy"
 *                   description: 상태 메시지
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                       example: "product-service"
 *                       description: 서비스 이름
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                       description: 서비스 버전
 *                     environment:
 *                       type: string
 *                       example: "development"
 *                       description: 실행 환경
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-15T12:46:46.522Z"
 *                       description: 응답 시간
 *                     uptime:
 *                       type: number
 *                       example: 300.93
 *                       description: 서버 가동 시간(초)
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           example: 28
 *                           description: 사용중인 메모리(MB)
 *                         total:
 *                           type: number
 *                           example: 30
 *                           description: 전체 메모리(MB)
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-06-15T12:46:46.522Z"
 *                   description: 응답 생성 시간
 *                 requestId:
 *                   type: string
 *                   example: "abc-123-def"
 *                   description: 요청 추적 ID
 *             examples:
 *               healthy:
 *                 summary: 정상 상태
 *                 value:
 *                   success: true
 *                   message: "Product Service is healthy"
 *                   data:
 *                     service: "product-service"
 *                     version: "1.0.0"
 *                     environment: "development"
 *                     timestamp: "2025-06-15T12:46:46.522Z"
 *                     uptime: 300.93
 *                     memory:
 *                       used: 28
 *                       total: 30
 *                   timestamp: "2025-06-15T12:46:46.522Z"
 *                   requestId: "abc-123-def"

/**
 * @swagger
 * /api:
 *   get:
 *     tags: [Health]
 *     summary: API 서비스 정보
 *     description: |
 *       Product Service API의 기본 정보와 사용 가능한 엔드포인트를 반환합니다.
 *       
 *       **포함 정보:**
 *       - 서비스 기본 정보
 *       - 사용 가능한 API 엔드포인트 목록
 *       - 서비스 주요 기능
 *       - API 문서 링크
 *     responses:
 *       200:
 *         description: API 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product Service API"
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                       example: "product-service"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     description:
 *                       type: string
 *                       example: "Clean Architecture 기반 상품 관리 마이크로서비스"
 *                     endpoints:
 *                       type: object
 *                       properties:
 *                         products:
 *                           type: string
 *                           example: "/api/v1/products"
 *                         health:
 *                           type: string
 *                           example: "/health"
 *                         docs:
 *                           type: string
 *                           example: "/api/docs"
 *                         spec:
 *                           type: string
 *                           example: "/api/docs/json"
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "상품 생성/조회/목록"
 *                         - "카테고리 기반 분류"
 *                         - "재고 관리 연동"
 *                         - "검색 및 필터링"
 *                         - "캐시 최적화"
 *                         - "📚 Swagger API 문서화"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 requestId:
 *                   type: string
 */
