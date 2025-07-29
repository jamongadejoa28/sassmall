// ========================================
// Cart Routes Implementation
// ========================================

import { Router } from "express";
import { CartController } from "../controllers/CartController";

export function createCartRoutes(cartController: CartController): Router {
  const router = Router();

  // 헬스체크 엔드포인트
  router.get("/health", (req, res) => {
    res.json({
      success: true,
      message: "Cart service is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // 장바구니 조회
  router.get("/", async (req, res, next) => {
    try {
      await cartController.getCart(req, res);
    } catch (error) {
      next(error);
    }
  });

  // 장바구니에 상품 추가
  router.post("/items", async (req, res, next) => {
    try {
      await cartController.addToCart(req, res);
    } catch (error) {
      next(error);
    }
  });

  // 장바구니 상품 수량 변경
  router.put("/items/:productId", async (req, res, next) => {
    try {
      await cartController.updateCartItem(req, res);
    } catch (error) {
      next(error);
    }
  });

  // 장바구니에서 상품 제거
  router.delete("/items/:productId", async (req, res, next) => {
    try {
      await cartController.removeFromCart(req, res);
    } catch (error) {
      next(error);
    }
  });

  // 장바구니 비우기
  router.delete("/", async (req, res, next) => {
    try {
      await cartController.clearCart(req, res);
    } catch (error) {
      next(error);
    }
  });

  // 장바구니 이전 (로그인 시 세션 → 사용자)
  router.post("/transfer", async (req, res, next) => {
    try {
      await cartController.transferCart(req, res);
    } catch (error) {
      next(error);
    }
  });

  return router;
}