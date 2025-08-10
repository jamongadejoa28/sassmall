// ========================================
// EmailNotificationService - 이메일 발송 서비스
// ========================================

import nodemailer, { Transporter } from 'nodemailer';

/**
 * 이메일 알림 서비스
 * nodemailer를 사용한 이메일 발송 처리
 */
export class EmailNotificationService {
  private transporter: Transporter;

  constructor() {
    // 개발 환경에서는 Ethereal Email 테스트 계정 사용
    // 프로덕션에서는 실제 SMTP 서버 설정 필요
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // ========================================
  // User Event Related Emails
  // ========================================

  /**
   * 환영 이메일 발송
   */
  async sendWelcomeEmail(data: {
    to: string;
    userName: string;
    userId: string;
    registrationSource: string;
  }): Promise<void> {
    try {
      console.log('📧 [EmailService] 환영 이메일 발송:', {
        to: data.to,
        userName: data.userName,
        userId: data.userId,
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: data.to,
        subject: '🎉 쇼핑몰 가입을 환영합니다!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">환영합니다, ${data.userName}님!</h2>
            <p>저희 쇼핑몰에 가입해주셔서 감사합니다.</p>
            <p>다양한 상품과 혜택을 만나보세요!</p>
            <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
              <h3>회원 정보</h3>
              <ul>
                <li>사용자 ID: ${data.userId}</li>
                <li>가입 경로: ${data.registrationSource}</li>
                <li>가입 날짜: ${new Date().toLocaleString('ko-KR')}</li>
              </ul>
            </div>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              이 이메일은 자동으로 발송된 메일입니다.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 환영 이메일 발송 완료');

    } catch (error) {
      console.error('❌ [EmailService] 환영 이메일 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 계정 비활성화 알림 이메일 발송
   */
  async sendAccountDeactivationEmail(data: {
    userId: string;
    reason: string;
    deactivatedBy: string;
  }): Promise<void> {
    try {
      console.log('📧 [EmailService] 계정 비활성화 알림 발송 (Mock):', {
        userId: data.userId,
        reason: data.reason,
      });

      // Mock implementation - 실제로는 사용자 이메일 조회 후 발송
      const mockEmail = `user${data.userId}@example.com`;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: mockEmail,
        subject: '⚠️ 계정 상태 변경 알림',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">계정이 비활성화되었습니다</h2>
            <p>안녕하세요, 고객님</p>
            <p>귀하의 계정이 다음과 같은 사유로 비활성화되었습니다:</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #fee2e2; border-left: 4px solid #dc2626;">
              <strong>비활성화 사유:</strong> ${data.reason}
            </div>
            <p style="margin-top: 20px;">문의사항이 있으시면 고객센터로 연락해주세요.</p>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              처리자: ${data.deactivatedBy}<br>
              처리 시간: ${new Date().toLocaleString('ko-KR')}
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 계정 비활성화 알림 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [EmailService] 계정 비활성화 알림 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Product Event Related Emails
  // ========================================

  /**
   * 신상품 등록 알림 (관리자용)
   */
  async sendNewProductNotification(data: {
    productId: string;
    productName: string;
    brand: string;
    price: number;
    categoryName: string;
    createdBy: string;
  }): Promise<void> {
    try {
      console.log('📧 [EmailService] 신상품 등록 알림 발송:', {
        productId: data.productId,
        productName: data.productName,
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: 'admin@shopping-mall.com',
        subject: '🆕 새로운 상품이 등록되었습니다',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">새로운 상품 등록 알림</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <h3 style="margin-top: 0; color: #065f46;">${data.productName}</h3>
              <ul>
                <li><strong>상품 ID:</strong> ${data.productId}</li>
                <li><strong>브랜드:</strong> ${data.brand}</li>
                <li><strong>가격:</strong> ${data.price.toLocaleString('ko-KR')}원</li>
                <li><strong>카테고리:</strong> ${data.categoryName}</li>
                <li><strong>등록자:</strong> ${data.createdBy}</li>
                <li><strong>등록 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
              </ul>
            </div>
            <p style="margin-top: 20px;">상품을 확인하고 승인해주세요.</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 신상품 등록 알림 발송 완료');

    } catch (error) {
      console.error('❌ [EmailService] 신상품 등록 알림 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 재고 업데이트 알림
   */
  async sendStockUpdateNotification(data: {
    productId: string;
    sku: string;
    previousQuantity: number;
    newQuantity: number;
    changeReason: string;
    location: string;
  }): Promise<void> {
    try {
      console.log('📧 [EmailService] 재고 업데이트 알림 발송:', {
        sku: data.sku,
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
      });

      const quantityChange = data.newQuantity - data.previousQuantity;
      const changeType = quantityChange > 0 ? '증가' : '감소';
      const changeColor = quantityChange > 0 ? '#059669' : '#dc2626';

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: 'inventory@shopping-mall.com',
        subject: `📦 재고 변동 알림 - ${data.sku}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #374151;">재고 변동 알림</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0;">SKU: ${data.sku}</h3>
              <ul>
                <li><strong>상품 ID:</strong> ${data.productId}</li>
                <li><strong>위치:</strong> ${data.location}</li>
                <li><strong>이전 재고:</strong> ${data.previousQuantity}개</li>
                <li><strong>현재 재고:</strong> ${data.newQuantity}개</li>
                <li><strong>변동량:</strong> 
                  <span style="color: ${changeColor}; font-weight: bold;">
                    ${quantityChange > 0 ? '+' : ''}${quantityChange}개 (${changeType})
                  </span>
                </li>
                <li><strong>변동 사유:</strong> ${data.changeReason}</li>
                <li><strong>변동 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
              </ul>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 재고 업데이트 알림 발송 완료');

    } catch (error) {
      console.error('❌ [EmailService] 재고 업데이트 알림 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 재고 부족 긴급 알림
   */
  async sendLowStockAlert(data: {
    productId: string;
    sku: string;
    productName: string;
    currentQuantity: number;
    lowStockThreshold: number;
    urgencyLevel: string;
    location: string;
  }): Promise<void> {
    try {
      console.log('🚨 [EmailService] 재고 부족 알림 발송:', {
        sku: data.sku,
        currentQuantity: data.currentQuantity,
        urgencyLevel: data.urgencyLevel,
      });

      const urgencyColor = data.urgencyLevel === 'critical' ? '#dc2626' : '#f59e0b';
      const urgencyText = data.urgencyLevel === 'critical' ? '긴급' : '경고';

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: 'inventory@shopping-mall.com',
        subject: `🚨 [${urgencyText}] 재고 부족 알림 - ${data.sku}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${urgencyColor};">🚨 재고 부족 ${urgencyText} 알림</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #fef2f2; border-radius: 8px; border: 2px solid ${urgencyColor};">
              <h3 style="margin-top: 0; color: ${urgencyColor};">${data.productName}</h3>
              <ul>
                <li><strong>SKU:</strong> ${data.sku}</li>
                <li><strong>상품 ID:</strong> ${data.productId}</li>
                <li><strong>현재 재고:</strong> <span style="color: ${urgencyColor}; font-weight: bold; font-size: 18px;">${data.currentQuantity}개</span></li>
                <li><strong>부족 임계값:</strong> ${data.lowStockThreshold}개</li>
                <li><strong>위치:</strong> ${data.location}</li>
                <li><strong>긴급도:</strong> <span style="color: ${urgencyColor}; font-weight: bold;">${data.urgencyLevel.toUpperCase()}</span></li>
                <li><strong>감지 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
              </ul>
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #fee2e2; border-radius: 8px;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">
                ⚠️ 즉시 재고 보충이 필요합니다!
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 재고 부족 알림 발송 완료');

    } catch (error) {
      console.error('❌ [EmailService] 재고 부족 알림 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Order Event Related Emails
  // ========================================

  /**
   * 주문 확인 이메일 발송
   */
  async sendOrderConfirmation(data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    totalAmount: number;
    items: any[];
    shippingAddress: any;
    paymentMethod: string;
  }): Promise<void> {
    try {
      console.log('📧 [EmailService] 주문 확인 이메일 발송 (Mock):', {
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
      });

      // Mock implementation
      const mockEmail = `user${data.userId}@example.com`;
      const itemsHtml = data.items.map(item => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.productName || '상품명'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}개</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${(item.price || 0).toLocaleString('ko-KR')}원</td>
        </tr>
      `).join('');

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: mockEmail,
        subject: `🛒 주문 확인 - ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">주문이 확인되었습니다!</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
              <h3 style="margin-top: 0;">주문 정보</h3>
              <ul>
                <li><strong>주문번호:</strong> ${data.orderNumber}</li>
                <li><strong>주문일:</strong> ${new Date().toLocaleString('ko-KR')}</li>
                <li><strong>결제방법:</strong> ${data.paymentMethod}</li>
                <li><strong>총 금액:</strong> <span style="font-size: 18px; font-weight: bold; color: #059669;">${data.totalAmount.toLocaleString('ko-KR')}원</span></li>
              </ul>
            </div>
            <div style="margin-top: 20px;">
              <h3>주문 상품</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">상품명</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">수량</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">가격</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
            <p style="margin-top: 30px;">주문해주셔서 감사합니다!</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 주문 확인 이메일 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [EmailService] 주문 확인 이메일 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 결제 완료 이메일 발송
   */
  async sendPaymentConfirmation(data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    totalAmount: number;
    paymentId: string;
    paymentMethod: string;
    paidAt: Date;
  }): Promise<void> {
    try {
      console.log('💳 [EmailService] 결제 완료 이메일 발송 (Mock):', {
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
      });

      const mockEmail = `user${data.userId}@example.com`;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: mockEmail,
        subject: `💳 결제 완료 - ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🎉 결제가 완료되었습니다!</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 2px solid #10b981;">
              <h3 style="margin-top: 0; color: #065f46;">결제 정보</h3>
              <ul>
                <li><strong>주문번호:</strong> ${data.orderNumber}</li>
                <li><strong>결제ID:</strong> ${data.paymentId}</li>
                <li><strong>결제방법:</strong> ${data.paymentMethod}</li>
                <li><strong>결제금액:</strong> <span style="font-size: 20px; font-weight: bold; color: #059669;">${data.totalAmount.toLocaleString('ko-KR')}원</span></li>
                <li><strong>결제완료:</strong> ${new Date(data.paidAt).toLocaleString('ko-KR')}</li>
              </ul>
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #dbeafe; border-radius: 8px;">
              <p style="margin: 0; color: #1e40af;">
                📦 곧 상품 준비가 시작되며, 배송 정보는 별도로 안내드릴 예정입니다.
              </p>
            </div>
            <p style="margin-top: 30px;">감사합니다!</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 결제 완료 이메일 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [EmailService] 결제 완료 이메일 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 주문 상태 업데이트 이메일
   */
  async sendOrderStatusUpdate(data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    previousStatus: string;
    newStatus: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: Date;
  }): Promise<void> {
    try {
      console.log('📦 [EmailService] 주문 상태 업데이트 이메일 발송 (Mock):', {
        orderNumber: data.orderNumber,
        newStatus: data.newStatus,
      });

      const mockEmail = `user${data.userId}@example.com`;
      const statusText = this.getStatusText(data.newStatus);
      const statusColor = this.getStatusColor(data.newStatus);

      let trackingInfo = '';
      if (data.trackingNumber) {
        trackingInfo = `<li><strong>운송장번호:</strong> ${data.trackingNumber}</li>`;
      }

      let deliveryInfo = '';
      if (data.estimatedDeliveryDate) {
        deliveryInfo = `<li><strong>예상 배송일:</strong> ${new Date(data.estimatedDeliveryDate).toLocaleDateString('ko-KR')}</li>`;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: mockEmail,
        subject: `📦 배송 상태 업데이트 - ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${statusColor};">배송 상태가 업데이트되었습니다</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${statusColor};">
              <h3 style="margin-top: 0; color: ${statusColor};">${statusText}</h3>
              <ul>
                <li><strong>주문번호:</strong> ${data.orderNumber}</li>
                <li><strong>이전 상태:</strong> ${this.getStatusText(data.previousStatus)}</li>
                <li><strong>현재 상태:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></li>
                ${trackingInfo}
                ${deliveryInfo}
                <li><strong>업데이트 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
              </ul>
            </div>
            <p style="margin-top: 20px;">주문해주셔서 감사합니다!</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 주문 상태 업데이트 이메일 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [EmailService] 주문 상태 업데이트 이메일 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 주문 취소 이메일
   */
  async sendOrderCancellation(data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    totalAmount: number;
    cancelReason: string;
    refundRequired: boolean;
    refundAmount?: number;
  }): Promise<void> {
    try {
      console.log('❌ [EmailService] 주문 취소 이메일 발송 (Mock):', {
        orderNumber: data.orderNumber,
        cancelReason: data.cancelReason,
      });

      const mockEmail = `user${data.userId}@example.com`;

      let refundInfo = '';
      if (data.refundRequired && data.refundAmount) {
        refundInfo = `
          <div style="margin-top: 20px; padding: 15px; background-color: #dbeafe; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #1e40af;">💰 환불 정보</h4>
            <p style="margin: 0;">환불 금액: <strong>${data.refundAmount.toLocaleString('ko-KR')}원</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">환불은 3-5일 내에 처리됩니다.</p>
          </div>
        `;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: mockEmail,
        subject: `❌ 주문 취소 알림 - ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">주문이 취소되었습니다</h2>
            <div style="margin-top: 20px; padding: 20px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fca5a5;">
              <h3 style="margin-top: 0; color: #991b1b;">취소 정보</h3>
              <ul>
                <li><strong>주문번호:</strong> ${data.orderNumber}</li>
                <li><strong>주문금액:</strong> ${data.totalAmount.toLocaleString('ko-KR')}원</li>
                <li><strong>취소사유:</strong> ${data.cancelReason}</li>
                <li><strong>취소시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
              </ul>
            </div>
            ${refundInfo}
            <p style="margin-top: 30px;">문의사항이 있으시면 고객센터로 연락해주세요.</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 주문 취소 이메일 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [EmailService] 주문 취소 이메일 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Cart Event Related Emails
  // ========================================

  /**
   * 장바구니 복구 유도 이메일
   */
  async sendCartAbandonmentReminder(data: {
    cartId: string;
    userId: string;
    items: any[];
    totalAmount: number;
    lastActiveAt: Date;
  }): Promise<void> {
    try {
      console.log('🛒 [EmailService] 장바구니 복구 유도 이메일 발송 (Mock):', {
        cartId: data.cartId,
        totalAmount: data.totalAmount,
        itemCount: data.items.length,
      });

      const mockEmail = `user${data.userId}@example.com`;
      const itemsHtml = data.items.slice(0, 3).map(item => `
        <div style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.productName || '상품명'}</strong><br>
          <span style="color: #6b7280;">수량: ${item.quantity || 1}개 / 가격: ${(item.price || 0).toLocaleString('ko-KR')}원</span>
        </div>
      `).join('');

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@shopping-mall.com',
        to: mockEmail,
        subject: '🛒 잊어버린 장바구니가 있어요!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">🛒 잊어버린 상품들이 기다리고 있어요!</h2>
            <p>안녕하세요! 장바구니에 담아두신 상품들이 아직 기다리고 있습니다.</p>
            
            <div style="margin-top: 20px; padding: 20px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fed7aa;">
              <h3 style="margin-top: 0; color: #92400e;">장바구니 상품 (${data.items.length}개)</h3>
              ${itemsHtml}
              ${data.items.length > 3 ? `<div style="padding: 10px; color: #6b7280; font-style: italic;">외 ${data.items.length - 3}개 상품</div>` : ''}
              <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #f59e0b;">
                <strong style="font-size: 18px; color: #92400e;">총 금액: ${data.totalAmount.toLocaleString('ko-KR')}원</strong>
              </div>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                🛒 계속 쇼핑하기
              </a>
            </div>

            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
              마지막 활동: ${new Date(data.lastActiveAt).toLocaleString('ko-KR')}<br>
              이 이메일은 자동으로 발송되었습니다.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ [EmailService] 장바구니 복구 유도 이메일 발송 완료 (Mock)');

    } catch (error) {
      console.error('❌ [EmailService] 장바구니 복구 유도 이메일 발송 실패:', error);
      throw error;
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '주문 접수',
      preparing: '상품 준비 중',
      shipped: '배송 중',
      delivered: '배송 완료',
      cancelled: '주문 취소',
      returned: '반품 처리',
      refunded: '환불 완료'
    };
    return statusMap[status.toLowerCase()] || status;
  }

  private getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      pending: '#6b7280',
      preparing: '#f59e0b',
      shipped: '#3b82f6',
      delivered: '#059669',
      cancelled: '#dc2626',
      returned: '#dc2626',
      refunded: '#059669'
    };
    return colorMap[status.toLowerCase()] || '#6b7280';
  }
}