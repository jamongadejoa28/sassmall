// ========================================
// Order Service Server - 주문 서비스 메인 서버
// order-service/src/server.ts
// ========================================

// 환경 변수 로딩 (맨 위에 위치해야 함)
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { DataSource } from 'typeorm';
import { createOrderRoutes } from './frameworks/routes/orderRoutes';
import { HealthController } from './frameworks/controllers/HealthController';
import { OrderController } from './frameworks/controllers/OrderController';

// Use Cases
import { CreateOrderUseCase } from './usecases/CreateOrderUseCase';
import { GetOrderUseCase } from './usecases/GetOrderUseCase';
import { UpdateOrderStatusUseCase } from './usecases/UpdateOrderStatusUseCase';
import { CancelOrderUseCase } from './usecases/CancelOrderUseCase';
import { GetOrdersAdminUseCase } from './usecases/GetOrdersAdminUseCase';
import { GetOrderStatsUseCase } from './usecases/GetOrderStatsUseCase';

// Adapters
import { OrderRepositoryImpl } from './adapters/OrderRepositoryImpl';
import { PaymentRepositoryImpl } from './adapters/PaymentRepositoryImpl';
import { PaymentService } from './adapters/PaymentService';
import { ProductServiceAdapter } from './adapters/ProductServiceAdapter';
import { createTossPaymentsAdapter } from './adapters/TossPaymentsAdapter';

// Entities
import { OrderEntity } from './adapters/entities/OrderEntity';
import { OrderItemEntity } from './adapters/entities/OrderItemEntity';
import { PaymentEntity } from './adapters/entities/PaymentEntity';

class OrderServiceServer {
  private app: Application;
  private dataSource: DataSource;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3004', 10);
    this.dataSource = this.createDataSource();
  }

  // TypeORM 데이터소스 설정
  private createDataSource(): DataSource {
    return new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'shopping_mall_orders',
      entities: [OrderEntity, OrderItemEntity, PaymentEntity],
      synchronize: false, // 스키마 동기화 임시 비활성화 (수동 해결 필요)
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
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

    // 요청 로깅 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }

    // Trust proxy (로드 밸런서 뒤에서 실행될 때)
    this.app.set('trust proxy', 1);
  }

  // 의존성 주입 및 라우트 설정
  private setupRoutes(): void {
    // Repository 생성
    const orderRepository = new OrderRepositoryImpl(this.dataSource);
    const paymentRepository = new PaymentRepositoryImpl(this.dataSource);

    // Adapter 생성
    const tossPaymentsAdapter = createTossPaymentsAdapter();

    // 실제 외부 서비스 어댑터들
    const productService = new ProductServiceAdapter('http://localhost:3003/api/v1');

    // UseCase 생성 (ProductService 의존성 포함)
    const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepository, productService);

    const mockUserService = {
      getUser: async (userId: string) => ({
        id: userId,
        email: 'user@example.com',
        name: 'Mock User',
        isActive: true,
      }),
    };

    // Use Case 생성 (PaymentService가 CreateOrderUseCase를 필요로 하므로 먼저 생성)
    const createOrderUseCase = new CreateOrderUseCase(
      orderRepository,
      productService,
      mockUserService
    );

    // PaymentService 생성 (CreateOrderUseCase 추가)
    const paymentService = new PaymentService(tossPaymentsAdapter, paymentRepository, updateOrderStatusUseCase, createOrderUseCase);

    const getOrderUseCase = new GetOrderUseCase(orderRepository);

    const cancelOrderUseCase = new CancelOrderUseCase(
      orderRepository,
      paymentService,
      productService
    );

    // Admin Use Cases 생성
    const getOrdersAdminUseCase = new GetOrdersAdminUseCase(orderRepository);
    const getOrderStatsUseCase = new GetOrderStatsUseCase(orderRepository);

    // Controller 생성
    const orderController = new OrderController(
      createOrderUseCase,
      getOrderUseCase,
      updateOrderStatusUseCase,
      cancelOrderUseCase,
      getOrdersAdminUseCase,
      getOrderStatsUseCase,
      paymentService
    );

    const healthController = new HealthController(this.dataSource);

    // 헬스체크 라우트
    this.app.get('/health', (req, res) => healthController.healthCheck(req, res));
    this.app.get('/health/detailed', (req, res) => healthController.detailedHealthCheck(req, res));
    this.app.get('/health/ready', (req, res) => healthController.readinessCheck(req, res));
    this.app.get('/health/live', (req, res) => healthController.livenessCheck(req, res));

    // API 라우트
    this.app.use('/api/orders', createOrderRoutes(orderController));

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

  // 데이터베이스 연결
  private async connectDatabase(): Promise<void> {
    try {
      await this.dataSource.initialize();
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error);
      throw error;
    }
  }

  // 서버 시작
  public async start(): Promise<void> {
    try {
      console.log('🚀 Order Service 시작 중...');
      
      // 데이터베이스 연결
      await this.connectDatabase();

      // 미들웨어 설정
      this.setupMiddleware();

      // 라우트 설정
      this.setupRoutes();

      // 에러 핸들링 설정
      this.setupErrorHandling();

      // 서버 시작
      this.app.listen(this.port, () => {
        console.log('🚀 Order Service 시작 완료');
        console.log(`📍 포트: ${this.port}`);
        console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 헬스체크: http://localhost:${this.port}/health`);
        console.log(`📋 API 문서: http://localhost:${this.port}/api/orders`);
      });

    } catch (error) {
      console.error('❌ 서버 시작 실패:', error);
      process.exit(1);
    }
  }

  // 서버 종료 (Graceful shutdown)
  public async stop(): Promise<void> {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
    } catch (error) {
      console.error('❌ 서버 종료 중 오류:', error);
    }
  }
}

// 프로세스 종료 시그널 처리
const server = new OrderServiceServer();

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