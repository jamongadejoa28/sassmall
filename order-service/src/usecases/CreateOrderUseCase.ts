// ========================================
// Create Order UseCase - 주문 생성 유스케이스
// order-service/src/usecases/CreateOrderUseCase.ts
// ========================================

import { Order, CreateOrderData } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';

export interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  productImageUrl?: string;
  productOptions?: Record<string, any>;
}

export interface CreateOrderRequest {
  userId: string;
  cartItems: CartItem[];
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

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  order?: Order;
  errorMessage?: string;
}

// 외부 서비스 인터페이스
export interface ProductService {
  getProduct(productId: string): Promise<{
    id: string;
    name: string;
    price: number;
    stock: number;
    isActive: boolean;
    imageUrl?: string;
  } | null>;
  
  checkStock(productId: string, quantity: number): Promise<boolean>;
  reserveStock(productId: string, quantity: number): Promise<boolean>;
  releaseStock(productId: string, quantity: number): Promise<boolean>;
}

export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
}

export interface UserService {
  getUser(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    isActive: boolean;
  } | null>;
}

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private productService: ProductService,
    private userService: UserService
  ) {}

  async execute(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      // 1. 입력 유효성 검증
      const validationResult = await this.validateRequest(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          errorMessage: validationResult.errorMessage,
        };
      }

      // 2. 사용자 유효성 확인
      const user = await this.userService.getUser(request.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          errorMessage: '유효하지 않은 사용자입니다',
        };
      }

      // 3. 상품 정보 검증 및 재고 확인
      const productValidation = await this.validateProducts(request.cartItems);
      if (!productValidation.isValid) {
        return {
          success: false,
          errorMessage: productValidation.errorMessage,
        };
      }

      // 4. 재고 예약 시도
      const stockReservation = await this.reserveStock(request.cartItems);
      if (!stockReservation.success) {
        return {
          success: false,
          errorMessage: stockReservation.errorMessage,
        };
      }

      try {
        // 5. 주문 생성
        const orderData: CreateOrderData = {
          userId: request.userId,
          items: request.cartItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            quantity: item.quantity,
            productImageUrl: item.productImageUrl,
            productOptions: item.productOptions,
          })),
          shippingAddress: request.shippingAddress,
          paymentMethod: request.paymentMethod,
          memo: request.memo,
        };

        const order = new Order(orderData);
        
        // 6. 주문번호 생성
        order.generateOrderNumber();

        // 7. 주문 저장
        const savedOrder = await this.orderRepository.save(order);

        return {
          success: true,
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          totalAmount: savedOrder.totalAmount,
          order: savedOrder,
        };

      } catch (orderError) {
        // 주문 생성 실패 시 예약된 재고 해제
        await this.releaseReservedStock(request.cartItems);
        throw orderError;
      }

    } catch (error) {
      console.error('주문 생성 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다',
      };
    }
  }

  // 입력 유효성 검증
  private async validateRequest(request: CreateOrderRequest): Promise<{
    isValid: boolean;
    errorMessage?: string;
  }> {
    // 사용자 ID 검증
    if (!request.userId || request.userId.trim().length === 0) {
      return { isValid: false, errorMessage: '사용자 ID는 필수 항목입니다' };
    }

    // 장바구니 아이템 검증
    if (!request.cartItems || request.cartItems.length === 0) {
      return { isValid: false, errorMessage: '주문할 상품이 없습니다' };
    }

    if (request.cartItems.length > 100) {
      return { isValid: false, errorMessage: '한 번에 주문할 수 있는 상품은 100개까지입니다' };
    }

    // 배송 주소 검증
    if (!request.shippingAddress.postalCode || !/^\d{5}$/.test(request.shippingAddress.postalCode)) {
      return { isValid: false, errorMessage: '올바른 우편번호를 입력해주세요 (5자리 숫자)' };
    }

    if (!request.shippingAddress.address || request.shippingAddress.address.trim().length === 0) {
      return { isValid: false, errorMessage: '주소는 필수 항목입니다' };
    }

    if (!request.shippingAddress.recipientName || request.shippingAddress.recipientName.trim().length === 0) {
      return { isValid: false, errorMessage: '수령인 이름은 필수 항목입니다' };
    }

    if (!request.shippingAddress.recipientPhone || !/^010\d{8}$/.test(request.shippingAddress.recipientPhone.replace(/[-\s]/g, ''))) {
      return { isValid: false, errorMessage: '올바른 휴대폰 번호를 입력해주세요' };
    }

    // 결제 방법 검증
    const validPaymentMethods = ['KAKAOPAY', 'CARD', 'BANK_TRANSFER', 'TOSSPAYMENTS'];
    if (!validPaymentMethods.includes(request.paymentMethod)) {
      return { isValid: false, errorMessage: '유효하지 않은 결제 방법입니다' };
    }

    // 장바구니 아이템 개별 검증
    for (const item of request.cartItems) {
      if (!item.productId || item.productId.trim().length === 0) {
        return { isValid: false, errorMessage: '상품 ID가 누락되었습니다' };
      }

      if (!item.productName || item.productName.trim().length === 0) {
        return { isValid: false, errorMessage: '상품명이 누락되었습니다' };
      }

      if (item.productPrice <= 0) {
        return { isValid: false, errorMessage: '상품 가격이 올바르지 않습니다' };
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 999) {
        return { isValid: false, errorMessage: '주문 수량은 1~999개 사이여야 합니다' };
      }
    }

    return { isValid: true };
  }

  // 상품 정보 및 가격 검증
  private async validateProducts(cartItems: CartItem[]): Promise<{
    isValid: boolean;
    errorMessage?: string;
  }> {
    for (const cartItem of cartItems) {
      try {
        const product = await this.productService.getProduct(cartItem.productId);
        
        if (!product) {
          return {
            isValid: false,
            errorMessage: `상품을 찾을 수 없습니다: ${cartItem.productName}`,
          };
        }

        if (!product.isActive) {
          return {
            isValid: false,
            errorMessage: `판매 중단된 상품입니다: ${product.name}`,
          };
        }

        // 가격 일치 확인 (가격 변동 감지)
        if (Math.abs(product.price - cartItem.productPrice) > 0.01) {
          return {
            isValid: false,
            errorMessage: `상품 가격이 변경되었습니다: ${product.name}. 장바구니를 다시 확인해주세요.`,
          };
        }

        // 재고 확인
        const hasStock = await this.productService.checkStock(cartItem.productId, cartItem.quantity);
        if (!hasStock) {
          return {
            isValid: false,
            errorMessage: `재고가 부족합니다: ${product.name} (요청: ${cartItem.quantity}개)`,
          };
        }

      } catch (error) {
        console.error(`상품 정보 조회 실패: ${cartItem.productId}`, error);
        return {
          isValid: false,
          errorMessage: `상품 정보를 확인할 수 없습니다: ${cartItem.productName}`,
        };
      }
    }

    return { isValid: true };
  }

  // 재고 예약
  private async reserveStock(cartItems: CartItem[]): Promise<{
    success: boolean;
    errorMessage?: string;
  }> {
    const reservedItems: CartItem[] = [];

    try {
      for (const item of cartItems) {
        const reserved = await this.productService.reserveStock(item.productId, item.quantity);
        
        if (!reserved) {
          // 이미 예약된 재고 해제
          await this.releaseReservedStock(reservedItems);
          
          return {
            success: false,
            errorMessage: `재고 예약에 실패했습니다: ${item.productName}`,
          };
        }

        reservedItems.push(item);
      }

      return { success: true };

    } catch (error) {
      // 오류 발생 시 이미 예약된 재고 해제
      await this.releaseReservedStock(reservedItems);
      
      console.error('재고 예약 중 오류:', error);
      return {
        success: false,
        errorMessage: '재고 예약 중 오류가 발생했습니다',
      };
    }
  }

  // 예약된 재고 해제
  private async releaseReservedStock(cartItems: CartItem[]): Promise<void> {
    for (const item of cartItems) {
      try {
        await this.productService.releaseStock(item.productId, item.quantity);
      } catch (error) {
        console.error(`재고 해제 실패: ${item.productId}`, error);
        // 재고 해제 실패는 로그만 남기고 계속 진행
      }
    }
  }

  // 주문 데이터 검증만 수행 (저장하지 않음)
  async validateOrderData(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      // 1. 입력 유효성 검증
      const validationResult = await this.validateRequest(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          errorMessage: validationResult.errorMessage,
        };
      }

      // 2. 사용자 유효성 확인
      const user = await this.userService.getUser(request.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          errorMessage: '유효하지 않은 사용자입니다',
        };
      }

      // 3. 상품 정보 검증 및 재고 확인
      const productValidation = await this.validateProducts(request.cartItems);
      if (!productValidation.isValid) {
        return {
          success: false,
          errorMessage: productValidation.errorMessage,
        };
      }

      // 4. 주문 데이터 생성 (저장하지 않음)
      const orderData: CreateOrderData = {
        userId: request.userId,
        items: request.cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productPrice: item.productPrice,
          quantity: item.quantity,
          productImageUrl: item.productImageUrl,
          productOptions: item.productOptions,
        })),
        shippingAddress: request.shippingAddress,
        paymentMethod: request.paymentMethod,
        memo: request.memo,
      };

      const order = new Order(orderData);
      order.generateOrderNumber();

      // 총 금액 계산
      const totalAmount = order.totalAmount;

      return {
        success: true,
        totalAmount,
        // 주문 데이터를 반환하지만 저장하지는 않음
      };

    } catch (error) {
      console.error('주문 데이터 검증 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '주문 데이터 검증 중 오류가 발생했습니다',
      };
    }
  }

  // 결제 승인 후 주문 생성 (재고 차감 없이)
  async createOrderAfterPayment(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      // 주문 데이터 재검증
      const validationResult = await this.validateOrderData(request);
      if (!validationResult.success) {
        return validationResult;
      }

      // 주문 생성
      const orderData: CreateOrderData = {
        userId: request.userId,
        items: request.cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productPrice: item.productPrice,
          quantity: item.quantity,
          productImageUrl: item.productImageUrl,
          productOptions: item.productOptions,
        })),
        shippingAddress: request.shippingAddress,
        paymentMethod: request.paymentMethod,
        memo: request.memo,
      };

      const order = new Order(orderData);
      order.generateOrderNumber();

      // 주문 저장 (결제 완료 후이므로 PAYMENT_COMPLETED 상태로)
      order.status = 'PAYMENT_COMPLETED' as any; // 결제 완료 상태로 직접 설정
      
      const savedOrder = await this.orderRepository.save(order);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        totalAmount: savedOrder.totalAmount,
        order: savedOrder,
      };

    } catch (error) {
      console.error('결제 후 주문 생성 중 오류:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 후 주문 생성 중 오류가 발생했습니다',
      };
    }
  }

  // 주문 중복 확인
  private async checkDuplicateOrder(orderNumber: string): Promise<boolean> {
    try {
      const existingOrder = await this.orderRepository.findByOrderNumber(orderNumber);
      return existingOrder !== null;
    } catch (error) {
      console.error('주문 중복 확인 실패:', error);
      return false;
    }
  }
}