// ========================================
// Health Controller - 헬스체크 컨트롤러
// order-service/src/frameworks/controllers/HealthController.ts
// ========================================

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';

export class HealthController {
  constructor(private dataSource?: DataSource) {}

  // 기본 헬스체크
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'order-service',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
      };

      res.status(200).json({
        success: true,
        data: healthInfo,
      });
    } catch (error) {
      console.error('헬스체크 오류:', error);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: '서비스 상태 확인 중 오류가 발생했습니다',
      });
    }
  }

  // 상세 헬스체크 (데이터베이스 연결 포함)
  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const healthInfo: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'order-service',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        checks: {},
      };

      // 데이터베이스 연결 확인
      if (this.dataSource) {
        try {
          const dbStartTime = Date.now();
          await this.dataSource.query('SELECT 1');
          const dbResponseTime = Date.now() - dbStartTime;
          
          healthInfo.checks.database = {
            status: 'healthy',
            responseTime: `${dbResponseTime}ms`,
            connection: this.dataSource.isInitialized ? 'connected' : 'disconnected',
          };
        } catch (dbError) {
          healthInfo.status = 'unhealthy';
          healthInfo.checks.database = {
            status: 'unhealthy',
            error: dbError instanceof Error ? dbError.message : 'Database connection failed',
          };
        }
      }

      // 메모리 사용량 확인
      const memoryUsage = process.memoryUsage();
      healthInfo.checks.memory = {
        status: 'healthy',
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        unit: 'MB',
      };

      // 전체 응답 시간
      healthInfo.responseTime = `${Date.now() - startTime}ms`;

      const statusCode = healthInfo.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: healthInfo.status === 'healthy',
        data: healthInfo,
      });

    } catch (error) {
      console.error('상세 헬스체크 오류:', error);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: '서비스 상태 확인 중 오류가 발생했습니다',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Readiness probe (Kubernetes용)
  async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // 서비스가 요청을 처리할 준비가 되었는지 확인
      const isReady = this.dataSource?.isInitialized ?? false;

      if (isReady) {
        res.status(200).json({
          success: true,
          status: 'ready',
          message: '서비스가 요청을 처리할 준비가 되었습니다',
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'not_ready',
          message: '서비스가 아직 준비되지 않았습니다',
        });
      }
    } catch (error) {
      console.error('Readiness 체크 오류:', error);
      res.status(503).json({
        success: false,
        status: 'not_ready',
        message: 'Readiness 체크 중 오류가 발생했습니다',
      });
    }
  }

  // Liveness probe (Kubernetes용)
  async livenessCheck(req: Request, res: Response): Promise<void> {
    try {
      // 서비스가 살아있는지 확인 (기본적인 응답만)
      res.status(200).json({
        success: true,
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Liveness 체크 오류:', error);
      res.status(503).json({
        success: false,
        status: 'not_alive',
        message: 'Liveness 체크 중 오류가 발생했습니다',
      });
    }
  }
}