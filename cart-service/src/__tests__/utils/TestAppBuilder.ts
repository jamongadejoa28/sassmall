// ========================================
// TestAppBuilder - 테스트용 Express 앱 빌더 (수정됨)
// cart-service/src/__tests__/utils/TestAppBuilder.ts
// ========================================

import express, { Express, Request, Response } from "express";
import { Container } from "inversify";
import { CartController } from "../../frameworks/controllers/CartController";
import { TYPES } from "../../infrastructure/di/types";

/**
 * TestAppBuilder - 테스트용 Express 애플리케이션 빌더
 *
 * 수정사항:
 * 1. API 경로를 /api/v1/cart/*로 통일
 * 2. 테스트용 인증/세션 미들웨어 추가
 * 3. 헤더 기반 인증 방식 구현
 * 4. 응답 구조 통일
 */
export class TestAppBuilder {
  private app: Express;

  constructor(private container: Container) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 기본 미들웨어 설정
   */
  private setupMiddleware(): void {
    // JSON 파싱
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 🔧 추가: 보안 헤더 설정 (Helmet 대신 수동 설정)
    this.app.use((req, res, next) => {
      // 기본 보안 헤더들
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      
      // CSP 설정 (테스트 환경용)
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      );

      next();
    });

    // 테스트용 인증 미들웨어 (JWT 토큰 파싱)
    this.app.use(this.createMockAuthMiddleware());

    // 테스트용 세션 미들웨어 (Session-ID 헤더 파싱)
    this.app.use(this.createMockSessionMiddleware());

    // CORS (테스트용)
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Session-ID"
      );
      
      // OPTIONS 요청 처리
      if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
      }
      
      next();
    });

    console.log("✅ [TestAppBuilder] 보안 미들웨어 설정 완료");
  }

  /**
   * 테스트용 Mock 인증 미들웨어
   * Authorization: Bearer <userId> 형태로 간단하게 처리
   */
  private createMockAuthMiddleware() {
    return (req: any, res: Response, next: Function) => {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        // 테스트 환경에서는 Bearer 뒤의 값을 직접 userId로 사용
        const userId = authHeader.substring(7); // 'Bearer ' 제거
        req.user = { id: userId };
      }

      next();
    };
  }

  /**
   * 테스트용 Mock 세션 미들웨어
   * X-Session-ID 헤더에서 sessionId 추출
   */
  private createMockSessionMiddleware() {
    return (req: any, res: Response, next: Function) => {
      const sessionId = req.headers["x-session-id"];

      if (sessionId) {
        req.sessionId = sessionId;
      }

      next();
    };
  }

  /**
   * 라우트 설정
   */
  private setupRoutes(): void {
    // Health Check 엔드포인트
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Cart Service Test Environment",
        data: {
          status: "healthy",
          version: "1.0.0-test",
          environment: "test",
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Service Info 엔드포인트
    this.app.get("/api/v1/info", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Cart Service API Info",
        data: {
          service: "cart-service",
          version: "1.0.0-test",
          description:
            "Clean Architecture 기반 장바구니 관리 마이크로서비스 (테스트 환경)",
          endpoints: {
            carts: "/api/v1/cart",
            health: "/health",
          },
          features: [
            "장바구니 생성/조회",
            "상품 추가/수정/삭제",
            "사용자/세션 기반 관리",
            "캐시 최적화",
            "동시성 처리",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Cart Controller 라우트 설정 - 실제 cartRoutes 사용
    try {
      const cartController = this.container.get<CartController>(
        TYPES.CartController
      );

      // 실제 cartRoutes import 및 사용
      try {
        const { createCartRoutes } = require("../../frameworks/routes/cartRoutes");
        const cartRouter = createCartRoutes(cartController);
        
        // /api/v1/cart 경로에 실제 라우터 마운트
        this.app.use("/api/v1/cart", cartRouter);

        console.log("✅ [TestAppBuilder] CartController 라우트 바인딩 성공");
      } catch (routeError) {
        console.error("❌ [TestAppBuilder] cartRoutes 로드 실패:", routeError);
        throw routeError;
      }
    } catch (error) {
      console.error("❌ [TestAppBuilder] CartController 바인딩 실패:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : String(error));

      // fallback 라우트들 (Controller가 없을 경우)
      this.app.post("/api/v1/cart/items", (req, res) => {
        res.status(500).json({
          success: false,
          message: "CartController not available in test environment",
          error: "CONTROLLER_NOT_FOUND",
          details: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      });

      this.app.get("/api/v1/cart", (req, res) => {
        res.status(500).json({
          success: false,
          message: "CartController not available in test environment",
          error: "CONTROLLER_NOT_FOUND",
          details: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      });

      // 다른 엔드포인트들도 동일하게 fallback 설정
      // PUT /api/v1/cart/items/:productId - 상품 수량 변경
      this.app.put("/api/v1/cart/items/:productId", this.createFallbackHandler(error));
      
      // DELETE /api/v1/cart/items/:productId - 상품 제거
      this.app.delete("/api/v1/cart/items/:productId", this.createFallbackHandler(error));
      
      // DELETE /api/v1/cart - 장바구니 비우기
      this.app.delete("/api/v1/cart", this.createFallbackHandler(error));
      
      // POST /api/v1/cart/transfer - 장바구니 이전
      this.app.post("/api/v1/cart/transfer", this.createFallbackHandler(error));
    }
  }

  /**
   * Fallback 핸들러 생성
   */
  private createFallbackHandler(error?: any) {
    return (req: Request, res: Response) => {
      res.status(500).json({
        success: false,
        message: "CartController not available in test environment",
        error: "CONTROLLER_NOT_FOUND",
        details: error?.message || "Unknown error",
        timestamp: new Date().toISOString(),
      });
    };
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    // 404 핸들러
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        error: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
    });

    // 전역 에러 핸들러
    this.app.use((error: any, req: any, res: any, next: any) => {
      console.error("❌ [TestApp] Unhandled Error:", error);

      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
        error: error.code || "INTERNAL_SERVER_ERROR",
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === "test" && { stack: error.stack }),
      });
    });
  }

  /**
   * Express 앱 반환
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * 테스트용 Express 앱 생성 헬퍼 함수
 */
export async function createTestApp(container: Container): Promise<Express> {
  const builder = new TestAppBuilder(container);
  return builder.getApp();
}
