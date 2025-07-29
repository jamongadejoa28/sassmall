// ========================================
// Cart Routes - Framework Layer
// cart-service/src/frameworks/routes/cartRoutes.ts
// ========================================

import { Router } from "express";
import { CartController } from "../controllers/CartController";
import { authMiddleware } from "../middleware/authMiddleware";
import { sessionMiddleware } from "../middleware/sessionMiddleware";
import {
  validateRequest,
  CartValidationSchemas,
} from "../middleware/validateRequest";
import { rateLimitMiddleware } from "../middleware/rateLimitMiddleware";

/**
 * CartRoutes - 장바구니 API 라우트 설정
 *
 * 책임:
 * 1. HTTP 엔드포인트와 컨트롤러 메서드 연결
 * 2. 미들웨어 체인 설정 (인증, 세션, 검증, 제한)
 * 3. RESTful API 설계 원칙 준수
 * 4. 보안 및 성능 최적화
 *
 * 라우트 설계 원칙:
 * - /api/cart/* : 장바구니 관련 모든 엔드포인트
 * - JWT 인증 옵션: 로그인/비로그인 모두 지원
 * - 세션 관리: 비로그인 사용자를 위한 세션 ID 생성
 * - Rate Limiting: API 남용 방지
 */
export function createCartRoutes(cartController: CartController): Router {
  const router = Router();

  // ========================================
  // 공통 미들웨어 설정
  // ========================================

  // 모든 라우트에 세션 미들웨어 적용 (비로그인 사용자 지원)
  router.use(sessionMiddleware);

  // Rate Limiting (API 남용 방지)
  router.use(
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15분
      max: 100, // 15분당 최대 100회 요청
      message: {
        success: false,
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    })
  );

  // ========================================
  // 장바구니 CRUD 라우트
  // ========================================

  /**
   * 장바구니 조회
   * GET /api/cart
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 장바구니, 없으면 세션 장바구니)
   */
  router.get(
    "/",
    authMiddleware.optional, // JWT 인증 선택적 적용
    async (req, res) => {
      await cartController.getCart(req, res);
    }
  );

  /**
   * 장바구니에 상품 추가
   * POST /api/cart/items
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 장바구니, 없으면 세션 장바구니)
   *
   * Body: {
   *   productId: string,
   *   quantity: number
   * }
   */
  router.post(
    "/items",
    authMiddleware.optional, // JWT 인증 선택적 적용
    validateRequest.body(CartValidationSchemas.addToCart),
    async (req, res) => {
      await cartController.addToCart(req, res);
    }
  );

  /**
   * 장바구니 아이템 수량 변경
   * PUT /api/cart/items/:productId
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 장바구니, 없으면 세션 장바구니)
   *
   * Body: {
   *   quantity: number
   * }
   */
  router.put(
    "/items/:productId",
    authMiddleware.optional, // JWT 인증 선택적 적용
    validateRequest.params(CartValidationSchemas.productIdParam),
    validateRequest.body(CartValidationSchemas.updateQuantity),
    async (req, res) => {
      await cartController.updateCartItem(req, res);
    }
  );

  /**
   * 장바구니에서 상품 제거
   * DELETE /api/cart/items/:productId
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 장바구니, 없으면 세션 장바구니)
   */
  router.delete(
    "/items/:productId",
    authMiddleware.optional, // JWT 인증 선택적 적용
    validateRequest.params(CartValidationSchemas.productIdParam),
    async (req, res) => {
      await cartController.removeFromCart(req, res);
    }
  );

  /**
   * 장바구니 전체 비우기
   * DELETE /api/cart
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 장바구니, 없으면 세션 장바구니)
   */
  router.delete(
    "/",
    authMiddleware.optional, // JWT 인증 선택적 적용
    async (req, res) => {
      await cartController.clearCart(req, res);
    }
  );

  /**
   * 장바구니 완전 삭제 (클라이언트 종료시 사용)
   * DELETE /api/cart/delete
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 장바구니, 없으면 세션 장바구니)
   */
  router.delete(
    "/delete",
    authMiddleware.optional, // JWT 인증 선택적 적용
    async (req, res) => {
      await cartController.deleteCart(req, res);
    }
  );

  // ========================================
  // 사용자 관리 라우트
  // ========================================

  /**
   * 장바구니 이전 (로그인 시 세션 → 사용자)
   * POST /api/cart/transfer
   * 인증: 필수 (JWT 토큰 필요)
   *
   * 시나리오:
   * 1. 비로그인 상태에서 장바구니에 상품 담기
   * 2. 로그인 후 이 API 호출
   * 3. 세션 기반 장바구니를 사용자 장바구니로 이전/병합
   */
  router.post(
    "/transfer",
    authMiddleware.required, // JWT 인증 필수
    async (req, res) => {
      await cartController.transferCart(req, res);
    }
  );

  /**
   * 세션 장바구니 정리 (클라이언트 종료시 사용)
   * POST /api/cart/cleanup-session
   * 인증: 불필요 (세션 ID만 필요)
   *
   * 시나리오:
   * 1. 클라이언트 애플리케이션 종료시 호출
   * 2. 세션에 연결된 장바구니 완전 삭제 (CASCADE DELETE)
   * 3. 고아 데이터 정리
   */
  router.post(
    "/cleanup-session",
    async (req, res) => {
      await cartController.cleanupSessionCart(req, res);
    }
  );

  // ========================================
  // 헬스체크 라우트
  // ========================================

  /**
   * 장바구니 서비스 상태 확인
   * GET /api/cart/health
   * 인증: 불필요
   */
  router.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      service: "cart-service",
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    });
  });

  // ========================================
  // API 문서 라우트 (개발 환경)
  // ========================================

  /**
   * 장바구니 API 스키마 정보
   * GET /api/cart/schema
   * 인증: 불필요 (개발 환경에서만 활성화)
   */
  if (process.env.NODE_ENV === "development") {
    router.get("/schema", (req, res) => {
      res.status(200).json({
        service: "cart-service",
        endpoints: {
          "GET /api/cart": "장바구니 조회",
          "POST /api/cart/items": "상품 추가",
          "PUT /api/cart/items/:productId": "수량 변경",
          "DELETE /api/cart/items/:productId": "상품 제거",
          "DELETE /api/cart": "장바구니 비우기",
          "DELETE /api/cart/delete": "장바구니 완전 삭제",
          "POST /api/cart/transfer": "장바구니 이전",
          "POST /api/cart/cleanup-session": "세션 장바구니 정리",
          "GET /api/cart/health": "헬스체크",
        },
        authentication: {
          current: "JWT + 세션 하이브리드 지원",
          optional:
            "GET, POST, PUT, DELETE (items) - JWT 토큰 있으면 사용자별, 없으면 세션별",
          required: "POST /transfer - JWT 토큰 필수",
        },
        rateLimit: "15분당 100회",
      });
    });
  }

  return router;
}

// ========================================
// 라우트 설정 타입 정의
// ========================================

export interface RouteConfig {
  cartController: CartController;
  enableRateLimit?: boolean;
  enableCors?: boolean;
  enableSwagger?: boolean;
}

/**
 * 메인 애플리케이션에서 사용할 라우트 설정 헬퍼
 */
export function setupCartRoutes(config: RouteConfig): Router {
  const { cartController } = config;

  // 기본 라우트 생성
  const cartRoutes = createCartRoutes(cartController);

  // CORS 설정 (필요시)
  if (config.enableCors) {
    // CORS 미들웨어는 메인 app.ts에서 글로벌 설정하는 것이 일반적
    console.log("CORS는 메인 애플리케이션에서 설정됩니다.");
  }

  return cartRoutes;
}
