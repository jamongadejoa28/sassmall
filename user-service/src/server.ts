// ========================================
// Clean Architecture User Service Server
// src/server.ts
// ========================================

import 'dotenv/config';
import 'reflect-metadata'; // TypeORM 필수
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DataSource } from 'typeorm';

// ===== Database Configuration =====
import { createDatabaseConnection } from './config/database';

// ===== Dependency Container =====
import {
  createDependencyContainer,
  DependencyContainer,
} from './container/DependencyContainer';

// ===== Routes =====
import { createUserRoutes } from './frameworks/routes/userRoutes';
import phoneVerificationRoutes from './frameworks/presentation/routes/phoneVerificationRoutes';

// ===== Middleware =====
import {
  globalErrorHandler,
  notFoundHandler,
} from './frameworks/middleware/errorMiddleware';

/**
 * UserServiceServer - Clean Architecture 완성
 */
export class UserServiceServer {
  private app: Application;
  private dataSource: DataSource | null = null;
  private container: DependencyContainer | null = null;
  private server: any = null;

  constructor() {
    this.app = express();
    this.configureMiddleware();
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Clean Architecture User Service 시작 중...');

      this.validateEnvironment();
      await this.connectDatabase();
      await this.initializeDependencyContainer();
      this.configureRoutes();
      this.configureErrorHandlers();
      await this.startListening();
      this.setupGracefulShutdown();

      console.log('✅ Clean Architecture User Service 시작 완료!');
    } catch (error) {
      console.error('❌ User Service 시작 실패:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  private configureMiddleware(): void {
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );

    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:3000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    this.app.use(compression());
    this.app.use(
      morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
    );
    this.app.use(express.json({ limit: '10mb', strict: true }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    const rateLimitConfig = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      message: {
        success: false,
        message: '너무 많은 요청이 발생했습니다.',
        error: 'RATE_LIMIT_EXCEEDED',
        data: null,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(rateLimitConfig);

    console.log('✅ 미들웨어 구성 완료');
  }

  private validateEnvironment(): void {
    const requiredEnvVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `환경변수가 설정되지 않았습니다: ${missingVars.join(', ')}`
      );
    }

    console.log('✅ 환경변수 검증 완료');
  }

  private async connectDatabase(): Promise<void> {
    try {
      this.dataSource = await createDatabaseConnection();
      console.log('✅ PostgreSQL 연결 완료');
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error);
      throw error;
    }
  }

  private async initializeDependencyContainer(): Promise<void> {
    if (!this.dataSource) {
      throw new Error('데이터베이스 연결이 필요합니다');
    }

    try {
      this.container = await createDependencyContainer(this.dataSource, {
        environment: (process.env.NODE_ENV as any) || 'development',
        enableLogging: process.env.NODE_ENV !== 'test',
      });

      console.log('✅ 의존성 컨테이너 초기화 완료');
    } catch (error) {
      console.error('❌ 의존성 컨테이너 초기화 실패:', error);
      throw error;
    }
  }

  private configureRoutes(): void {
    if (!this.container) {
      throw new Error('의존성 컨테이너가 초기화되지 않았습니다');
    }

    // Health Check
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Clean Architecture User Service 정상 작동! 🚀',
        data: {
          service: 'User Service',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          architecture: 'Clean Architecture',
        },
      });
    });

    // API 정보
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Clean Architecture User Service API',
        data: {
          endpoints: {
            users: '/api/users',
            health: '/api/users/health',
          },
          architecture: 'Entity → Use Case → Adapter → Framework',
        },
      });
    });

    // 사용자 라우트
    const userRoutes = createUserRoutes(
      this.container.userController,
      this.container.tokenService,
      this.container.userRepository
    );
    this.app.use('/api/users', userRoutes);

    // 휴대폰 인증 라우트
    this.app.use('/api/users/phone-verification', phoneVerificationRoutes);

    // 디버깅: 휴대폰 인증 라우트 상태 확인
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 [User Service] 휴대폰 인증 라우트들:');
      console.log('   - POST /api/users/phone-verification/request');
      console.log('   - GET  /api/users/phone-verification/status/:sessionId');
      console.log('   - POST /api/users/phone-verification/complete/:sessionId');
      console.log('   - GET  /api/users/phone-verification/health');
      console.log('   - GET  /api/users/phone-verification/stats');
    }

    console.log('✅ 라우트 구성 완료');
  }

  private configureErrorHandlers(): void {
    this.app.use(notFoundHandler());
    this.app.use(globalErrorHandler());
    console.log('✅ 에러 핸들러 구성 완료');
  }

  private async startListening(): Promise<void> {
    const port = parseInt(process.env.PORT || '3002', 10);
    const host = process.env.HOST || '0.0.0.0';

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, host, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        console.log(`
🎉 ========================================
✅ Clean Architecture User Service 완성!
🌐 서버: http://${host}:${port}
📋 API: http://${host}:${port}/api
🏥 Health: http://${host}:${port}/api/users/health
🔧 환경: ${process.env.NODE_ENV || 'development'}
💾 DB: PostgreSQL
🏗️ 아키텍처: Clean Architecture
========================================
        `);

        resolve();
      });
    });
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n📡 ${signal} 신호 수신, 서버 종료 시작...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    process.on('uncaughtException', async error => {
      console.error('💥 Uncaught Exception:', error);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection:', reason);
      await this.shutdown();
      process.exit(1);
    });

    console.log('✅ Graceful Shutdown 설정 완료');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 서버 종료 시작...');

    try {
      if (this.server) {
        await new Promise<void>(resolve => {
          this.server.close(() => {
            console.log('✅ HTTP 서버 종료 완료');
            resolve();
          });
        });
      }

      if (this.container) {
        await this.container.cleanup();
      }

      console.log('✅ 서버 종료 완료');
    } catch (error) {
      console.error('❌ 서버 종료 중 오류:', error);
    }
  }

  getApp(): Application {
    return this.app;
  }
}

// ========================================
// 메인 실행부
// ========================================

async function startServer(): Promise<void> {
  const server = new UserServiceServer();
  await server.start();
}

// 직접 실행 시에만 서버 시작
if (require.main === module) {
  startServer().catch(error => {
    console.error('💥 서버 시작 실패:', error);
    process.exit(1);
  });
}
