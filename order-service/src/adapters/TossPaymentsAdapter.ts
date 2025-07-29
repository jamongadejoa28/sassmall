// ========================================
// TossPayments Adapter - 토스페이먼츠 결제 어댑터
// order-service/src/adapters/TossPaymentsAdapter.ts
// ========================================

import axios, { AxiosResponse } from 'axios';
import { PaymentAdapter, PaymentRequest, PaymentApprovalRequest, RefundRequest } from './PaymentAdapter';
import { PaymentResult } from '../entities/Payment';

// TossPayments API 응답 타입 정의
interface TossPaymentsResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  method: string;
  approvedAt?: string;
  requestedAt: string;
  receiptUrl?: string;
  checkoutUrl?: string;
  cancels?: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
  }>;
  failure?: {
    code: string;
    message: string;
  };
}

// TossPayments 결제 요청 타입
interface TossPaymentsPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
}

// TossPayments 결제 승인 요청 타입
interface TossPaymentsConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export class TossPaymentsAdapter implements PaymentAdapter {
  private readonly baseUrl = 'https://api.tosspayments.com';
  private readonly clientKey: string;
  private readonly secretKey: string;

  constructor(clientKey: string, secretKey: string) {
    this.clientKey = clientKey;
    this.secretKey = secretKey;
  }

  // 인증 헤더 생성
  private getAuthHeaders() {
    const encodedKey = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${encodedKey}`,
      'Content-Type': 'application/json',
    };
  }

  // 결제 요청 (Payment Widget 용)
  async requestPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // TossPayments는 Widget을 통해 결제 요청을 처리하므로
      // 실제 API 호출 없이 클라이언트 키와 결제 정보를 반환
      const paymentId = `${Date.now()}_${request.orderId}`;
      
      return {
        success: true,
        paymentId,
        redirectUrl: this.generateCheckoutUrl(request),
        systemData: {
          clientKey: this.clientKey,
          orderId: request.orderId,
          orderName: request.productName,
          amount: request.amount,
          successUrl: request.successUrl,
          failUrl: request.failUrl,
          cancelUrl: request.cancelUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 요청에 실패했습니다',
      };
    }
  }

  // 결제 승인 처리
  async approvePayment(request: PaymentApprovalRequest): Promise<PaymentResult> {
    try {
      
      if (!request.amount || request.amount <= 0) {
        return {
          success: false,
          errorMessage: '결제 금액이 올바르지 않습니다',
        };
      }

      // 테스트 모드인 경우에만 Mock 응답 반환
      if (process.env.TOSS_PAYMENTS_MODE === 'test' || !this.secretKey.startsWith('live_')) {
        const mockResponse = {
          paymentKey: request.paymentKey,
          orderId: request.orderId,
          status: 'DONE',
          totalAmount: request.amount,
          method: '카드',
          approvedAt: new Date().toISOString(),
          receiptUrl: 'https://mockreceipt.example.com',
        };
        
        return {
          success: true,
          paymentId: request.paymentKey,
          systemData: {
            paymentKey: mockResponse.paymentKey,
            orderId: mockResponse.orderId,
            status: mockResponse.status,
            totalAmount: mockResponse.totalAmount,
            method: mockResponse.method,
            approvedAt: mockResponse.approvedAt,
            receiptUrl: mockResponse.receiptUrl,
            rawResponse: mockResponse,
            mockMode: true,
          },
        };
      }

      const confirmRequest: TossPaymentsConfirmRequest = {
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount,
      };
      

      const response: AxiosResponse<TossPaymentsResponse> = await axios.post(
        `${this.baseUrl}/v1/payments/confirm`,
        confirmRequest,
        {
          headers: this.getAuthHeaders(),
          timeout: 15000, // 30초에서 15초로 단축
        }
      );


      if (response.status === 200 && response.data.status === 'DONE') {
        return {
          success: true,
          paymentId: response.data.paymentKey,
          systemData: {
            paymentKey: response.data.paymentKey,
            orderId: response.data.orderId,
            status: response.data.status,
            totalAmount: response.data.totalAmount,
            method: response.data.method,
            approvedAt: response.data.approvedAt,
            receiptUrl: response.data.receiptUrl,
            rawResponse: response.data,
          },
        };
      } else {
        throw new Error(response.data.failure?.message || '결제 승인에 실패했습니다');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        
        if (error.response) {
          const errorData = error.response.data;
          const mappedErrorMessage = this.mapTossPaymentsError(errorData.code) || errorData.message;
          
          return {
            success: false,
            errorMessage: mappedErrorMessage || '결제 승인에 실패했습니다',
            systemData: {
              httpStatus: error.response.status,
              errorCode: errorData.code,
              errorMessage: errorData.message,
              rawError: errorData,
            },
          };
        }
      }

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 승인 중 오류가 발생했습니다',
      };
    }
  }

  // 결제 상태 조회
  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const response: AxiosResponse<TossPaymentsResponse> = await axios.get(
        `${this.baseUrl}/v1/payments/${paymentId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000,
        }
      );

      return {
        success: true,
        paymentId: response.data.paymentKey,
        systemData: {
          paymentKey: response.data.paymentKey,
          orderId: response.data.orderId,
          status: response.data.status,
          totalAmount: response.data.totalAmount,
          method: response.data.method,
          approvedAt: response.data.approvedAt,
          receiptUrl: response.data.receiptUrl,
          cancels: response.data.cancels,
          rawResponse: response.data,
        },
      };
    } catch (error) {
      
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          errorMessage: errorData.message || '결제 상태 조회에 실패했습니다',
          systemData: {
            errorCode: errorData.code,
            errorMessage: errorData.message,
            rawError: errorData,
          },
        };
      }

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 상태 조회 중 오류가 발생했습니다',
      };
    }
  }

  // 결제 취소/환불
  async refundPayment(request: RefundRequest): Promise<PaymentResult> {
    try {
      const cancelRequest = {
        cancelReason: request.reason || '주문 취소',
        ...(request.amount && { cancelAmount: request.amount }),
      };

      const response: AxiosResponse<TossPaymentsResponse> = await axios.post(
        `${this.baseUrl}/v1/payments/${request.paymentId}/cancel`,
        cancelRequest,
        {
          headers: this.getAuthHeaders(),
          timeout: 30000,
        }
      );

      return {
        success: true,
        paymentId: response.data.paymentKey,
        systemData: {
          paymentKey: response.data.paymentKey,
          orderId: response.data.orderId,
          status: response.data.status,
          totalAmount: response.data.totalAmount,
          balanceAmount: response.data.balanceAmount,
          cancels: response.data.cancels,
          rawResponse: response.data,
        },
      };
    } catch (error) {
      
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          errorMessage: errorData.message || '결제 취소에 실패했습니다',
          systemData: {
            errorCode: errorData.code,
            errorMessage: errorData.message,
            rawError: errorData,
          },
        };
      }

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 취소 중 오류가 발생했습니다',
      };
    }
  }

  // TossPayments Widget을 위한 체크아웃 URL 생성
  private generateCheckoutUrl(request: PaymentRequest): string {
    const params = new URLSearchParams({
      clientKey: this.clientKey,
      orderId: request.orderId,
      orderName: request.productName,
      amount: request.amount.toString(),
      successUrl: request.successUrl,
      failUrl: request.failUrl,
    });

    // 실제로는 프론트엔드에서 Widget을 통해 처리되므로 이 URL은 참고용
    return `${this.baseUrl}/widget/checkout?${params.toString()}`;
  }

  // 웹훅 검증 (향후 구현)
  async verifyWebhook(signature: string, payload: string): Promise<boolean> {
    // TossPayments 웹훅 서명 검증 로직
    // 실제 구현에서는 HMAC-SHA256를 사용하여 검증
    return true; // 임시 구현
  }

  // TossPayments 에러 코드 매핑
  private mapTossPaymentsError(code: string): string {
    const errorMap: Record<string, string> = {
      'ALREADY_PROCESSED_PAYMENT': '이미 처리된 결제입니다',
      'PROVIDER_ERROR': '결제 수단에서 오류가 발생했습니다',
      'EXCEED_MAX_DAILY_PAYMENT_COUNT': '일일 결제 한도를 초과했습니다',
      'NOT_ALLOWED_POINT_USE': '포인트 사용이 허용되지 않습니다',
      'INVALID_API_KEY': 'API 키가 유효하지 않습니다',
      'INVALID_REQUEST': '잘못된 요청입니다',
      'NOT_FOUND_PAYMENT': '결제 정보를 찾을 수 없습니다',
      'FORBIDDEN_REQUEST': '권한이 없는 요청입니다',
      'REJECT_CARD_COMPANY': '카드사에서 결제를 거절했습니다',
    };

    return errorMap[code] || '알 수 없는 오류가 발생했습니다';
  }
}

// TossPaymentsAdapter 팩토리 함수
export function createTossPaymentsAdapter(clientKey?: string, secretKey?: string): TossPaymentsAdapter {
  const tossClientKey = clientKey || process.env.TOSS_CLIENT_KEY;
  const tossSecretKey = secretKey || process.env.TOSS_SECRET_KEY;

  if (!tossClientKey || !tossSecretKey) {
    throw new Error('TossPayments 클라이언트 키와 시크릿 키가 필요합니다');
  }

  return new TossPaymentsAdapter(tossClientKey, tossSecretKey);
}