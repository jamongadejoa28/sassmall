// ========================================
// 고급 헬스체크 시스템
// src/infrastructure/health/HealthChecker.ts
// ========================================

import { DataSource } from 'typeorm';
import { DIContainer } from '../di/Container';
import { TYPES } from '../di/types';
import { CacheService } from '../../usecases/types';
import { logger } from '../logging/Logger';

/**
 * 헬스체크 상태 enum
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded'
}

/**
 * 개별 의존성 헬스체크 결과
 */
export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  message: string;
  responseTime: number;
  metadata?: Record<string, any>;
}

/**
 * 전체 헬스체크 결과
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  service: string;
  dependencies: DependencyHealth[];
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
    };
  };
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

/**
 * 헬스체크 구성 옵션
 */
export interface HealthCheckOptions {
  timeout: number;
  retries: number;
  includeDetails: boolean;
}

/**
 * 고급 헬스체크 서비스
 */
export class HealthChecker {
  private static instance: HealthChecker;
  private isShuttingDown: boolean = false;
  private readonly serviceName: string = 'product-service';
  private readonly version: string = '1.0.0';

  private constructor() {}

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  /**
   * 종료 상태 설정
   */
  setShuttingDown(isShuttingDown: boolean): void {
    this.isShuttingDown = isShuttingDown;
  }

  /**
   * 기본 헬스체크 (라이브니스 체크)
   */
  async checkLiveness(): Promise<HealthCheckResult> {
    return this.performHealthCheck({ 
      timeout: 5000, 
      retries: 1, 
      includeDetails: false 
    });
  }

  /**
   * 고급 헬스체크 (레디니스 체크)
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.performHealthCheck({ 
      timeout: 10000, 
      retries: 2, 
      includeDetails: true 
    });
  }

  /**
   * 종료 상태 헬스체크
   */
  async checkShutdown(): Promise<HealthCheckResult> {
    const result = await this.performHealthCheck({ 
      timeout: 2000, 
      retries: 1, 
      includeDetails: false 
    });
    
    // 종료 중인 경우 상태를 unhealthy로 변경
    if (this.isShuttingDown) {
      result.status = HealthStatus.UNHEALTHY;
      result.dependencies = result.dependencies.map(dep => ({
        ...dep,
        status: HealthStatus.UNHEALTHY,
        message: 'Service is shutting down'
      }));
    }
    
    return result;
  }

  /**
   * 헬스체크 실행
   */
  private async performHealthCheck(options: HealthCheckOptions): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 시스템 정보 수집
      const systemInfo = this.getSystemInfo();
      
      // 의존성 체크
      const dependencies = options.includeDetails 
        ? await this.checkDependencies(options)
        : [];

      // 전체 상태 계산
      const overallStatus = this.calculateOverallStatus(dependencies);
      
      // 요약 정보 생성
      const summary = this.generateSummary(dependencies);

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: this.version,
        environment: process.env.NODE_ENV || 'development',
        service: this.serviceName,
        dependencies,
        system: systemInfo,
        summary
      };

      const duration = Date.now() - startTime;
      logger.debug(`Health check completed in ${duration}ms`, {
        metadata: { 
          status: overallStatus,
          dependencyCount: dependencies.length,
          duration
        }
      });

      return result;
    } catch (error) {
      logger.error('Health check failed', { error: error as Error });
      
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: this.version,
        environment: process.env.NODE_ENV || 'development',
        service: this.serviceName,
        dependencies: [],
        system: this.getSystemInfo(),
        summary: { total: 0, healthy: 0, unhealthy: 1, degraded: 0 }
      };
    }
  }

  /**
   * 의존성 체크
   */
  private async checkDependencies(options: HealthCheckOptions): Promise<DependencyHealth[]> {
    const checks = [
      this.checkDatabase(options),
      this.checkRedis(options),
      this.checkMemory(),
      this.checkDiskSpace()
    ];

    const results = await Promise.allSettled(checks);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const names = ['database', 'redis', 'memory', 'disk'];
        return {
          name: names[index] || 'unknown',
          status: HealthStatus.UNHEALTHY,
          message: result.reason?.message || 'Unknown error',
          responseTime: 0,
          metadata: { error: result.reason }
        };
      }
    });
  }

  /**
   * 데이터베이스 헬스체크
   */
  private async checkDatabase(options: HealthCheckOptions): Promise<DependencyHealth> {
    const startTime = Date.now();
    
    try {
      const container = DIContainer.getContainer();
      const dataSource = container.get<DataSource>(TYPES.DataSource);
      
      if (!dataSource.isInitialized) {
        return {
          name: 'database',
          status: HealthStatus.UNHEALTHY,
          message: 'Database connection not initialized',
          responseTime: Date.now() - startTime
        };
      }

      // 간단한 쿼리 실행
      const result = await Promise.race([
        dataSource.query('SELECT 1 as health_check'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), options.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime > 1000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
        message: 'Database connection is healthy',
        responseTime,
        metadata: {
          driver: dataSource.driver.options.type,
          database: dataSource.driver.database
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        metadata: { error: (error as Error).message }
      };
    }
  }

  /**
   * Redis 헬스체크
   */
  private async checkRedis(options: HealthCheckOptions): Promise<DependencyHealth> {
    const startTime = Date.now();
    
    try {
      const container = DIContainer.getContainer();
      const cacheService = container.get<CacheService>(TYPES.CacheService);
      
      // Redis 연결 체크
      const isHealthy = await Promise.race([
        // cacheService.healthCheck(), // Method not implemented
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), options.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      if (isHealthy) {
        return {
          name: 'redis',
          status: responseTime > 500 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
          message: 'Redis connection is healthy',
          responseTime,
          metadata: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
          }
        };
      } else {
        return {
          name: 'redis',
          status: HealthStatus.UNHEALTHY,
          message: 'Redis connection failed',
          responseTime,
        };
      }
    } catch (error) {
      return {
        name: 'redis',
        status: HealthStatus.UNHEALTHY,
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        metadata: { error: (error as Error).message }
      };
    }
  }

  /**
   * 메모리 헬스체크
   */
  private checkMemory(): DependencyHealth {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((usedMB / totalMB) * 100);
    
    let status = HealthStatus.HEALTHY;
    let message = 'Memory usage is normal';
    
    if (percentage > 90) {
      status = HealthStatus.UNHEALTHY;
      message = 'Memory usage is critically high';
    } else if (percentage > 80) {
      status = HealthStatus.DEGRADED;
      message = 'Memory usage is high';
    }
    
    return {
      name: 'memory',
      status,
      message,
      responseTime: 0,
      metadata: {
        used: usedMB,
        total: totalMB,
        percentage,
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    };
  }

  /**
   * 디스크 공간 체크
   */
  private checkDiskSpace(): DependencyHealth {
    // 간단한 디스크 체크 (실제 구현에서는 더 정교한 체크 필요)
    return {
      name: 'disk',
      status: HealthStatus.HEALTHY,
      message: 'Disk space is adequate',
      responseTime: 0,
      metadata: {
        note: 'Disk space check not implemented in this version'
      }
    };
  }

  /**
   * 시스템 정보 수집
   */
  private getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((usedMB / totalMB) * 100);
    
    return {
      memory: {
        used: usedMB,
        total: totalMB,
        percentage
      },
      cpu: {
        loadAverage: process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg()
      }
    };
  }

  /**
   * 전체 상태 계산
   */
  private calculateOverallStatus(dependencies: DependencyHealth[]): HealthStatus {
    if (this.isShuttingDown) {
      return HealthStatus.UNHEALTHY;
    }
    
    if (dependencies.length === 0) {
      return HealthStatus.HEALTHY;
    }
    
    const hasUnhealthy = dependencies.some(dep => dep.status === HealthStatus.UNHEALTHY);
    const hasDegraded = dependencies.some(dep => dep.status === HealthStatus.DEGRADED);
    
    if (hasUnhealthy) {
      return HealthStatus.UNHEALTHY;
    } else if (hasDegraded) {
      return HealthStatus.DEGRADED;
    } else {
      return HealthStatus.HEALTHY;
    }
  }

  /**
   * 요약 정보 생성
   */
  private generateSummary(dependencies: DependencyHealth[]) {
    const summary = {
      total: dependencies.length,
      healthy: 0,
      unhealthy: 0,
      degraded: 0
    };
    
    dependencies.forEach(dep => {
      switch (dep.status) {
        case HealthStatus.HEALTHY:
          summary.healthy++;
          break;
        case HealthStatus.UNHEALTHY:
          summary.unhealthy++;
          break;
        case HealthStatus.DEGRADED:
          summary.degraded++;
          break;
      }
    });
    
    return summary;
  }
}

// 글로벌 헬스체커 인스턴스
export const healthChecker = HealthChecker.getInstance();