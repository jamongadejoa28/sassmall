// ========================================
// Express Server Main Entry Point
// src/server.ts
// ========================================

import compression from "compression";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { DatabaseConfig } from "./infrastructure/config/DatabaseConfig";
import { DIContainer } from "./infrastructure/di/Container";
import { TYPES } from "./infrastructure/di/types";
// 기존 imports 뒤에 추가
import {
  errorHandlingMiddleware,
  healthCheckHandler,
  notFoundHandler,
} from "./frameworks/middlewares/common";
import { createProductRoutes } from "./frameworks/routes/productRoutes";
import { createCategoryRoutes } from "./frameworks/routes/categoryRoutes";
import {
  setupSwagger,
  validateSwaggerSpec,
  logSwaggerInfo,
} from "./infrastructure/swagger/swaggerMiddleware";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { logger } from "./infrastructure/logging/Logger";
import { healthChecker } from "./infrastructure/health/HealthChecker";
// 환경 변수 로드
config();

/**
 * Express 애플리케이션 설정 및 시작
 */
class ProductServiceApp {
  private app: express.Application;
  private server: any;
  private readonly PORT: number;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || "3003");
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize(): Promise<void> {
    try {
      logger.info("애플리케이션 초기화 시작");

      // 1. DI Container 초기화
      logger.info("DI Container 초기화 중");
      await DIContainer.create();
      logger.info("DI Container 초기화 완료");

      // 2. 미들웨어 설정
      this.setupMiddlewares();
      logger.info("미들웨어 설정 완료");

      this.setupSwagger();

      // 3. 라우트 설정
      this.setupRoutes();
      logger.info("라우트 설정 완료");

      // 4. 에러 핸들링 설정
      this.setupErrorHandling();
      logger.info("에러 핸들링 설정 완료");

      logger.info("애플리케이션 초기화 완료!");
    } catch (error) {
      logger.error("애플리케이션 초기화 실패", { error: error as Error });
      throw error;
    }
  }

  /**
   * 미들웨어 설정
   */
  private setupMiddlewares(): void {
    // 보안 헤더 설정
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      })
    );

    // CORS 설정
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN?.split(",") || [
          "http://localhost:3000",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // 압축 설정
    this.app.use(compression());

    // 요청 제한 설정
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"), // 1분
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // 100 요청
      message: {
        error: "Too many requests from this IP",
        retryAfter: "1 minute",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // JSON 파싱 설정
    this.app.use(
      express.json({
        limit: process.env.MAX_FILE_SIZE || "10mb",
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: process.env.MAX_FILE_SIZE || "10mb",
      })
    );

    // 요청 로깅 미들웨어는 common.ts의 loggingMiddleware에서 처리
  }

  // 🚀 2. Swagger 설정 (클래스 내부에 추가)
  private setupSwagger(): void {
    try {
      // 간단한 Swagger 설정
      const swaggerOptions = {
        definition: {
          openapi: "3.0.0",
          info: {
            title: "Product Service API",
            version: "1.0.0",
            description: "Clean Architecture 기반 상품 관리 마이크로서비스",
          },
          servers: [
            {
              url: `http://localhost:${this.PORT}`,
              description: "개발 서버",
            },
          ],
          tags: [
            {
              name: "Products",
              description: "상품 관리 API",
            },
            {
              name: "Health",
              description: "서비스 상태 확인",
            },
          ],
        },
        apis: ["./src/**/*.ts"], // TypeScript 파일에서 JSDoc 주석 스캔
      };

      const swaggerSpec = swaggerJSDoc(swaggerOptions);

      // Swagger JSON 엔드포인트
      this.app.get("/api/docs/json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.json(swaggerSpec);
      });

      // Swagger UI 설정
      this.app.use(
        "/api/docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
          explorer: true,
          customSiteTitle: "Product Service API",
          customCss: ".swagger-ui .topbar { display: none; }",
        })
      );

      logger.info("Swagger 설정 완료");
    } catch (error) {
      logger.error("Swagger 설정 실패", { error: error as Error });
    }
  }

  /**
   * 라우트 설정
   */
  private setupRoutes(): void {
    // Health Check (Root)
    this.app.get("/", (req, res) => {
      res.redirect("/api/docs");
    });
    /**
     * @swagger
     * /health:
     *   get:
     *     tags: [Health]
     *     summary: 서비스 상태 확인
     *     responses:
     *       200:
     *         description: 서비스 정상 작동
     */
    this.app.get("/health", healthCheckHandler);

    // 고급 헬스체크 엔드포인트
    this.app.get("/health/ready", async (req, res) => {
      try {
        const healthResult = await healthChecker.checkReadiness();
        const response = {
          success: healthResult.status === 'healthy',
          message: `Product Service is ${healthResult.status}`,
          data: healthResult,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || "unknown",
        };
        const statusCode = healthResult.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(response);
      } catch (error) {
        logger.error('Readiness check failed', { error: error as Error });
        res.status(503).json({
          success: false,
          message: "Readiness check failed",
          error: { code: "READINESS_CHECK_ERROR", details: (error as Error).message },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || "unknown",
        });
      }
    });

    this.app.get("/health/live", async (req, res) => {
      try {
        const healthResult = await healthChecker.checkLiveness();
        const response = {
          success: healthResult.status === 'healthy',
          message: `Product Service is ${healthResult.status}`,
          data: healthResult,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || "unknown",
        };
        const statusCode = healthResult.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(response);
      } catch (error) {
        logger.error('Liveness check failed', { error: error as Error });
        res.status(503).json({
          success: false,
          message: "Liveness check failed",
          error: { code: "LIVENESS_CHECK_ERROR", details: (error as Error).message },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId || "unknown",
        });
      }
    });

    // API 정보
    this.app.get("/api", (req, res) => {
      const requestId = (req as any).requestId || "unknown";
      res.json({
        success: true,
        message: "Product Service API",
        data: {
          service: "product-service",
          version: "1.0.0",
          description: "Clean Architecture 기반 상품 관리 마이크로서비스",
          endpoints: {
            products: "/api/v1/products",
            health: "/health",
            docs: "/api/docs",
            spec: "/api/docs/json",
          },
          features: [
            "상품 생성/조회/목록",
            "카테고리 기반 분류",
            "재고 관리 연동",
            "검색 및 필터링",
            "캐시 최적화",
            "🚀 Swagger API 문서화",
          ],
        },
        timestamp: new Date().toISOString(),
        requestId,
      });
    });

    this.app.get("/test/database", async (req, res) => {
      try {
        const container = DIContainer.getContainer();
        const dataSource = container.get<DataSource>(TYPES.DataSource);

        // 한글 데이터 직접 조회
        const result = await dataSource.query(`
          SELECT name, brand, description 
          FROM products 
          WHERE sku LIKE 'TEST%' 
          ORDER BY "createdAt" DESC
        `);

        res.json({
          success: true,
          message: "데이터베이스 한글 데이터 확인",
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "데이터베이스 조회 실패",
          error: console.error(
            "❌ [ProductService] 서버 시작 실패:",
            (error as Error).message
          ),
        });
      }
    });

    // API v1 Routes - 새로운 REST API 추가!
    this.app.use("/api/v1/products", createProductRoutes());
    this.app.use("/api/v1/categories", createCategoryRoutes());

    logger.info("API 라우트 설정 완료");
    logger.info("사용 가능한 엔드포인트", {
      metadata: {
        endpoints: [
          "GET  /              - Health Check",
          "GET  /health        - Health Check",
          "GET  /api           - API 정보",
          "POST /api/v1/products       - 상품 생성",
          "GET  /api/v1/products       - 상품 목록 조회",
          "GET  /api/v1/products/:id   - 상품 상세 조회",
          "GET  /api/v1/categories     - 카테고리 목록 조회",
          "POST /api/v1/categories     - 카테고리 생성 (관리자)",
          "GET  /api/v1/categories/:id - 카테고리 상세 조회",
          "PUT  /api/v1/categories/:id - 카테고리 수정 (관리자)",
          "DELETE /api/v1/categories/:id - 카테고리 삭제 (관리자)"
        ]
      }
    });
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    // 404 Not Found
    this.app.use(notFoundHandler);

    // Global Error Handler
    this.app.use(errorHandlingMiddleware);

    logger.info("에러 핸들링 설정 완료");
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      this.server = this.app.listen(this.PORT, () => {
        logger.info(`서버가 포트 ${this.PORT}에서 실행 중입니다`, {
          metadata: {
            port: this.PORT,
            healthCheck: `http://localhost:${this.PORT}/health`,
            apiInfo: `http://localhost:${this.PORT}/`,
            apiDocs: `http://localhost:${this.PORT}/api/docs`,
            apiSpec: `http://localhost:${this.PORT}/api/docs/json`,
            environment: process.env.NODE_ENV || "development"
          }
        });

        if (process.env.NODE_ENV === "development") {
          logger.info("테스트 엔드포인트", {
            metadata: {
              database: `http://localhost:${this.PORT}/test/database`,
              redis: `http://localhost:${this.PORT}/test/redis`,
              repository: `http://localhost:${this.PORT}/test/repository/categories`
            }
          });
        }
      });

      // 서버 에러 처리
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`포트 ${this.PORT}가 이미 사용 중입니다`, { error });
        } else {
          logger.error('서버 에러 발생', { error });
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error("서버 시작 실패", { error: error as Error });
      process.exit(1);
    }
  }

  /**
   * 서버 종료 처리 - 개선된 Graceful Shutdown
   */
  setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn(`종료 진행 중, ${signal} 무시됨`);
        return;
      }

      this.isShuttingDown = true;
      logger.info(`${signal} 수신, 서버 종료 중...`);
      
      // 헬스체크에 종료 상태 알림
      healthChecker.setShuttingDown(true);
      
      await this.shutdown();
    };

    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.on("SIGINT", () => shutdownHandler("SIGINT"));
    
    // 강제 종료 방지 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      process.on("SIGQUIT", () => shutdownHandler("SIGQUIT"));
    }
  }

  /**
   * 서버 종료 - 개선된 Graceful Shutdown
   */
  private async shutdown(): Promise<void> {
    const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || "30000"); // 30초
    const shutdownTimer = setTimeout(() => {
      logger.error("강제 종료 (타임아웃)");
      process.exit(1);
    }, shutdownTimeout);

    try {
      logger.info("HTTP 서버 종료 중...");
      
      // 1. HTTP 서버 종료 (새로운 연결 차단)
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((err: any) => {
            if (err) {
              reject(err);
            } else {
              logger.info("HTTP 서버 종료 완료");
              resolve();
            }
          });
        });
      }

      logger.info("리소스 정리 중...");
      
      // 2. DI Container 정리 (DB, Redis 연결 포함)
      await DIContainer.cleanup();

      logger.info("서버가 정상적으로 종료되었습니다");
      
      // 3. 로거 정리
      logger.close();
      
      clearTimeout(shutdownTimer);
      process.exit(0);
    } catch (error) {
      logger.error("서버 종료 중 오류", { error: error as Error });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }
}

// ========================================
// 애플리케이션 시작
// ========================================

async function bootstrap() {
  const app = new ProductServiceApp();

  // Graceful shutdown 설정
  app.setupGracefulShutdown();

  // 서버 시작
  await app.start();
}

// 미처리 예외 처리
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception 발생", { error });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection 발생", { 
    error: reason as Error, 
    metadata: { promise: promise.toString() }
  });
  process.exit(1);
});

// 애플리케이션 실행
bootstrap().catch((error) => {
  logger.error("Bootstrap 실패", { error });
  process.exit(1);
});
