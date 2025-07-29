// ========================================
// Payment Service - 결제 서비스 (Adapter와 Repository 조정)
// order-service/src/adapters/PaymentService.ts
// ========================================

import { Payment, CreatePaymentData, PaymentResult } from '../entities/Payment';
import { PaymentAdapter, PaymentRequest, PaymentApprovalRequest, RefundRequest } from './PaymentAdapter';
import { PaymentRepository } from './PaymentRepository';
import { UpdateOrderStatusUseCase } from '../usecases/UpdateOrderStatusUseCase';
import { CreateOrderUseCase, CreateOrderRequest } from '../usecases/CreateOrderUseCase';
import { OrderStatus } from '../entities/OrderStatus';

export interface ProcessPaymentRequest {
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  productName: string;
  paymentMethod: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

export interface ApprovePaymentRequest {
  paymentKey: string;
  orderId: string;
  amount?: number;
  userId: string;
  orderData?: CreateOrderRequest; // 주문 데이터 (결제 승인 후 주문 생성용)
}

export class PaymentService {
  private pendingApprovals: Map<string, Promise<PaymentResult>> = new Map();

  constructor(
    private paymentAdapter: PaymentAdapter,
    private paymentRepository: PaymentRepository,
    private updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private createOrderUseCase: CreateOrderUseCase
  ) {}

  async processPayment(request: ProcessPaymentRequest): Promise<PaymentResult> {
    try {
      const paymentData: CreatePaymentData = {
        orderId: request.orderId,
        paymentMethod: request.paymentMethod,
        amount: request.amount,
      };

      const payment = new Payment(paymentData);

      const paymentRequest: PaymentRequest = {
        orderId: request.orderId,
        orderNumber: request.orderNumber,
        userId: request.userId,
        amount: request.amount,
        productName: request.productName,
        successUrl: request.successUrl,
        failUrl: request.failUrl,
        cancelUrl: request.cancelUrl,
      };

      const paymentResult = await this.paymentAdapter.requestPayment(paymentRequest);

      if (paymentResult.success && paymentResult.paymentId) {
        payment.startPayment(paymentResult.paymentId, paymentResult.systemData);
        await this.paymentRepository.save(payment);

        return {
          success: true,
          paymentId: paymentResult.paymentId,
          redirectUrl: paymentResult.redirectUrl,
          systemData: paymentResult.systemData,
        };
      } else {
        payment.failPayment(paymentResult.errorMessage || '결제 요청 실패', paymentResult.systemData);
        await this.paymentRepository.save(payment);
        return paymentResult;
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다',
      };
    }
  }

  async approvePayment(request: ApprovePaymentRequest): Promise<PaymentResult> {
    const existingPromise = this.pendingApprovals.get(request.paymentKey);
    if (existingPromise) {
      return existingPromise;
    }

    const approvalPromise = this.executePaymentApproval(request);
    this.pendingApprovals.set(request.paymentKey, approvalPromise);

    try {
      const result = await approvalPromise;
      return result;
    } finally {
      this.pendingApprovals.delete(request.paymentKey);
    }
  }

  private async executePaymentApproval(request: ApprovePaymentRequest): Promise<PaymentResult> {
    try {
      const existingPayments = await this.paymentRepository.findByOrderId(request.orderId);
      let existingPayment = existingPayments.find(p => p.status === 'pending');
      
      if (!existingPayment) {
        const existingByKey = await this.paymentRepository.findByPaymentId(request.paymentKey);
        if (existingByKey) {
          existingPayment = existingByKey;
        } else {
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            attempts++;
            try {
              const paymentData = {
                orderId: request.orderId,
                paymentMethod: 'TOSSPAYMENTS' as const,
                amount: request.amount || 0,
              };
              
              existingPayment = new Payment(paymentData);
              existingPayment.startPayment(request.paymentKey, { createdByApproval: true });
              existingPayment = await this.paymentRepository.save(existingPayment);
              break;
              
            } catch (saveError) {
              if (saveError instanceof Error && 
                  (saveError.message.includes('duplicate key') || 
                   saveError.message.includes('unique constraint') ||
                   saveError.message.includes('UNIQUE constraint failed'))) {
                
                await new Promise(resolve => setTimeout(resolve, 50 * attempts));
                const retryExisting = await this.paymentRepository.findByPaymentId(request.paymentKey);
                if (retryExisting) {
                  existingPayment = retryExisting;
                  break;
                } else if (attempts >= maxAttempts) {
                  throw saveError;
                }
              } else {
                throw saveError;
              }
            }
          }
        }
      }

      const approvalRequest: PaymentApprovalRequest = {
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount,
        userId: request.userId,
      };

      const approvalResult = await this.paymentAdapter.approvePayment(approvalRequest);

      if (approvalResult.success) {
        if (!existingPayment) {
          throw new Error('결제 정보가 없습니다.');
        }
        
        try {
          existingPayment.approvePayment(approvalResult.systemData);
          
          let saveAttempts = 0;
          const maxSaveAttempts = 3;
          
          while (saveAttempts < maxSaveAttempts) {
            saveAttempts++;
            try {
              await this.paymentRepository.save(existingPayment);
              break;
            } catch (finalSaveError) {
              if (finalSaveError instanceof Error && 
                  (finalSaveError.message.includes('duplicate key') || 
                   finalSaveError.message.includes('unique constraint') ||
                   finalSaveError.message.includes('UNIQUE constraint failed'))) {
                
                await new Promise(resolve => setTimeout(resolve, 50 * saveAttempts));
                const finalExisting = await this.paymentRepository.findByPaymentId(request.paymentKey);
                if (finalExisting && finalExisting.status === 'approved') {
                  existingPayment = finalExisting;
                  break;
                } else if (finalExisting) {
                  existingPayment = finalExisting;
                  existingPayment.approvePayment(approvalResult.systemData);
                  if (saveAttempts >= maxSaveAttempts) {
                    throw finalSaveError;
                  }
                } else {
                  throw finalSaveError;
                }
              } else {
                throw finalSaveError;
              }
            }
          }

          // 결제 승인 완료 후 주문 생성 (orderData가 있는 경우)
          try {
            if (request.orderData) {
              // 새로운 플로우: 결제 승인 후 주문 생성
              console.log('결제 승인 완료 - 주문 생성 시작');
              const orderCreationResult = await this.createOrderUseCase.createOrderAfterPayment(request.orderData);
              
              if (!orderCreationResult.success) {
                console.error('결제 후 주문 생성 실패:', orderCreationResult.errorMessage);
                // 주문 생성 실패해도 결제는 성공으로 처리하고 에러 로그만 남김
              } else {
                console.log('결제 후 주문 생성 성공:', orderCreationResult.orderId);
              }
            } else {
              // 기존 플로우: 주문이 이미 존재하는 경우 상태만 업데이트
              // 1단계: PENDING → PAYMENT_IN_PROGRESS
              const progressResult = await this.updateOrderStatusUseCase.updateStatus({
                orderId: request.orderId,
                newStatus: OrderStatus.PAYMENT_IN_PROGRESS,
                reason: `결제 승인 시작 - PaymentKey: ${request.paymentKey}`,
              });
              if (!progressResult.success) {
                throw new Error(progressResult.errorMessage || '결제 진행 상태 업데이트 실패');
              }

              // 2단계: PAYMENT_IN_PROGRESS → PAYMENT_COMPLETED
              const completedResult = await this.updateOrderStatusUseCase.updateStatus({
                orderId: request.orderId,
                newStatus: OrderStatus.PAYMENT_COMPLETED,
                reason: `결제 승인 완료 - PaymentKey: ${request.paymentKey}`,
              });
              if (!completedResult.success) {
                throw new Error(completedResult.errorMessage || '결제 완료 상태 업데이트 실패');
              }
            }
          } catch (orderProcessError) {
            // 주문 처리 실패 시 에러 로그 남기기
            console.error('주문 처리 실패:', orderProcessError);
            // 에러를 throw하지 않고 결제 성공 처리 계속 진행
          }

          return {
            success: true,
            paymentKey: request.paymentKey,
            orderId: request.orderId,
            systemData: approvalResult.systemData,
          };
        } catch (updateError) {
          throw updateError;
        }
      } else {
        if (!existingPayment) {
          throw new Error('결제 정보가 없습니다.');
        }
        
        try {
          existingPayment.failPayment(approvalResult.errorMessage || '결제 승인 실패', approvalResult.systemData);
          await this.paymentRepository.save(existingPayment);
          return approvalResult;
        } catch (failError) {
          throw failError;
        }
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 승인 중 오류가 발생했습니다',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const localPayment = await this.paymentRepository.findByPaymentId(paymentId);
      const statusResult = await this.paymentAdapter.getPaymentStatus(paymentId);

      if (statusResult.success && localPayment) {
        return {
          success: true,
          paymentId: localPayment.paymentId,
          systemData: {
            localStatus: localPayment.status,
            externalStatus: statusResult.systemData,
            payment: localPayment.toJSON(),
          },
        };
      }

      return statusResult;
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 상태 조회 중 오류가 발생했습니다',
      };
    }
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    try {
      const existingPayment = await this.paymentRepository.findByPaymentId(paymentId);
      if (!existingPayment) {
        return {
          success: false,
          errorMessage: '결제 정보를 찾을 수 없습니다',
        };
      }

      if (!existingPayment.canBeRefunded()) {
        return {
          success: false,
          errorMessage: '환불할 수 없는 결제 상태입니다',
        };
      }

      const refundRequest: RefundRequest = {
        paymentId,
        amount,
        reason,
      };

      const refundResult = await this.paymentAdapter.refundPayment(refundRequest);

      if (refundResult.success) {
        existingPayment.refundPayment(refundResult.systemData);
        await this.paymentRepository.save(existingPayment);

        return {
          success: true,
          paymentId: refundResult.paymentId,
          systemData: refundResult.systemData,
        };
      } else {
        return refundResult;
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 환불 중 오류가 발생했습니다',
      };
    }
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    try {
      return await this.paymentRepository.findByOrderId(orderId);
    } catch (error) {
      throw new Error('주문의 결제 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  async getPaymentStatistics(startDate: Date, endDate: Date): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    try {
      const payments = await this.paymentRepository.findByDateRange(startDate, endDate);
      
      const totalPayments = payments.length;
      const successfulPayments = payments.filter(p => p.isSuccessful()).length;
      const failedPayments = payments.filter(p => p.status === 'failed').length;
      const totalAmount = payments
        .filter(p => p.isSuccessful())
        .reduce((sum, p) => sum + p.amount, 0);
      const averageAmount = successfulPayments > 0 ? totalAmount / successfulPayments : 0;

      return {
        totalPayments,
        successfulPayments,
        failedPayments,
        totalAmount,
        averageAmount,
      };
    } catch (error) {
      throw new Error('결제 통계를 조회하는 중 오류가 발생했습니다');
    }
  }
}