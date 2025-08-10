// ========================================
// HealthController - 헬스체크 컨트롤러
// ========================================

import { Request, Response } from 'express';
import { NotificationLogger } from '../services/NotificationLogger';

/**
 * 헬스체크 컨트롤러
 * 서비스 상태 모니터링을 위한 다양한 헬스체크 엔드포인트 제공
 */
export class HealthController {
  private notificationLogger: NotificationLogger;
  private startTime: Date;

  constructor() {
    this.notificationLogger = new NotificationLogger();
    this.startTime = new Date();
  }

  // ========================================
  // 기본 헬스체크
  // ========================================

  /**
   * 기본 헬스체크 - 서비스 생존 상태 확인
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      res.status(200).json({
        status: 'healthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(uptime),
          formatted: this.formatUptime(uptime),
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`,
        },
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      });

    } catch (error) {
      console.error('헬스체크 실패:', error);
      res.status(503).json({
        status: 'unhealthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ========================================
  // 상세 헬스체크
  // ========================================

  /**
   * 상세 헬스체크 - 의존성 서비스 및 내부 컴포넌트 상태 확인
   */
  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 [HealthController] 상세 헬스체크 시작');

      // 기본 시스템 정보
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const loadAverage = process.platform === 'linux' ? require('os').loadavg() : null;

      // 로그 시스템 상태
      const logSystemHealth = await this.notificationLogger.getHealthStatus();

      // Kafka 연결 상태 (Mock - 실제로는 EventConsumer 상태 확인)
      const kafkaHealth = await this.checkKafkaHealth();

      // SMTP 서버 연결 상태 (Mock)
      const smtpHealth = await this.checkSMTPHealth();

      // 전체 상태 판단
      const isHealthy = logSystemHealth.status === 'healthy' && 
                       kafkaHealth.status === 'healthy' && 
                       smtpHealth.status === 'healthy';

      const healthData = {
        status: isHealthy ? 'healthy' : 'degraded',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        startTime: this.startTime.toISOString(),
        uptime: {
          seconds: Math.floor(uptime),
          formatted: this.formatUptime(uptime),
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`,
          },
          ...(loadAverage && { loadAverage }),
        },
        dependencies: {
          kafka: kafkaHealth,
          smtp: smtpHealth,
          logging: logSystemHealth,
        },
        metrics: await this.getServiceMetrics(),
      };

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json(healthData);

      console.log(`✅ [HealthController] 상세 헬스체크 완료 (${healthData.status})`);

    } catch (error) {
      console.error('❌ [HealthController] 상세 헬스체크 실패:', error);
      res.status(503).json({
        status: 'unhealthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  // ========================================
  // Kubernetes Probes
  // ========================================

  /**
   * Readiness Probe - 트래픽 수신 준비 상태 확인
   */
  async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // 필수 의존성 서비스 연결 확인
      const kafkaHealth = await this.checkKafkaHealth();
      const smtpHealth = await this.checkSMTPHealth();

      const isReady = kafkaHealth.status === 'healthy' && smtpHealth.status === 'healthy';

      if (isReady) {
        res.status(200).json({
          status: 'ready',
          service: 'notification-service',
          timestamp: new Date().toISOString(),
          checks: {
            kafka: kafkaHealth,
            smtp: smtpHealth,
          },
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          service: 'notification-service',
          timestamp: new Date().toISOString(),
          checks: {
            kafka: kafkaHealth,
            smtp: smtpHealth,
          },
        });
      }

    } catch (error) {
      console.error('Readiness 체크 실패:', error);
      res.status(503).json({
        status: 'not_ready',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Readiness check failed',
      });
    }
  }

  /**
   * Liveness Probe - 프로세스 생존 상태 확인
   */
  async livenessCheck(req: Request, res: Response): Promise<void> {
    try {
      // 기본적인 프로세스 상태만 확인 (가벼운 체크)
      const uptime = process.uptime();
      
      // 30초 이상 실행중이고 메모리 사용량이 정상이면 살아있다고 판단
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      
      const isAlive = uptime > 30 && heapUsedMB < 1000; // 1GB 미만

      if (isAlive) {
        res.status(200).json({
          status: 'alive',
          service: 'notification-service',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime),
          memoryUsage: `${Math.round(heapUsedMB * 100) / 100} MB`,
        });
      } else {
        res.status(503).json({
          status: 'dead',
          service: 'notification-service',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime),
          memoryUsage: `${Math.round(heapUsedMB * 100) / 100} MB`,
          issue: uptime <= 30 ? 'service_starting' : 'high_memory_usage',
        });
      }

    } catch (error) {
      console.error('Liveness 체크 실패:', error);
      res.status(503).json({
        status: 'dead',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Liveness check failed',
      });
    }
  }

  // ========================================
  // 의존성 서비스 체크
  // ========================================

  private async checkKafkaHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    lastConnected?: Date;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Mock Kafka 연결 체크
      // 실제로는 EventConsumer의 연결 상태를 확인
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms 지연 시뮬레이션
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastConnected: new Date(),
      };

    } catch (error) {
      console.error('Kafka 헬스체크 실패:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Kafka connection failed',
      };
    }
  }

  private async checkSMTPHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    lastTested?: Date;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Mock SMTP 연결 체크
      // 실제로는 nodemailer transporter의 verify() 메서드 사용
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms 지연 시뮬레이션
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastTested: new Date(),
      };

    } catch (error) {
      console.error('SMTP 헬스체크 실패:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'SMTP connection failed',
      };
    }
  }

  // ========================================
  // 서비스 메트릭스
  // ========================================

  private async getServiceMetrics(): Promise<{
    notifications: {
      last24Hours: any;
      lastHour: any;
      recentErrors: number;
    };
  }> {
    try {
      const realTimeStats = this.notificationLogger.getRealTimeStats();

      return {
        notifications: {
          last24Hours: realTimeStats.last24Hours,
          lastHour: realTimeStats.lastHour,
          recentErrors: realTimeStats.currentErrors.length,
        },
      };

    } catch (error) {
      console.error('서비스 메트릭스 조회 실패:', error);
      return {
        notifications: {
          last24Hours: { totalSent: 0, totalFailed: 0, successRate: 0 },
          lastHour: { sent: 0, failed: 0, successRate: 0 },
          recentErrors: 0,
        },
      };
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  /**
   * 서비스 정보 조회
   */
  async getServiceInfo(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        service: 'notification-service',
        description: 'Microservice Shopping Mall - Notification Service',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: [
          'Email Notifications',
          'SMS Notifications', 
          'Event-Driven Architecture (Kafka)',
          'Notification Logging & Statistics',
          'Health Monitoring',
        ],
        endpoints: {
          health: '/health',
          detailedHealth: '/health/detailed',
          readiness: '/health/ready',
          liveness: '/health/live',
          logs: '/api/notifications/logs',
          stats: '/api/notifications/stats',
          test: '/api/notifications/test',
        },
        documentation: 'https://docs.shopping-mall.com/notification-service',
        contact: 'dev-team@shopping-mall.com',
        buildInfo: {
          buildTime: process.env.BUILD_TIME || 'development',
          gitCommit: process.env.GIT_COMMIT || 'unknown',
          dockerImage: process.env.DOCKER_IMAGE || 'notification-service:latest',
        },
      });

    } catch (error) {
      console.error('서비스 정보 조회 실패:', error);
      res.status(500).json({
        error: 'Failed to get service information',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}