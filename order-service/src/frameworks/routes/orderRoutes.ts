// ========================================
// Order Routes - 주문 API 라우트
// order-service/src/frameworks/routes/orderRoutes.ts
// ========================================

import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validationMiddleware } from '../middleware/validationMiddleware';

export function createOrderRoutes(orderController: OrderController): Router {
  const router = Router();

  // 모든 주문 관련 API에 인증 필요
  router.use(authMiddleware);

  // ========================================
  // 고객용 API
  // ========================================

  // 주문 데이터 검증 (주문 생성 전 유효성 확인)
  router.post('/validate', 
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 60 }), // 1분당 60회
    validationMiddleware('createOrder'),
    async (req, res) => await orderController.validateOrder(req, res)
  );

  // 주문 생성
  router.post('/', 
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }), // 15분당 10회
    validationMiddleware('createOrder'),
    async (req, res) => await orderController.createOrder(req, res)
  );

  // 내 주문 목록 조회
  router.get('/my-orders',
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 60 }), // 1분당 60회
    async (req, res) => await orderController.getUserOrders(req, res)
  );

  // 주문 상세 조회
  router.get('/:orderId',
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 1분당 100회
    async (req, res) => await orderController.getOrder(req, res)
  );

  // 주문 요약 정보 조회
  router.get('/:orderId/summary',
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 1분당 100회
    async (req, res) => await orderController.getOrderSummary(req, res)
  );

  // 주문 취소 (고객)
  router.post('/:orderId/cancel',
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }), // 15분당 5회
    validationMiddleware('cancelOrder'),
    async (req, res) => await orderController.cancelOrder(req, res)
  );

  // ========================================
  // 결제 관련 API
  // ========================================

  // 결제 요청
  router.post('/:orderId/payment/request',
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }), // 15분당 10회
    validationMiddleware('paymentRequest'),
    async (req, res) => await orderController.requestPayment(req, res)
  );

  // 결제 승인 (TossPayments 콜백)
  router.post('/payment/approve',
    rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 20 }), // 5분당 20회
    async (req, res) => await orderController.approvePayment(req, res)
  );

  // 결제 실패 (카카오페이 콜백)
  router.get('/payment/fail',
    rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 20 }), // 5분당 20회
    async (req, res) => await orderController.failPayment(req, res)
  );

  // 결제 취소 (카카오페이 콜백)
  router.get('/payment/cancel',
    rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 20 }), // 5분당 20회
    async (req, res) => await orderController.failPayment(req, res)
  );

  // ========================================
  // 관리자용 API
  // ========================================

  // 주문 목록 조회 (관리자 전용)
  router.get('/',
    adminMiddleware,
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 1분당 100회
    async (req, res) => await orderController.getOrdersAdmin(req, res)
  );

  // 주문 통계 조회 (관리자 전용)
  router.get('/stats',
    adminMiddleware,
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 60 }), // 1분당 60회
    async (req, res) => await orderController.getOrderStats(req, res)
  );

  // 주문 상태 업데이트 (관리자)
  router.patch('/:orderId/status',
    adminMiddleware,
    rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 1분당 100회
    validationMiddleware('updateOrderStatus'),
    async (req, res) => await orderController.updateOrderStatus(req, res)
  );

  // 주문 취소 (관리자)
  router.post('/:orderId/admin-cancel',
    adminMiddleware,
    rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 50 }), // 15분당 50회
    validationMiddleware('adminCancelOrder'),
    async (req, res) => await orderController.cancelOrder(req, res)
  );

  return router;
}

// 주문 관련 상수
export const ORDER_API_PATHS = {
  CREATE_ORDER: '/',
  GET_MY_ORDERS: '/my-orders',
  GET_ORDER: '/:orderId',
  GET_ORDER_SUMMARY: '/:orderId/summary',
  CANCEL_ORDER: '/:orderId/cancel',
  PAYMENT_REQUEST: '/:orderId/payment/request',
  PAYMENT_APPROVE: '/payment/approve',
  PAYMENT_FAIL: '/payment/fail',
  PAYMENT_CANCEL: '/payment/cancel',
  UPDATE_ORDER_STATUS: '/:orderId/status',
  ADMIN_CANCEL_ORDER: '/:orderId/admin-cancel',
} as const;

// API 응답 형식
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
    totalCount?: number;
  };
}

// 에러 코드 정의
export const ORDER_ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  STOCK_INSUFFICIENT: 'STOCK_INSUFFICIENT',
  ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
  REFUND_FAILED: 'REFUND_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;