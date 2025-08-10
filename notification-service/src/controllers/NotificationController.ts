// ========================================
// NotificationController - 알림 관리 컨트롤러
// ========================================

import { Request, Response } from 'express';
import { NotificationLogger, NotificationLog } from '../services/NotificationLogger';
import { EmailNotificationService } from '../services/EmailNotificationService';
import { SMSNotificationService } from '../services/SMSNotificationService';

/**
 * 알림 관리 컨트롤러
 * 알림 로그 조회, 통계, 테스트 발송 등의 관리 기능 제공
 */
export class NotificationController {
  private notificationLogger: NotificationLogger;
  private emailService: EmailNotificationService;
  private smsService: SMSNotificationService;

  constructor() {
    this.notificationLogger = new NotificationLogger();
    this.emailService = new EmailNotificationService();
    this.smsService = new SMSNotificationService();
  }

  // ========================================
  // 알림 로그 조회
  // ========================================

  /**
   * 알림 로그 목록 조회
   */
  async getLogs(req: Request, res: Response): Promise<Response | void> {
    try {
      console.log('📋 [NotificationController] 알림 로그 조회 요청');

      const {
        page = '1',
        limit = '50',
        eventType,
        notificationType,
        status,
        userId,
        startDate,
        endDate,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10))); // 최대 200개 제한

      // 필터 조건 구성
      const filter: any = {};
      if (eventType) filter.eventType = eventType;
      if (notificationType) filter.notificationType = notificationType;
      if (status) filter.status = status;
      if (userId) filter.userId = userId;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);

      // 로그 조회
      const logs = this.notificationLogger.getFilteredLogs(filter, limitNum * pageNum);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedLogs = logs.slice(startIndex, endIndex);

      // 응답 데이터 구성
      const response = {
        success: true,
        data: {
          logs: paginatedLogs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: logs.length,
            pages: Math.ceil(logs.length / limitNum),
            hasNext: endIndex < logs.length,
            hasPrev: pageNum > 1,
          },
          filters: filter,
          summary: {
            totalCount: logs.length,
            successCount: logs.filter(log => log.status === 'sent').length,
            failureCount: logs.filter(log => log.status === 'failed').length,
            retryCount: logs.filter(log => log.status === 'retry').length,
          },
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
      console.log(`✅ [NotificationController] 알림 로그 조회 완료 (${paginatedLogs.length}개)`);

    } catch (error) {
      console.error('❌ [NotificationController] 알림 로그 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOG_FETCH_ERROR',
          message: '알림 로그 조회 중 오류가 발생했습니다',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // 알림 통계 조회
  // ========================================

  /**
   * 알림 통계 조회
   */
  async getStats(req: Request, res: Response): Promise<Response | void> {
    try {
      console.log('📊 [NotificationController] 알림 통계 조회 요청');

      const { 
        period = 'day',
        startDate,
        endDate,
      } = req.query;

      let stats: any;

      if (period === 'realtime') {
        // 실시간 통계
        stats = this.notificationLogger.getRealTimeStats();
        
      } else if (period === 'day') {
        // 일일 통계
        const date = startDate ? new Date(startDate as string) : new Date();
        stats = this.notificationLogger.generateDailyStats(date);
        
      } else if (period === 'range' && startDate && endDate) {
        // 기간별 통계
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        // 최대 30일 제한
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PERIOD',
              message: '조회 기간은 최대 30일까지 가능합니다',
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        stats = this.notificationLogger.generatePeriodStats(start, end);
        
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '올바른 조회 조건을 지정해주세요',
            validPeriods: ['realtime', 'day', 'range'],
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 추가 통계 정보
      const recentLogs = this.notificationLogger.getRecentLogs(1000);
      const additionalStats = {
        totalLogsInMemory: recentLogs.length,
        errorRate: recentLogs.length > 0 
          ? (recentLogs.filter(log => log.status === 'failed').length / recentLogs.length * 100).toFixed(2)
          : '0.00',
        mostFrequentEvents: this.getMostFrequentEvents(recentLogs),
        mostFrequentErrors: this.getMostFrequentErrors(recentLogs),
      };

      res.status(200).json({
        success: true,
        data: {
          period,
          stats,
          additionalInfo: additionalStats,
        },
        timestamp: new Date().toISOString(),
      });

      console.log('✅ [NotificationController] 알림 통계 조회 완료');

    } catch (error) {
      console.error('❌ [NotificationController] 알림 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FETCH_ERROR',
          message: '통계 조회 중 오류가 발생했습니다',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // 테스트 알림 발송
  // ========================================

  /**
   * 테스트 알림 발송
   */
  async sendTestNotification(req: Request, res: Response): Promise<Response | void> {
    try {
      console.log('🧪 [NotificationController] 테스트 알림 발송 요청');

      const {
        type, // 'email' | 'sms'
        recipient,
        template,
        testData,
      } = req.body;

      // 입력 값 검증
      if (!type || !recipient || !template) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'type, recipient, template은 필수 항목입니다',
            required: ['type', 'recipient', 'template'],
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!['email', 'sms'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: 'type은 email 또는 sms만 허용됩니다',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 테스트 데이터 준비
      const mockTestData = {
        userName: testData?.userName || 'Test User',
        orderNumber: testData?.orderNumber || 'TEST-ORDER-001',
        totalAmount: testData?.totalAmount || 50000,
        productName: testData?.productName || 'Test Product',
        ...testData,
      };

      let result: any;

      // 알림 발송
      if (type === 'email') {
        result = await this.sendTestEmail(template, recipient, mockTestData);
      } else {
        result = await this.sendTestSMS(template, recipient, mockTestData);
      }

      // 테스트 로그 기록
      const testLog: NotificationLog = {
        eventId: `test-${Date.now()}`,
        eventType: 'TestNotification',
        notificationType: type as any,
        recipient,
        status: result.success ? 'sent' : 'failed',
        template,
        error: result.success ? undefined : result.error,
        sentAt: new Date(),
        metadata: {
          testMode: true,
          testData: mockTestData,
        },
      };

      await this.notificationLogger.logNotification(testLog);

      res.status(result.success ? 200 : 500).json({
        success: result.success,
        data: {
          type,
          recipient,
          template,
          testData: mockTestData,
          result: result.message,
        },
        error: result.success ? undefined : {
          code: 'TEST_NOTIFICATION_FAILED',
          message: result.error,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`${result.success ? '✅' : '❌'} [NotificationController] 테스트 알림 발송 완료`);

    } catch (error) {
      console.error('❌ [NotificationController] 테스트 알림 발송 실패:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_NOTIFICATION_ERROR',
          message: '테스트 알림 발송 중 오류가 발생했습니다',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // 로그 관리
  // ========================================

  /**
   * 로그 초기화 (개발/테스트 환경용)
   */
  async clearLogs(req: Request, res: Response): Promise<Response | void> {
    try {
      // 프로덕션 환경에서는 실행 금지
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '프로덕션 환경에서는 로그 초기화가 허용되지 않습니다',
          },
          timestamp: new Date().toISOString(),
        });
      }

      console.log('🧹 [NotificationController] 로그 초기화 요청');

      this.notificationLogger.clearMemoryLogs();

      res.status(200).json({
        success: true,
        message: '메모리 로그가 초기화되었습니다',
        timestamp: new Date().toISOString(),
      });

      console.log('✅ [NotificationController] 로그 초기화 완료');

    } catch (error) {
      console.error('❌ [NotificationController] 로그 초기화 실패:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOG_CLEAR_ERROR',
          message: '로그 초기화 중 오류가 발생했습니다',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async sendTestEmail(template: string, recipient: string, testData: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      switch (template) {
        case 'welcome':
          await this.emailService.sendWelcomeEmail({
            to: recipient,
            userName: testData.userName,
            userId: 'test-user-id',
            registrationSource: 'test',
          });
          break;

        case 'order_confirmation':
          await this.emailService.sendOrderConfirmation({
            orderId: 'test-order-id',
            orderNumber: testData.orderNumber,
            userId: 'test-user-id',
            totalAmount: testData.totalAmount,
            items: [{ productName: testData.productName, quantity: 1, price: testData.totalAmount }],
            shippingAddress: { address: 'Test Address' },
            paymentMethod: 'Test Payment',
          });
          break;

        case 'payment_confirmation':
          await this.emailService.sendPaymentConfirmation({
            orderId: 'test-order-id',
            orderNumber: testData.orderNumber,
            userId: 'test-user-id',
            totalAmount: testData.totalAmount,
            paymentId: 'test-payment-id',
            paymentMethod: 'Test Payment',
            paidAt: new Date(),
          });
          break;

        case 'low_stock_alert':
          await this.emailService.sendLowStockAlert({
            productId: 'test-product-id',
            sku: 'TEST-SKU-001',
            productName: testData.productName,
            currentQuantity: 5,
            lowStockThreshold: 10,
            urgencyLevel: 'high',
            location: 'MAIN_WAREHOUSE',
          });
          break;

        default:
          throw new Error(`지원하지 않는 이메일 템플릿입니다: ${template}`);
      }

      return { success: true, message: `${template} 이메일이 ${recipient}으로 발송되었습니다` };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email sending failed' 
      };
    }
  }

  private async sendTestSMS(template: string, recipient: string, testData: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // 전화번호 유효성 검증
      const validation = this.smsService.validatePhoneNumber(recipient);
      if (!validation.isValid) {
        throw new Error(validation.errorMessage);
      }

      switch (template) {
        case 'welcome':
          await this.smsService.sendWelcomeSMS({
            userName: testData.userName,
            phoneNumber: validation.formatted,
          });
          break;

        case 'payment_confirmation':
          await this.smsService.sendPaymentConfirmation({
            orderNumber: testData.orderNumber,
            totalAmount: testData.totalAmount,
          });
          break;

        case 'verification_code':
          await this.smsService.sendVerificationCode({
            phoneNumber: validation.formatted,
            verificationCode: '123456',
            expiryMinutes: 3,
          });
          break;

        case 'low_stock_alert':
          await this.smsService.sendLowStockAlert({
            sku: 'TEST-SKU-001',
            productName: testData.productName,
            currentQuantity: 5,
          });
          break;

        default:
          throw new Error(`지원하지 않는 SMS 템플릿입니다: ${template}`);
      }

      return { success: true, message: `${template} SMS가 ${validation.formatted}으로 발송되었습니다` };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMS sending failed' 
      };
    }
  }

  private getMostFrequentEvents(logs: NotificationLog[]): Array<{ eventType: string; count: number }> {
    const eventCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      eventCounts[log.eventType] = (eventCounts[log.eventType] || 0) + 1;
    });

    return Object.entries(eventCounts)
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getMostFrequentErrors(logs: NotificationLog[]): Array<{ error: string; count: number }> {
    const errorCounts: Record<string, number> = {};
    
    logs.filter(log => log.status === 'failed' && log.error).forEach(log => {
      const error = log.error!;
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });

    return Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}