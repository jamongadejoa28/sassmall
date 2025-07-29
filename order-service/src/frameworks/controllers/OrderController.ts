// ========================================
// Order Controller - 주문 컨트롤러
// order-service/src/frameworks/controllers/OrderController.ts
// ========================================

import { Request, Response } from 'express';
import { CreateOrderUseCase, CreateOrderRequest } from '../../usecases/CreateOrderUseCase';
import { GetOrderUseCase } from '../../usecases/GetOrderUseCase';
import { UpdateOrderStatusUseCase } from '../../usecases/UpdateOrderStatusUseCase';
import { CancelOrderUseCase } from '../../usecases/CancelOrderUseCase';
import { GetOrdersAdminUseCase, GetOrdersAdminRequest } from '../../usecases/GetOrdersAdminUseCase';
import { GetOrderStatsUseCase, GetOrderStatsRequest } from '../../usecases/GetOrderStatsUseCase';
import { PaymentService } from '../../adapters/PaymentService';
import { OrderStatus } from '../../entities/OrderStatus';

// Request/Response DTOs
interface CreateOrderRequestDto {
  cartItems: Array<{
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    productImageUrl?: string;
    productOptions?: Record<string, any>;
  }>;
  shippingAddress: {
    postalCode: string;
    address: string;
    detailAddress?: string;
    recipientName: string;
    recipientPhone: string;
  };
  paymentMethod: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';
  memo?: string;
}

interface UpdateOrderStatusDto {
  newStatus: OrderStatus;
  reason?: string;
}

interface CancelOrderDto {
  reason: string;
  refundAmount?: number;
}

interface PaymentRequestDto {
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

export class OrderController {
  constructor(
    private createOrderUseCase: CreateOrderUseCase,
    private getOrderUseCase: GetOrderUseCase,
    private updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private cancelOrderUseCase: CancelOrderUseCase,
    private getOrdersAdminUseCase: GetOrdersAdminUseCase,
    private getOrderStatsUseCase: GetOrderStatsUseCase,
    private paymentService: PaymentService
  ) {}

  // 주문 생성
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // 인증 미들웨어에서 설정
      console.log('🔍 [OrderController] 주문 생성 요청 시작');
      console.log('🔍 [OrderController] 사용자 ID:', userId);
      console.log('🔍 [OrderController] 요청 바디:', JSON.stringify(req.body, null, 2));
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
        });
        return;
      }

      const dto: CreateOrderRequestDto = req.body;
      console.log('🔍 [OrderController] 결제 방법:', dto.paymentMethod);

      // 입력 유효성 검증
      const validationError = this.validateCreateOrderRequest(dto);
      console.log('🔍 [OrderController] 검증 결과:', validationError || '성공');
      
      if (validationError) {
        res.status(400).json({
          success: false,
          message: validationError,
        });
        return;
      }

      const request: CreateOrderRequest = {
        userId,
        cartItems: dto.cartItems,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        memo: dto.memo,
      };

      const result = await this.createOrderUseCase.execute(request);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: '주문이 성공적으로 생성되었습니다',
          data: {
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            totalAmount: result.totalAmount,
            order: result.order?.toJSON(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('주문 생성 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 생성 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 주문 데이터 검증 (저장하지 않음)
  async validateOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // 인증 미들웨어에서 설정
      console.log('🔍 [OrderController] 주문 데이터 검증 요청 시작');
      console.log('🔍 [OrderController] 사용자 ID:', userId);
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
        });
        return;
      }

      const dto: CreateOrderRequestDto = req.body;

      // 입력 유효성 검증
      const validationError = this.validateCreateOrderRequest(dto);
      
      if (validationError) {
        res.status(400).json({
          success: false,
          message: validationError,
        });
        return;
      }

      const request: CreateOrderRequest = {
        userId,
        cartItems: dto.cartItems,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        memo: dto.memo,
      };

      const result = await this.createOrderUseCase.validateOrderData(request);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '주문 데이터가 유효합니다',
          data: {
            totalAmount: result.totalAmount,
            isValid: true,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('주문 데이터 검증 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 데이터 검증 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 주문 조회
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId;
      const userId = req.user?.id;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: '주문 ID가 필요합니다',
        });
        return;
      }

      const result = await this.getOrderUseCase.getOrder({
        orderId,
        userId,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            order: result.order?.toJSON(),
          },
        });
      } else {
        const statusCode = result.errorMessage?.includes('접근 권한') ? 403 : 
                          result.errorMessage?.includes('찾을 수 없습니다') ? 404 : 400;
        
        res.status(statusCode).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('주문 조회 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 조회 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 사용자 주문 목록 조회
  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.getOrderUseCase.getOrdersByUser({
        userId,
        limit,
        offset,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            orders: result.orders?.map(order => order.toJSON()),
            totalCount: result.totalCount,
            pagination: {
              limit,
              offset,
              hasMore: (result.totalCount || 0) > offset + limit,
            },
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('사용자 주문 목록 조회 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 목록 조회 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 주문 상태 업데이트 (관리자용)
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId;
      const adminUserId = req.user?.id;
      const dto: UpdateOrderStatusDto = req.body;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: '주문 ID가 필요합니다',
        });
        return;
      }

      if (!dto.newStatus) {
        res.status(400).json({
          success: false,
          message: '새로운 상태가 필요합니다',
        });
        return;
      }

      const result = await this.updateOrderStatusUseCase.updateStatus({
        orderId,
        newStatus: dto.newStatus,
        adminUserId,
        reason: dto.reason,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '주문 상태가 성공적으로 업데이트되었습니다',
          data: {
            order: result.order?.toJSON(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('주문 상태 업데이트 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 상태 업데이트 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 주문 취소
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const dto: CancelOrderDto = req.body;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: '주문 ID가 필요합니다',
        });
        return;
      }

      if (!dto.reason) {
        res.status(400).json({
          success: false,
          message: '취소 사유가 필요합니다',
        });
        return;
      }

      const result = await this.cancelOrderUseCase.cancelOrder({
        orderId,
        userId: isAdmin ? undefined : userId,
        adminUserId: isAdmin ? userId : undefined,
        reason: dto.reason,
        refundAmount: dto.refundAmount,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '주문이 성공적으로 취소되었습니다',
          data: {
            order: result.order?.toJSON(),
            refundInfo: result.refundInfo,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('주문 취소 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 취소 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 결제 요청
  async requestPayment(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId;
      const userId = req.user?.id;
      const dto: PaymentRequestDto = req.body;

      if (!orderId || !userId) {
        res.status(400).json({
          success: false,
          message: '주문 ID와 사용자 인증이 필요합니다',
        });
        return;
      }

      // 주문 조회 및 권한 확인
      const orderResult = await this.getOrderUseCase.getOrder({ orderId, userId });
      if (!orderResult.success || !orderResult.order) {
        res.status(404).json({
          success: false,
          message: '주문을 찾을 수 없습니다',
        });
        return;
      }

      const order = orderResult.order;

      // 결제 가능 상태 확인
      if (order.status !== OrderStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: '결제 대기 상태의 주문만 결제할 수 있습니다',
        });
        return;
      }

      // 결제 요청
      const paymentResult = await this.paymentService.processPayment({
        orderId: order.id!,
        orderNumber: order.orderNumber!,
        userId,
        amount: order.totalAmount,
        productName: order.items.length === 1 
          ? order.items[0]?.productName || '상품'
          : `${order.items[0]?.productName || '상품'} 외 ${order.items.length - 1}건`,
        paymentMethod: order.paymentMethod,
        successUrl: dto.successUrl,
        failUrl: dto.failUrl,
        cancelUrl: dto.cancelUrl,
      });

      if (paymentResult.success) {
        res.status(200).json({
          success: true,
          message: '결제 요청이 성공했습니다',
          data: {
            paymentId: paymentResult.paymentId,
            redirectUrl: paymentResult.redirectUrl,
            orderInfo: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              totalAmount: order.totalAmount,
            },
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: paymentResult.errorMessage,
        });
      }
    } catch (error) {
      console.error('결제 요청 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '결제 요청 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 결제 승인 (TossPayments 콜백)
  async approvePayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentKey, orderId, amount } = req.body;
      const userId = req.user?.id;

      console.log('🔍 [OrderController] 결제 승인 요청:', { paymentKey, orderId, amount, userId });

      if (!paymentKey || !orderId || !userId) {
        res.status(400).json({
          success: false,
          message: '결제 승인에 필요한 정보가 누락되었습니다',
        });
        return;
      }

      if (!amount || typeof amount !== 'number') {
        res.status(400).json({
          success: false,
          message: '결제 금액이 누락되었거나 올바르지 않습니다',
        });
        return;
      }

      const result = await this.paymentService.approvePayment({
        paymentKey,
        orderId,
        amount,
        userId,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '결제가 성공적으로 완료되었습니다',
          data: {
            paymentKey: result.paymentKey,
            orderId: result.orderId,
            paymentInfo: result.systemData,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('결제 승인 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '결제 승인 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 결제 실패 처리
  async failPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId, errorCode, errorMessage } = req.query;

      console.log('결제 실패:', { paymentId, errorCode, errorMessage });

      res.status(400).json({
        success: false,
        message: '결제가 실패했습니다',
        data: {
          paymentId,
          errorCode,
          errorMessage,
        },
      });
    } catch (error) {
      console.error('결제 실패 처리 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '결제 실패 처리 중 서버 오류가 발생했습니다',
      });
    }
  }

  // 주문 요약 정보 조회
  async getOrderSummary(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId;
      const userId = req.user?.id;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: '주문 ID가 필요합니다',
        });
        return;
      }

      const result = await this.getOrderUseCase.getOrderSummary(orderId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.summary,
        });
      } else {
        const statusCode = result.errorMessage?.includes('접근 권한') ? 403 : 
                          result.errorMessage?.includes('찾을 수 없습니다') ? 404 : 400;
        
        res.status(statusCode).json({
          success: false,
          message: result.errorMessage,
        });
      }
    } catch (error) {
      console.error('주문 요약 조회 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 요약 조회 중 서버 오류가 발생했습니다',
      });
    }
  }

  // ========================================
  // Admin 전용 API
  // ========================================

  // 관리자 주문 목록 조회
  async getOrdersAdmin(req: Request, res: Response): Promise<void> {
    try {
      const getOrdersAdminRequest: GetOrdersAdminRequest = {
        search: req.query.search as string,
        status: req.query.status as OrderStatus,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as 'orderedAt' | 'totalAmount' | 'status' | 'orderNumber',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await this.getOrdersAdminUseCase.execute(getOrdersAdminRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '관리자 주문 목록 조회가 성공적으로 완료되었습니다',
          data: {
            orders: result.orders?.map(order => order.toJSON()),
            pagination: result.pagination
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage || '주문 목록 조회에 실패했습니다'
        });
      }
    } catch (error) {
      console.error('관리자 주문 목록 조회 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 목록 조회 중 서버 오류가 발생했습니다'
      });
    }
  }

  // 주문 통계 조회 (관리자용)
  async getOrderStats(req: Request, res: Response): Promise<void> {
    try {
      const getOrderStatsRequest: GetOrderStatsRequest = {};

      const result = await this.getOrderStatsUseCase.execute(getOrderStatsRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '주문 통계 조회가 성공적으로 완료되었습니다',
          data: result.stats
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage || '주문 통계 조회에 실패했습니다'
        });
      }
    } catch (error) {
      console.error('주문 통계 조회 API 오류:', error);
      res.status(500).json({
        success: false,
        message: '주문 통계 조회 중 서버 오류가 발생했습니다'
      });
    }
  }

  // 입력 유효성 검증
  private validateCreateOrderRequest(dto: CreateOrderRequestDto): string | null {
    if (!dto.cartItems || dto.cartItems.length === 0) {
      return '주문할 상품이 없습니다';
    }

    if (dto.cartItems.length > 100) {
      return '한 번에 주문할 수 있는 상품은 최대 100개입니다';
    }

    // 배송 주소 검증
    if (!dto.shippingAddress.postalCode || !/^\d{5}$/.test(dto.shippingAddress.postalCode)) {
      return '올바른 우편번호를 입력해주세요 (5자리 숫자)';
    }

    if (!dto.shippingAddress.address?.trim()) {
      return '주소는 필수 항목입니다';
    }

    if (!dto.shippingAddress.recipientName?.trim()) {
      return '수령인 이름은 필수 항목입니다';
    }

    if (!dto.shippingAddress.recipientPhone || 
        !/^010\d{8}$/.test(dto.shippingAddress.recipientPhone.replace(/[-\s]/g, ''))) {
      return '올바른 휴대폰 번호를 입력해주세요';
    }

    // 결제 방법 검증
    const validPaymentMethods = ['KAKAOPAY', 'CARD', 'BANK_TRANSFER', 'TOSSPAYMENTS'];
    if (!validPaymentMethods.includes(dto.paymentMethod)) {
      return '유효하지 않은 결제 방법입니다';
    }

    // 장바구니 아이템 검증
    for (const item of dto.cartItems) {
      if (!item.productId?.trim()) {
        return '상품 ID가 누락되었습니다';
      }

      if (!item.productName?.trim()) {
        return '상품명이 누락되었습니다';
      }

      if (item.productPrice <= 0) {
        return '상품 가격이 올바르지 않습니다';
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 999) {
        return '주문 수량은 1~999개 사이여야 합니다';
      }
    }

    return null;
  }

}