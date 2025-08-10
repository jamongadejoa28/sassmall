// ========================================
// SMSNotificationService - SMS 발송 서비스
// ========================================

/**
 * SMS 알림 서비스
 * 실제 환경에서는 Twilio, AWS SNS, KakaoTalk API 등 사용
 * 현재는 Mock 구현으로 처리
 */
export class SMSNotificationService {

  constructor() {
    // SMS 서비스 초기화
    // 실제 환경에서는 API 키, 발신번호 등 설정
  }

  // ========================================
  // Product Event Related SMS
  // ========================================

  /**
   * 재고 부족 긴급 SMS 알림
   */
  async sendLowStockAlert(data: {
    sku: string;
    productName: string;
    currentQuantity: number;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 재고 부족 긴급 SMS 발송 (Mock):', {
        sku: data.sku,
        currentQuantity: data.currentQuantity,
      });

      // Mock SMS 발송 로직
      const message = `🚨[긴급] 재고부족 알림
SKU: ${data.sku}
상품: ${data.productName}
현재재고: ${data.currentQuantity}개
즉시 보충 필요!`;

      // 실제 환경에서는 SMS API 호출
      await this.mockSendSMS('010-0000-0000', message); // 관리자 번호

      console.log('✅ [SMSService] 재고 부족 긴급 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 재고 부족 SMS 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Order Event Related SMS
  // ========================================

  /**
   * 결제 완료 SMS 알림
   */
  async sendPaymentConfirmation(data: {
    orderNumber: string;
    totalAmount: number;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 결제 완료 SMS 발송 (Mock):', {
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
      });

      // Mock SMS 발송 로직
      const message = `💳[결제완료]
주문번호: ${data.orderNumber}
결제금액: ${data.totalAmount.toLocaleString('ko-KR')}원
감사합니다!`;

      // 실제로는 사용자 전화번호 조회 필요
      await this.mockSendSMS('010-1234-5678', message);

      console.log('✅ [SMSService] 결제 완료 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 결제 완료 SMS 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 배송 시작 SMS 알림
   */
  async sendShippingNotification(data: {
    orderNumber: string;
    trackingNumber: string;
    courierCompany: string;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 배송 시작 SMS 발송 (Mock):', {
        orderNumber: data.orderNumber,
        trackingNumber: data.trackingNumber,
      });

      const message = `📦[배송시작]
주문번호: ${data.orderNumber}
택배사: ${data.courierCompany}
운송장: ${data.trackingNumber}
배송조회 가능합니다!`;

      await this.mockSendSMS('010-1234-5678', message);

      console.log('✅ [SMSService] 배송 시작 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 배송 시작 SMS 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 배송 완료 SMS 알림
   */
  async sendDeliveryConfirmation(data: {
    orderNumber: string;
    deliveredAt: Date;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 배송 완료 SMS 발송 (Mock):', {
        orderNumber: data.orderNumber,
        deliveredAt: data.deliveredAt,
      });

      const message = `✅[배송완료]
주문번호: ${data.orderNumber}
배송완료: ${data.deliveredAt.toLocaleDateString('ko-KR')}
상품을 확인해주세요!`;

      await this.mockSendSMS('010-1234-5678', message);

      console.log('✅ [SMSService] 배송 완료 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 배송 완료 SMS 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // User Event Related SMS
  // ========================================

  /**
   * 회원가입 환영 SMS (선택사항)
   */
  async sendWelcomeSMS(data: {
    userName: string;
    phoneNumber: string;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 환영 SMS 발송 (Mock):', {
        userName: data.userName,
        phoneNumber: data.phoneNumber,
      });

      const message = `🎉환영합니다!
${data.userName}님
쇼핑몰 가입을 축하드립니다!
다양한 혜택을 만나보세요.`;

      await this.mockSendSMS(data.phoneNumber, message);

      console.log('✅ [SMSService] 환영 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 환영 SMS 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 휴대폰 인증번호 SMS 발송
   */
  async sendVerificationCode(data: {
    phoneNumber: string;
    verificationCode: string;
    expiryMinutes: number;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 인증번호 SMS 발송 (Mock):', {
        phoneNumber: data.phoneNumber,
        verificationCode: data.verificationCode,
      });

      const message = `[쇼핑몰] 인증번호
${data.verificationCode}
${data.expiryMinutes}분 내 입력해주세요.
타인에게 노출금지!`;

      await this.mockSendSMS(data.phoneNumber, message);

      console.log('✅ [SMSService] 인증번호 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 인증번호 SMS 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Promotional SMS
  // ========================================

  /**
   * 프로모션/마케팅 SMS 발송
   */
  async sendPromotionalSMS(data: {
    phoneNumbers: string[];
    message: string;
    campaignName: string;
  }): Promise<void> {
    try {
      console.log('📱 [SMSService] 프로모션 SMS 발송 (Mock):', {
        recipientCount: data.phoneNumbers.length,
        campaignName: data.campaignName,
      });

      // 배치로 SMS 발송 (실제로는 API 제한 고려하여 청크 단위로 처리)
      for (const phoneNumber of data.phoneNumbers) {
        await this.mockSendSMS(phoneNumber, data.message);
        // 실제 환경에서는 Rate Limiting 고려하여 딜레이 추가
        await this.delay(100); // 100ms 딜레이
      }

      console.log('✅ [SMSService] 프로모션 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 프로모션 SMS 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Emergency/Critical Notifications
  // ========================================

  /**
   * 긴급 시스템 알림 SMS (관리자용)
   */
  async sendSystemAlert(data: {
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    try {
      console.log('🚨 [SMSService] 시스템 긴급 알림 SMS 발송 (Mock):', {
        alertType: data.alertType,
        severity: data.severity,
      });

      const severityEmoji = {
        low: '🟢',
        medium: '🟡', 
        high: '🟠',
        critical: '🔴'
      };

      const message = `${severityEmoji[data.severity]}[${data.alertType.toUpperCase()}]
${data.message}
시간: ${new Date().toLocaleString('ko-KR')}
확인 필요!`;

      // 관리자들에게 발송 (실제로는 관리자 전화번호 목록 관리)
      const adminNumbers = ['010-0000-0001', '010-0000-0002'];
      
      for (const adminNumber of adminNumbers) {
        await this.mockSendSMS(adminNumber, message);
      }

      console.log('✅ [SMSService] 시스템 긴급 알림 SMS 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [SMSService] 시스템 긴급 알림 SMS 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Mock SMS 발송 메서드
   * 실제 환경에서는 SMS API (Twilio, AWS SNS 등) 호출
   */
  private async mockSendSMS(phoneNumber: string, message: string): Promise<void> {
    // Mock 구현 - 실제로는 외부 SMS API 호출
    console.log(`📱 [SMS Mock] TO: ${phoneNumber}`);
    console.log(`📱 [SMS Mock] MESSAGE: ${message}`);
    
    // 실제 API 호출 시뮬레이션 (짧은 딜레이)
    await this.delay(50);

    // 성공률 시뮬레이션 (99% 성공)
    if (Math.random() < 0.01) {
      throw new Error(`SMS 발송 실패 - 번호: ${phoneNumber}`);
    }

    console.log(`✅ [SMS Mock] 발송 완료: ${phoneNumber}`);
  }

  /**
   * SMS 발송 상태 확인 (Mock)
   */
  async checkSMSStatus(messageId: string): Promise<{
    messageId: string;
    status: 'sent' | 'delivered' | 'failed';
    deliveredAt?: Date;
    errorMessage?: string;
  }> {
    // Mock 구현
    console.log(`📱 [SMS Mock] 발송 상태 확인: ${messageId}`);
    
    await this.delay(100);
    
    // 랜덤 상태 시뮬레이션
    const statuses: Array<'sent' | 'delivered' | 'failed'> = ['sent', 'delivered', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      messageId,
      status: randomStatus,
      deliveredAt: randomStatus === 'delivered' ? new Date() : undefined,
      errorMessage: randomStatus === 'failed' ? '전화번호 오류' : undefined,
    };
  }

  /**
   * SMS 발송 비용 계산 (Mock)
   */
  calculateSMSCost(messageLength: number, recipientCount: number): {
    messageCount: number;
    costPerMessage: number;
    totalCost: number;
    currency: string;
  } {
    // 한국 SMS 기준: 90바이트(45글자) = 1통, 초과시 LMS
    const maxSMSLength = 45; // 한글 기준
    const smsUnitCost = 20; // 원
    const lmsUnitCost = 50; // 원
    
    let messageCount: number;
    let costPerMessage: number;
    
    if (messageLength <= maxSMSLength) {
      // SMS
      messageCount = 1;
      costPerMessage = smsUnitCost;
    } else {
      // LMS (Long Message Service)
      messageCount = Math.ceil(messageLength / 1000); // 1000자 단위
      costPerMessage = lmsUnitCost;
    }
    
    return {
      messageCount,
      costPerMessage,
      totalCost: costPerMessage * recipientCount,
      currency: 'KRW'
    };
  }

  /**
   * 전화번호 유효성 검증
   */
  validatePhoneNumber(phoneNumber: string): {
    isValid: boolean;
    formatted: string;
    errorMessage?: string;
  } {
    // 한국 전화번호 패턴 검증
    const koreanPhonePattern = /^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/;
    
    // 하이픈 제거
    const cleanNumber = phoneNumber.replace(/-/g, '');
    
    if (!koreanPhonePattern.test(phoneNumber) && !koreanPhonePattern.test(cleanNumber)) {
      return {
        isValid: false,
        formatted: phoneNumber,
        errorMessage: '올바른 한국 휴대폰 번호 형식이 아닙니다'
      };
    }
    
    // 표준 형식으로 포맷팅 (010-1234-5678)
    const formatted = cleanNumber.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    
    return {
      isValid: true,
      formatted,
    };
  }

  /**
   * 딜레이 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // SMS 템플릿 관리
  // ========================================

  /**
   * 미리 정의된 SMS 템플릿 가져오기
   */
  getTemplate(templateName: string, variables: Record<string, any>): string {
    const templates: Record<string, string> = {
      welcome: '🎉환영합니다! {userName}님, 쇼핑몰 가입을 축하드립니다!',
      verification: '[쇼핑몰] 인증번호 {code}\n{minutes}분 내 입력해주세요.',
      orderConfirm: '💳주문완료 {orderNumber}\n금액: {amount}원\n감사합니다!',
      shipping: '📦배송시작 {orderNumber}\n운송장: {trackingNumber}',
      delivered: '✅배송완료 {orderNumber}\n상품을 확인해주세요!',
      lowStock: '🚨재고부족 {sku}\n현재: {quantity}개\n보충 필요!'
    };

    let template = templates[templateName];
    if (!template) {
      throw new Error(`SMS 템플릿을 찾을 수 없습니다: ${templateName}`);
    }

    // 변수 치환
    Object.entries(variables).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    return template;
  }
}