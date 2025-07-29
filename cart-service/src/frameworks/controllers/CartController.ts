// ========================================
// CartController - Framework Layer (수정됨 - 응답구조 통일)
// cart-service/src/frameworks/controllers/CartController.ts
// ========================================

import { Request, Response } from "express";
import { injectable, inject } from "inversify";

import { AddToCartUseCase } from "../../usecases/AddToCartUseCase";
import { RemoveFromCartUseCase } from "../../usecases/RemoveFromCartUseCase";
import { GetCartUseCase } from "../../usecases/GetCartUseCase";
import { UpdateCartItemUseCase } from "../../usecases/UpdateCartItemUseCase";
import { ClearCartUseCase } from "../../usecases/ClearCartUseCase";
import { DeleteCartUseCase } from "../../usecases/DeleteCartUseCase";
import { TransferCartUseCase } from "../../usecases/TransferCartUseCase";
import { CleanupSessionCartUseCase } from "../../usecases/CleanupSessionCartUseCase";

import {
  ProductNotFoundError,
  InsufficientStockError,
  InvalidRequestError,
  CartNotFoundError,
} from "../../usecases/types";

import { TYPES } from "../../infrastructure/di/types";

/**
 * CartController - 응답 구조 통일 및 에러 핸들링 개선
 *
 * 수정사항:
 * 1. 모든 응답을 {success, message, data, timestamp} 구조로 통일
 * 2. HTTP 상태 코드 테스트 기대값에 맞게 수정
 * 3. 상세한 에러 로깅 추가
 * 4. 타입 안전성 강화
 */
@injectable()
export class CartController {
  constructor(
    @inject(TYPES.AddToCartUseCase)
    private readonly addToCartUseCase: AddToCartUseCase,

    @inject(TYPES.RemoveFromCartUseCase)
    private readonly removeFromCartUseCase: RemoveFromCartUseCase,

    @inject(TYPES.GetCartUseCase)
    private readonly getCartUseCase: GetCartUseCase,

    @inject(TYPES.UpdateCartItemUseCase)
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,

    @inject(TYPES.ClearCartUseCase)
    private readonly clearCartUseCase: ClearCartUseCase,

    @inject(TYPES.DeleteCartUseCase)
    private readonly deleteCartUseCase: DeleteCartUseCase,

    @inject(TYPES.TransferCartUseCase)
    private readonly transferCartUseCase: TransferCartUseCase,

    @inject(TYPES.CleanupSessionCartUseCase)
    private readonly cleanupSessionCartUseCase: CleanupSessionCartUseCase
  ) {}

  /**
   * 장바구니에 상품 추가
   * POST /api/v1/cart/items
   */
  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user?.id;
      const sessionId = req.sessionId;


      // 🔧 수정: 더 상세한 유효성 검증
      if (!productId || !quantity) {
        this.sendErrorResponse(
          res,
          400,
          "상품 ID와 수량은 필수입니다",
          "INVALID_REQUEST"
        );
        return;
      }

      if (quantity <= 0 || !Number.isInteger(quantity)) {
        this.sendErrorResponse(
          res,
          400,
          "수량은 1 이상이어야 합니다",
          "VALIDATION_ERROR"
        );
        return;
      }

      if (!userId && !sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID 또는 세션 ID가 필요합니다",
          "AUTH_REQUIRED"
        );
        return;
      }

      const response = await this.addToCartUseCase.execute({
        userId,
        sessionId,
        productId,
        quantity,
      });

      // 🔧 수정: 통일된 응답 구조
      this.sendSuccessResponse(res, 201, "상품이 장바구니에 추가되었습니다", {
        cart: response.cart.toJSON(),
      });
    } catch (error) {
      this.handleError(error, res, "장바구니 상품 추가");
    }
  }

  /**
   * 장바구니에서 상품 제거
   * DELETE /api/v1/cart/items/:productId
   */
  async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.productId; // URL 파라미터에서 가져오기
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!productId) {
        this.sendErrorResponse(
          res,
          400,
          "상품 ID는 필수입니다",
          "INVALID_REQUEST"
        );
        return;
      }

      if (!userId && !sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID 또는 세션 ID가 필요합니다",
          "AUTH_REQUIRED"
        );
        return;
      }

      const response = await this.removeFromCartUseCase.execute({
        userId,
        sessionId,
        productId,
      });

      this.sendSuccessResponse(res, 200, response.message || "작업이 완료되었습니다", {
        cart: response.cart ? response.cart.toJSON() : null,
      });
    } catch (error) {
      this.handleError(error, res, "장바구니 상품 제거");
    }
  }

  /**
   * 장바구니 조회
   * GET /api/v1/cart
   */
  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!userId && !sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID 또는 세션 ID가 필요합니다",
          "AUTH_REQUIRED"
        );
        return;
      }

      const response = await this.getCartUseCase.execute({
        userId,
        sessionId,
      });

      const message = response.cart
        ? "장바구니를 조회했습니다"
        : "장바구니가 비어있습니다";

      // 클라이언트가 기대하는 형태로 변환
      let cartData = null;
      if (response.cart) {
        const cartJson = response.cart.toJSON();
        cartData = {
          id: cartJson.id,
          userId: cartJson.userId,
          sessionId: cartJson.sessionId,
          items: cartJson.items.map((item: any) => {
            // 상품 정보가 있으면 포함
            if (item.productInfo || (item as any).productInfo) {
              const productInfo = item.productInfo || (item as any).productInfo;
              return {
                product: {
                  id: productInfo.id,
                  name: productInfo.name,
                  price: productInfo.price,
                  brand: productInfo.brand || '',
                  sku: productInfo.sku || '',
                  slug: productInfo.slug || '',
                  category: {
                    id: productInfo.category || '',
                    name: productInfo.category || '',
                    slug: productInfo.category || '',
                  },
                  inventory: {
                    availableQuantity: productInfo.availableQuantity || 0,
                    status: productInfo.inventory?.status || 'in_stock',
                  },
                  imageUrls: productInfo.imageUrls || [productInfo.imageUrl || ''],
                },
                quantity: item.quantity,
                addedAt: item.addedAt,
              };
            } else {
              // 상품 정보가 없으면 기본 구조로
              return {
                product: {
                  id: item.productId,
                  name: `상품 ${item.productId}`,
                  price: item.price,
                  brand: '',
                  sku: '',
                  slug: '',
                  category: { id: '', name: '', slug: '' },
                  inventory: { availableQuantity: 0, status: 'unknown' },
                  imageUrls: [],
                },
                quantity: item.quantity,
                addedAt: item.addedAt,
              };
            }
          }),
          totalAmount: cartJson.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
          totalQuantity: cartJson.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
          uniqueItemCount: cartJson.uniqueItemCount || cartJson.items.length,
          createdAt: cartJson.createdAt,
          updatedAt: cartJson.updatedAt,
        };
      }

      this.sendSuccessResponse(res, 200, message, cartData);
    } catch (error) {
      this.handleError(error, res, "장바구니 조회");
    }
  }

  /**
   * 장바구니 아이템 수량 변경
   * PUT /api/v1/cart/items/:productId
   */
  async updateCartItem(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.productId; // URL 파라미터에서 가져오기
      const { quantity } = req.body; // body에서는 quantity만 가져오기
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!productId || !quantity) {
        this.sendErrorResponse(
          res,
          400,
          "상품 ID와 수량은 필수입니다",
          "INVALID_REQUEST"
        );
        return;
      }

      if (quantity <= 0 || !Number.isInteger(quantity)) {
        this.sendErrorResponse(
          res,
          400,
          "수량은 1 이상이어야 합니다",
          "VALIDATION_ERROR"
        );
        return;
      }

      if (!userId && !sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID 또는 세션 ID가 필요합니다",
          "AUTH_REQUIRED"
        );
        return;
      }

      const response = await this.updateCartItemUseCase.execute({
        userId,
        sessionId,
        productId,
        quantity,
      });

      this.sendSuccessResponse(
        res,
        200,
        response.message || "작업이 완료되었습니다",
        {
          cart: response.cart ? response.cart.toJSON() : null,
        }
      );
    } catch (error) {
      this.handleError(error, res, "장바구니 상품 수량 변경");
    }
  }

  /**
   * 장바구니 전체 비우기
   * DELETE /api/v1/cart
   */
  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!userId && !sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID 또는 세션 ID가 필요합니다",
          "AUTH_REQUIRED"
        );
        return;
      }

      const response = await this.clearCartUseCase.execute({
        userId,
        sessionId,
      });

      this.sendSuccessResponse(res, 200, response.message || "작업이 완료되었습니다", {
        cart: response.cart ? response.cart.toJSON() : null,
      });
    } catch (error) {
      this.handleError(error, res, "장바구니 비우기");
    }
  }

  /**
   * 장바구니 완전 삭제 (클라이언트 종료시 사용)
   * DELETE /api/v1/cart/delete
   */
  async deleteCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!userId && !sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID 또는 세션 ID가 필요합니다",
          "AUTH_REQUIRED"
        );
        return;
      }

      const response = await this.deleteCartUseCase.execute({
        userId,
        sessionId,
      });

      this.sendSuccessResponse(res, 200, response.message, {});
    } catch (error) {
      this.handleError(error, res, "장바구니 삭제");
    }
  }

  /**
   * 장바구니 이전 (세션 → 사용자)
   * POST /api/v1/cart/transfer
   */
  async transferCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!userId) {
        this.sendErrorResponse(
          res,
          400,
          "사용자 ID가 필요합니다",
          "USER_ID_REQUIRED"
        );
        return;
      }

      if (!sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "세션 ID가 필요합니다",
          "SESSION_ID_REQUIRED"
        );
        return;
      }

      const response = await this.transferCartUseCase.execute({
        userId,
        sessionId,
      });

      this.sendSuccessResponse(res, 200, "장바구니가 이전되었습니다", {
        cart: response.cart.toJSON(),
      });
    } catch (error) {
      this.handleError(error, res, "장바구니 이전");
    }
  }

  /**
   * 세션 장바구니 정리 (클라이언트 종료시 사용)
   * POST /api/v1/cart/cleanup-session
   */
  async cleanupSessionCart(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionId || req.body.sessionId;

      if (!sessionId) {
        this.sendErrorResponse(
          res,
          400,
          "세션 ID가 필요합니다",
          "SESSION_ID_REQUIRED"
        );
        return;
      }

      const response = await this.cleanupSessionCartUseCase.execute({
        sessionId,
      });

      this.sendSuccessResponse(res, 200, response.message, {
        deletedCartId: response.deletedCartId,
      });
    } catch (error) {
      this.handleError(error, res, "세션 장바구니 정리");
    }
  }

  // ========================================
  // 🔧 수정: 통일된 응답 헬퍼 메서드들
  // ========================================

  /**
   * 성공 응답 통일 메서드
   */
  private sendSuccessResponse(
    res: Response,
    statusCode: number,
    message: string,
    data?: any
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 에러 응답 통일 메서드
   */
  private sendErrorResponse(
    res: Response,
    statusCode: number,
    message: string,
    code: string,
    additionalData?: any
  ): void {
    res.status(statusCode).json({
      success: false,
      message, // 🔧 수정: message를 최상위로 이동
      error: message, // 🔧 추가: 기존 코드와의 호환성 유지
      code,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }

  /**
   * 통합 에러 처리
   * 🔧 수정: HTTP 상태 코드를 테스트 기대값에 맞게 조정
   */
  private handleError(error: unknown, res: Response, context: string): void {
    console.error(`❌ [CartController] ${context} 에러:`, error);

    if (error instanceof ProductNotFoundError) {
      this.sendErrorResponse(
        res,
        404,
        "상품을 찾을 수 없습니다",
        "PRODUCT_NOT_FOUND"
      );
      return;
    }

    if (error instanceof InsufficientStockError) {
      // 🔧 수정: 409 → 400으로 변경 (테스트 기대값에 맞춤)
      this.sendErrorResponse(
        res,
        400,
        "재고가 부족합니다",
        "INSUFFICIENT_STOCK",
        {
          availableQuantity: error.availableQuantity,
        }
      );
      return;
    }

    if (error instanceof CartNotFoundError) {
      this.sendErrorResponse(
        res,
        404,
        "장바구니를 찾을 수 없습니다",
        "CART_NOT_FOUND"
      );
      return;
    }

    if (error instanceof InvalidRequestError) {
      this.sendErrorResponse(res, 400, error.message, "INVALID_REQUEST");
      return;
    }

    // 🔧 추가: 더 상세한 에러 정보 로깅
    if (error instanceof Error) {
      console.error(`❌ [CartController] ${context} 상세 에러:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    // 예상하지 못한 에러 - 테스트 환경에서는 더 상세한 정보 제공
    const isTestEnvironment = process.env.NODE_ENV === "test";
    this.sendErrorResponse(
      res,
      500,
      "서버 내부 오류가 발생했습니다",
      "INTERNAL_SERVER_ERROR",
      isTestEnvironment ? {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: context
      } : undefined
    );
  }
}
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

// Express Request 확장 타입 정의
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}
