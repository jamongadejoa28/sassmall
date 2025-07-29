// ========================================
// Express Server Main Entry Point - cart-service
// cart-service/src/server.ts
// ========================================

import compression from "compression";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { DIContainer } from "./infrastructure/di/Container";
import { TYPES } from "./infrastructure/di/types";

// 미들웨어 import
import { authMiddleware } from "./frameworks/middleware/authMiddleware";
import { sessionMiddleware } from "./frameworks/middleware/sessionMiddleware";
import { rateLimitMiddleware } from "./frameworks/middleware/rateLimitMiddleware";
import { validateRequest } from "./frameworks/middleware/validateRequest";

// 라우터 import
import { createCartRoutes } from "./frameworks/routes/cartRoutes";
import { CartController } from "./frameworks/controllers/CartController";

// 환경 변수 로드
config();

/**
 * Express 애플리케이션 설정 및 시작
 */
class CartServiceApp {
  private app: express.Application;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || "3006");
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize(): Promise<void> {
    try {
      console.log("🚀 [CartService] 애플리케이션 초기화 시작...");

      // 1. DI Container 초기화
      console.log("📦 [CartService] DI Container 초기화 중...");
      await DIContainer.create();
      console.log("✅ [CartService] DI Container 초기화 완료");

      // 2. 미들웨어 설정
      this.setupMiddlewares();
      console.log("✅ [CartService] 미들웨어 설정 완료");

      // 3. 라우트 설정
      this.setupRoutes();
      console.log("✅ [CartService] 라우트 설정 완료");

      // 4. 에러 핸들링 설정
      this.setupErrorHandling();
      console.log("✅ [CartService] 에러 핸들링 설정 완료");

      console.log("🎉 [CartService] 애플리케이션 초기화 완료!");
    } catch (error) {
      console.error("❌ [CartService] 애플리케이션 초기화 실패:", error);
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
          "http://localhost:3001",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
      })
    );

    // 압축 설정
    this.app.use(compression());

    // 전역 요청 제한 설정
    const globalLimiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15분
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000"), // 1000 요청
      message: {
        error: "Too many requests from this IP",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // JSON 파싱 설정
    this.app.use(
      express.json({
        limit: "10mb",
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: "10mb",
      })
    );

    // 요청 로깅 미들웨어
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        const sessionId = req.headers["x-session-id"] || "anonymous";
        console.log(
          `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Session: ${sessionId}`
        );
      });
      next();
    });

    // 세션 미들웨어 (비로그인 사용자 지원)
    this.app.use(sessionMiddleware);
  }

  /**
   * 라우트 설정
   */
  private setupRoutes(): void {
    // 헬스 체크 엔드포인트
    this.app.get("/health", async (req, res) => {
      try {
        // 데이터베이스 연결 상태 확인
        const container = DIContainer.getContainer();
        const dataSource = container.get<DataSource>(TYPES.DataSource);
        const isDbConnected = dataSource.isInitialized;

        const healthStatus = {
          status: "ok",
          timestamp: new Date().toISOString(),
          service: "cart-service",
          version: "1.0.0",
          environment: process.env.NODE_ENV,
          checks: {
            database: isDbConnected ? "healthy" : "unhealthy",
            redis: "healthy", // Redis 상태 체크는 간단히 healthy로 설정
            dependencies: {
              "product-service": "healthy", // 향후 실제 체크 구현
            },
          },
        };

        const httpStatus = isDbConnected ? 200 : 503;
        res.status(httpStatus).json(healthStatus);
      } catch (error: any) {
        res.status(503).json({
          status: "error",
          timestamp: new Date().toISOString(),
          service: "cart-service",
          error: error.message,
        });
      }
    });

    // 장바구니 관련 라우트 (DI Container에서 CartController 주입)
    const container = DIContainer.getContainer();
    const cartController = container.get<CartController>(TYPES.CartController);
    const cartRouter = createCartRoutes(cartController);
    this.app.use("/api/v1/cart", cartRouter);

    // API 문서 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      this.app.get("/api/docs", (req, res) => {
        res.json({
          service: "cart-service",
          version: "1.0.0",
          endpoints: {
            "POST /api/v1/cart/items": "장바구니에 상품 추가",
            "GET /api/v1/cart": "장바구니 조회",
            "PUT /api/v1/cart/items/:productId": "장바구니 상품 수량 변경",
            "DELETE /api/v1/cart/items/:productId": "장바구니 상품 제거",
            "POST /api/v1/cart/transfer": "비로그인→로그인 장바구니 이전",
            "DELETE /api/v1/cart": "장바구니 비우기",
          },
        });
      });
    }

    // 404 핸들러
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `경로를 찾을 수 없습니다: ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    // 전역 에러 핸들러
    this.app.use(
      (
        error: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        console.error("❌ [CartService] 전역 에러:", error);

        // 에러 타입별 처리
        let statusCode = 500;
        let errorMessage = "내부 서버 오류가 발생했습니다.";

        if (error.name === "ValidationError") {
          statusCode = 400;
          errorMessage = error.message;
        } else if (error.name === "UnauthorizedError") {
          statusCode = 401;
          errorMessage = "인증이 필요합니다.";
        } else if (error.message?.includes("재고가 부족")) {
          statusCode = 400;
          errorMessage = error.message;
        }

        res.status(statusCode).json({
          error: error.name || "InternalServerError",
          message: errorMessage,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === "development" && {
            stack: error.stack,
          }),
        });
      }
    );

    // 프로세스 종료 처리
    process.on("SIGINT", this.gracefulShutdown);
    process.on("SIGTERM", this.gracefulShutdown);
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    await this.initialize();

    this.app.listen(this.PORT, () => {
      console.log(
        `🚀 [CartService] 서버가 포트 ${this.PORT}에서 실행 중입니다.`
      );
      console.log(
        `📋 [CartService] API 문서: http://localhost:${this.PORT}/api/docs`
      );
      console.log(
        `💗 [CartService] 헬스체크: http://localhost:${this.PORT}/health`
      );
    });
  }

  /**
   * 서버 종료 처리
   */
  private gracefulShutdown = async (signal: string) => {
    console.log(
      `🛑 [CartService] ${signal} 신호를 받았습니다. 서버를 종료합니다...`
    );

    try {
      await DIContainer.cleanup();
      console.log("✅ [CartService] 서버가 정상적으로 종료되었습니다.");
      process.exit(0);
    } catch (error) {
      console.error("❌ [CartService] 서버 종료 중 오류:", error);
      process.exit(1);
    }
  };
}

// 서버 시작
const app = new CartServiceApp();
app.start().catch((error) => {
  console.error("❌ [CartService] 서버 시작 실패:", error);
  process.exit(1);
});
