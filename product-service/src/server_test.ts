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

// 환경 변수 로드
config();

/**
 * Express 애플리케이션 설정 및 시작
 */
class ProductServiceApp {
  private app: express.Application;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || "3003");
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize(): Promise<void> {
    try {
      console.log("🚀 [ProductService] 애플리케이션 초기화 시작...");

      // 1. DI Container 초기화
      console.log("📦 [ProductService] DI Container 초기화 중...");
      await DIContainer.create();
      console.log("✅ [ProductService] DI Container 초기화 완료");

      // 2. 미들웨어 설정
      this.setupMiddlewares();
      console.log("✅ [ProductService] 미들웨어 설정 완료");

      // 3. 라우트 설정
      this.setupRoutes();
      console.log("✅ [ProductService] 라우트 설정 완료");

      // 4. 에러 핸들링 설정
      this.setupErrorHandling();
      console.log("✅ [ProductService] 에러 핸들링 설정 완료");

      console.log("🎉 [ProductService] 애플리케이션 초기화 완료!");
    } catch (error) {
      console.error("❌ [ProductService] 애플리케이션 초기화 실패:", error);
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
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15분
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000"), // 1000 요청
      message: {
        error: "Too many requests from this IP",
        retryAfter: "15 minutes",
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

    // 요청 로깅 미들웨어
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(
          `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
        );
      });
      next();
    });
  }

  /**
   * 라우트 설정
   */
  private setupRoutes(): void {
    // 헬스 체크 엔드포인트
    this.app.get("/health", async (req, res) => {
      try {
        // 데이터베이스 연결 상태 확인
        const isDbConnected = DatabaseConfig.isConnected();

        // DI Container 상태 확인
        const container = DIContainer.getContainer();
        const isDiReady = container !== null;

        const healthStatus = {
          status: "ok",
          timestamp: new Date().toISOString(),
          service: "product-service",
          version: "1.0.0",
          environment: process.env.NODE_ENV,
          checks: {
            database: isDbConnected ? "healthy" : "unhealthy",
            diContainer: isDiReady ? "healthy" : "unhealthy",
          },
        };

        const isHealthy = isDbConnected && isDiReady;

        res.status(isHealthy ? 200 : 503).json(healthStatus);
      } catch (error) {
        console.error("❌ [Health Check] 오류:", error);
        res.status(503).json({
          status: "error",
          timestamp: new Date().toISOString(),
          service: "product-service",
          error: "Health check failed",
        });
      }
    });

    // API 정보 엔드포인트
    this.app.get("/", (req, res) => {
      res.json({
        service: "Product Service",
        version: "1.0.0",
        description: "마이크로서비스 쇼핑몰 - 상품 관리 서비스",
        endpoints: {
          health: "/health",
          docs: "/api/docs",
          api: "/api/v1",
        },
        timestamp: new Date().toISOString(),
      });
    });

    // 테스트용 라우트들
    this.setupTestRoutes();
  }

  /**
   * 테스트용 라우트 설정 (개발 환경에서만)
   */
  private setupTestRoutes(): void {
    if (process.env.NODE_ENV === "development") {
      // 데이터베이스 연결 테스트
      this.app.get("/test/database", async (req, res) => {
        try {
          const container = DIContainer.getContainer();
          const dataSource = container.get<DataSource>(TYPES.DataSource);

          const result = await dataSource.query("SELECT NOW() as current_time");

          res.json({
            status: "success",
            message: "데이터베이스 연결 성공",
            data: result[0],
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ [Database Test] 오류:", error);
          res.status(500).json({
            status: "error",
            message: "데이터베이스 연결 실패",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      // Redis 연결 테스트
      this.app.get("/test/redis", async (req, res) => {
        try {
          const container = DIContainer.getContainer();
          const cacheService = container.get<any>(TYPES.CacheService);

          // 테스트 데이터 저장 및 조회
          const testKey = "test:connection";
          const testData = {
            message: "Redis 연결 테스트",
            timestamp: new Date().toISOString(),
          };

          await cacheService.set(testKey, testData, 60); // 1분 TTL
          const retrievedData = await cacheService.get(testKey);

          res.json({
            status: "success",
            message: "Redis 연결 성공",
            data: {
              stored: testData,
              retrieved: retrievedData,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ [Redis Test] 오류:", error);
          res.status(500).json({
            status: "error",
            message: "Redis 연결 실패",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      // Repository 테스트
      this.app.get("/test/repository/categories", async (req, res) => {
        try {
          const container = DIContainer.getContainer();
          const categoryRepository = container.get<any>(
            TYPES.CategoryRepository
          );

          // 루트 카테고리들 조회
          const categories = await categoryRepository.findRootCategories();

          res.json({
            status: "success",
            message: "카테고리 Repository 테스트 성공",
            data: {
              count: categories.length,
              categories: categories.map((cat: any) => ({
                id: cat.getId(),
                name: cat.getName(),
                slug: cat.getSlug(),
                depth: cat.getDepth(),
              })),
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ [Repository Test] 오류:", error);
          res.status(500).json({
            status: "error",
            message: "Repository 테스트 실패",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      console.log("🧪 [ProductService] 개발용 테스트 라우트 활성화됨");
    }
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    // 404 에러 핸들러
    this.app.use("*", (req, res) => {
      res.status(404).json({
        status: "error",
        message: "Endpoint not found",
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    });

    // 글로벌 에러 핸들러
    this.app.use(
      (
        error: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        console.error("❌ [Global Error Handler]:", error);

        // 개발 환경에서는 스택 트레이스 포함
        const isDevelopment = process.env.NODE_ENV === "development";

        res.status(error.status || 500).json({
          status: "error",
          message: error.message || "Internal Server Error",
          ...(isDevelopment && { stack: error.stack }),
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      this.app.listen(this.PORT, () => {
        console.log(
          `🚀 [ProductService] 서버가 포트 ${this.PORT}에서 실행 중입니다.`
        );
        console.log(
          `📍 [ProductService] Health Check: http://localhost:${this.PORT}/health`
        );
        console.log(
          `📍 [ProductService] API Info: http://localhost:${this.PORT}/`
        );

        if (process.env.NODE_ENV === "development") {
          console.log(`🧪 [ProductService] 테스트 엔드포인트:`);
          console.log(
            `   - Database: http://localhost:${this.PORT}/test/database`
          );
          console.log(`   - Redis: http://localhost:${this.PORT}/test/redis`);
          console.log(
            `   - Repository: http://localhost:${this.PORT}/test/repository/categories`
          );
        }
      });
    } catch (error) {
      console.error("❌ [ProductService] 서버 시작 실패:", error);
      process.exit(1);
    }
  }

  /**
   * 서버 종료 처리
   */
  setupGracefulShutdown(): void {
    process.on("SIGTERM", async () => {
      console.log("🔄 [ProductService] SIGTERM 수신, 서버 종료 중...");
      await this.shutdown();
    });

    process.on("SIGINT", async () => {
      console.log("🔄 [ProductService] SIGINT 수신, 서버 종료 중...");
      await this.shutdown();
    });
  }

  /**
   * 서버 종료
   */
  private async shutdown(): Promise<void> {
    try {
      console.log("🔄 [ProductService] 데이터베이스 연결 종료 중...");
      await DatabaseConfig.disconnect();

      console.log("✅ [ProductService] 서버가 정상적으로 종료되었습니다.");
      process.exit(0);
    } catch (error) {
      console.error("❌ [ProductService] 서버 종료 중 오류:", error);
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
  console.error("❌ [ProductService] Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "❌ [ProductService] Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
  process.exit(1);
});

// 애플리케이션 실행
bootstrap().catch((error) => {
  console.error("❌ [ProductService] Bootstrap 실패:", error);
  process.exit(1);
});
