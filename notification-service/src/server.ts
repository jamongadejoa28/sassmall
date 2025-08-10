// ========================================
// Notification Service Server - 알림 서비스 메인 서버
// ========================================

// 환경 변수 로딩 (맨 위에 위치해야 함)
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { EventConsumer, KAFKA_TOPICS } from './shared';
import { NotificationEventHandlers } from './handlers/NotificationEventHandlers';
import { HealthController } from './controllers/HealthController';
import { NotificationController } from './controllers/NotificationController';

class NotificationServiceServer {
  private app: Application;
  private eventConsumer: EventConsumer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3005', 10);
    
    // Event Consumer 초기화
    this.eventConsumer = new EventConsumer(
      {
        groupId: 'notification-service-group',
        topics: [
          KAFKA_TOPICS.USER_EVENTS,
          KAFKA_TOPICS.PRODUCT_EVENTS,
          KAFKA_TOPICS.ORDER_EVENTS,
          KAFKA_TOPICS.CART_EVENTS
        ],
        fromBeginning: false,
      },
      ['kafka:29092'],
      'notification-service'
    );
  }

  // 미들웨어 설정
  private setupMiddleware(): void {
    // 보안 미들웨어
    this.app.use(helmet({
      contentSecurityPolicy: false, // API 서버이므로 CSP 비활성화
    }));

    // CORS 설정
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // 압축
    this.app.use(compression());

    // JSON 파싱
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 요청 로깅
    this.app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

    // Trust proxy (로드 밸런서 뒤에서 실행될 때)
    this.app.set('trust proxy', 1);
  }

  // 라우트 설정
  private setupRoutes(): void {
    const healthController = new HealthController();
    const notificationController = new NotificationController();

    // 헬스체크 라우트
    this.app.get('/health', (req, res) => healthController.healthCheck(req, res));
    this.app.get('/health/detailed', (req, res) => healthController.detailedHealthCheck(req, res));
    this.app.get('/health/ready', (req, res) => healthController.readinessCheck(req, res));
    this.app.get('/health/live', (req, res) => healthController.livenessCheck(req, res));

    // 알림 관련 라우트
    this.app.get('/api/notifications/logs', (req, res) => notificationController.getLogs(req, res));
    this.app.post('/api/notifications/test', (req, res) => notificationController.sendTestNotification(req, res));
    this.app.get('/api/notifications/stats', (req, res) => notificationController.getStats(req, res));

    // 404 핸들러
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: '요청한 엔드포인트를 찾을 수 없습니다',
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Cannot ${req.method} ${req.originalUrl}`,
        },
      });
    });
  }

  // 에러 핸들링 미들웨어
  private setupErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('서버 오류:', error);

      // 개발 환경에서는 스택 트레이스 포함
      const errorResponse: any = {
        success: false,
        message: '서버 내부 오류가 발생했습니다',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        },
      };

      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }

      res.status(500).json(errorResponse);
    });
  }

  // Kafka Event Consumer 설정
  private async setupEventConsumer(): Promise<void> {
    try {
      // 이벤트 핸들러 등록
      const eventHandlers = new NotificationEventHandlers();
      
      // User Events
      this.eventConsumer.on('UserRegistered', eventHandlers.handleUserRegistered.bind(eventHandlers));
      this.eventConsumer.on('UserDeactivated', eventHandlers.handleUserDeactivated.bind(eventHandlers));
      
      // Product Events
      this.eventConsumer.on('ProductAdded', eventHandlers.handleProductAdded.bind(eventHandlers));
      this.eventConsumer.on('StockUpdated', eventHandlers.handleStockUpdated.bind(eventHandlers));
      this.eventConsumer.on('LowStockAlert', eventHandlers.handleLowStockAlert.bind(eventHandlers));
      
      // Order Events
      this.eventConsumer.on('OrderCreated', eventHandlers.handleOrderCreated.bind(eventHandlers));
      this.eventConsumer.on('OrderPaymentCompleted', eventHandlers.handleOrderPaymentCompleted.bind(eventHandlers));
      this.eventConsumer.on('OrderStatusUpdated', eventHandlers.handleOrderStatusUpdated.bind(eventHandlers));
      this.eventConsumer.on('OrderCancelled', eventHandlers.handleOrderCancelled.bind(eventHandlers));
      
      // Cart Events
      this.eventConsumer.on('CartAbandoned', eventHandlers.handleCartAbandoned.bind(eventHandlers));

      // Consumer 연결 및 구독 시작
      await this.eventConsumer.connect([
        KAFKA_TOPICS.USER_EVENTS,
        KAFKA_TOPICS.PRODUCT_EVENTS,
        KAFKA_TOPICS.ORDER_EVENTS,
        KAFKA_TOPICS.CART_EVENTS
      ], false);

      console.log('✅ [NotificationService] Kafka Event Consumer 설정 완료');

    } catch (error) {
      console.error('❌ [NotificationService] Kafka Event Consumer 설정 실패:', error);
      throw error;
    }
  }

  // 서버 시작
  public async start(): Promise<void> {
    try {
      console.log('🚀 Notification Service 시작 중...');
      
      // 미들웨어 설정
      this.setupMiddleware();

      // 라우트 설정
      this.setupRoutes();

      // 에러 핸들링 설정
      this.setupErrorHandling();

      // Kafka Event Consumer 설정
      await this.setupEventConsumer();

      // 서버 시작
      this.app.listen(this.port, () => {
        console.log('🚀 Notification Service 시작 완료');
        console.log(`📍 포트: ${this.port}`);
        console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 헬스체크: http://localhost:${this.port}/health`);
        console.log(`📋 알림 로그: http://localhost:${this.port}/api/notifications/logs`);
        console.log(`📈 통계: http://localhost:${this.port}/api/notifications/stats`);
      });

    } catch (error) {
      console.error('❌ 서버 시작 실패:', error);
      process.exit(1);
    }
  }

  // 서버 종료 (Graceful shutdown)
  public async stop(): Promise<void> {
    try {
      console.log('🛑 Notification Service 종료 시작...');
      
      // Kafka Consumer 연결 종료
      if (this.eventConsumer) {
        await this.eventConsumer.disconnect();
        console.log('✅ Kafka Consumer 연결 종료 완료');
      }
      
      console.log('✅ Notification Service 종료 완료');
    } catch (error) {
      console.error('❌ 서버 종료 중 오류:', error);
    }
  }
}

// 프로세스 종료 시그널 처리
const server = new NotificationServiceServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM 신호 수신 - Graceful shutdown 시작');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT 신호 수신 - Graceful shutdown 시작');
  await server.stop();
  process.exit(0);
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

// 서버 시작
if (require.main === module) {
  server.start().catch((error) => {
    console.error('서버 시작 중 오류:', error);
    process.exit(1);
  });
}

export default server;