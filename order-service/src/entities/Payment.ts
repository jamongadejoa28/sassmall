// ========================================
// Payment Entity - 결제 엔티티
// order-service/src/entities/Payment.ts
// ========================================

export interface CreatePaymentData {
  orderId: string;
  paymentMethod: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';
  amount: number;
  paymentSystemData?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  paymentKey?: string;
  orderId?: string;
  redirectUrl?: string;
  errorMessage?: string;
  systemData?: Record<string, any>;
}

export class Payment {
  public id?: string;
  public orderId: string;
  public paymentId: string;
  public paymentMethod: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';
  public amount: number;
  public status: string;
  public paymentSystemData?: Record<string, any>;
  public requestedAt: Date;
  public approvedAt?: Date;
  public failedAt?: Date;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: CreatePaymentData) {
    this.validateInput(data);

    this.orderId = data.orderId;
    this.paymentId = ''; // Will be set by payment system
    this.paymentMethod = data.paymentMethod;
    this.amount = data.amount;
    this.status = 'pending';
    this.paymentSystemData = data.paymentSystemData;

    const now = new Date();
    this.requestedAt = now;
    this.createdAt = now;
    this.updatedAt = now;
  }

  // 입력 데이터 유효성 검증
  private validateInput(data: CreatePaymentData): void {
    if (!data.orderId || data.orderId.trim().length === 0) {
      throw new Error('주문 ID는 필수 항목입니다');
    }

    if (data.amount <= 0) {
      throw new Error('결제 금액은 0보다 커야 합니다');
    }

    if (data.amount > 99999999) {
      throw new Error('결제 금액이 너무 큽니다');
    }

    const validMethods = ['KAKAOPAY', 'CARD', 'BANK_TRANSFER', 'TOSSPAYMENTS'];
    if (!validMethods.includes(data.paymentMethod)) {
      throw new Error('유효하지 않은 결제 방법입니다');
    }
  }

  // 결제 요청 시작
  public startPayment(paymentId: string, systemData?: Record<string, any>): void {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new Error('결제 ID는 필수 항목입니다');
    }

    this.paymentId = paymentId.trim();
    this.status = 'ready';
    this.paymentSystemData = { ...this.paymentSystemData, ...systemData };
    this.updatedAt = new Date();
  }

  // 결제 승인 완료
  public approvePayment(systemData?: Record<string, any>): void {
    if (this.status !== 'ready') {
      throw new Error('결제 승인은 ready 상태에서만 가능합니다');
    }

    this.status = 'approved';
    this.approvedAt = new Date();
    this.paymentSystemData = { ...this.paymentSystemData, ...systemData };
    this.updatedAt = new Date();
  }

  // 결제 실패 처리
  public failPayment(errorMessage: string, systemData?: Record<string, any>): void {
    if (this.status === 'approved') {
      throw new Error('이미 승인된 결제는 실패 처리할 수 없습니다');
    }

    this.status = 'failed';
    this.failedAt = new Date();
    this.paymentSystemData = { 
      ...this.paymentSystemData, 
      ...systemData,
      errorMessage 
    };
    this.updatedAt = new Date();
  }

  // 결제 취소 처리
  public cancelPayment(systemData?: Record<string, any>): void {
    if (this.status === 'approved') {
      throw new Error('승인된 결제는 환불 프로세스를 통해 처리해야 합니다');
    }

    this.status = 'cancelled';
    this.paymentSystemData = { ...this.paymentSystemData, ...systemData };
    this.updatedAt = new Date();
  }

  // 환불 처리
  public refundPayment(systemData?: Record<string, any>): void {
    if (this.status !== 'approved') {
      throw new Error('환불은 승인된 결제에서만 가능합니다');
    }

    this.status = 'refunded';
    this.paymentSystemData = { ...this.paymentSystemData, ...systemData };
    this.updatedAt = new Date();
  }

  // 결제 성공 여부 확인
  public isSuccessful(): boolean {
    return this.status === 'approved';
  }

  // 결제 완료 여부 확인 (성공 또는 실패)
  public isCompleted(): boolean {
    return ['approved', 'failed', 'cancelled', 'refunded'].includes(this.status);
  }

  // 환불 가능 여부 확인
  public canBeRefunded(): boolean {
    return this.status === 'approved';
  }

  // JSON 직렬화
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      orderId: this.orderId,
      paymentId: this.paymentId,
      paymentMethod: this.paymentMethod,
      amount: this.amount,
      status: this.status,
      paymentSystemData: this.paymentSystemData,
      requestedAt: this.requestedAt,
      approvedAt: this.approvedAt,
      failedAt: this.failedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // 결제 요약 정보
  public getSummary(): {
    paymentId: string;
    method: string;
    amount: number;
    status: string;
    requestedAt: Date;
    completedAt?: Date;
  } {
    return {
      paymentId: this.paymentId,
      method: this.paymentMethod,
      amount: this.amount,
      status: this.status,
      requestedAt: this.requestedAt,
      completedAt: this.approvedAt || this.failedAt
    };
  }
}