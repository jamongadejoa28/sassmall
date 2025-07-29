// ========================================
// 재시도 관리자 - 복구 로직 강화
// src/infrastructure/resilience/RetryManager.ts
// ========================================

import { logger } from '../logging/Logger';

/**
 * 재시도 전략 옵션
 */
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 재시도 결과
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * 재시도 관리자
 */
export class RetryManager {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: Error) => {
      // 기본적으로 네트워크 오류, 타임아웃, 일시적 오류에 대해 재시도
      const retryableErrors = [
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'TIMEOUT_ERROR',
        'NETWORK_ERROR',
        'DATABASE_ERROR'
      ];
      
      return retryableErrors.some(code => 
        error.message.includes(code) || 
        (error as any).code === code
      );
    }
  };

  /**
   * 재시도 실행
   */
  static async execute<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = { ...RetryManager.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt} attempts`, {
            metadata: { attempts: attempt, duration }
          });
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration
        };
      } catch (error) {
        lastError = error as Error;
        
        // 마지막 시도인 경우 또는 재시도 조건을 만족하지 않는 경우
        if (attempt === config.maxAttempts || (config.retryCondition && !config.retryCondition(error as Error))) {
          break;
        }
        
        // 재시도 콜백 호출
        if (config.onRetry) {
          config.onRetry(error as Error, attempt);
        }
        
        logger.warn(`Operation failed, retrying... (${attempt}/${config.maxAttempts})`, {
          error: error as Error,
          metadata: { attempt, maxAttempts: config.maxAttempts }
        });
        
        // 지수 백오프 지연
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        await RetryManager.sleep(delay);
      }
    }
    
    const duration = Date.now() - startTime;
    logger.error(`Operation failed after ${config.maxAttempts} attempts`, {
      error: lastError,
      metadata: { 
        attempts: config.maxAttempts,
        totalDuration: duration
      }
    });
    
    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDuration: duration
    };
  }

  /**
   * 데이터베이스 연결 재시도
   */
  static async executeForDatabase<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const result = await RetryManager.execute(operation, {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: (error) => {
        // 데이터베이스 관련 재시도 가능 에러들
        const dbRetryableErrors = [
          'ECONNRESET',
          'ECONNREFUSED',
          'ENOTFOUND',
          'DATABASE_ERROR',
          'connection terminated',
          'connection closed'
        ];
        
        return dbRetryableErrors.some(code => 
          error.message.toLowerCase().includes(code.toLowerCase()) ||
          (error as any).code === code
        );
      },
      onRetry: (error, attempt) => {
        logger.warn(`Database operation "${operationName}" failed, retrying...`, {
          error,
          metadata: { attempt, operation: operationName }
        });
      }
    });
    
    if (!result.success) {
      throw result.error || new Error('Operation failed');
    }
    
    return result.result!;
  }

  /**
   * 캐시 연결 재시도
   */
  static async executeForCache<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const result = await RetryManager.execute(operation, {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 2000,
      backoffFactor: 2,
      retryCondition: (error) => {
        // 캐시 관련 재시도 가능 에러들
        const cacheRetryableErrors = [
          'ECONNRESET',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'CACHE_ERROR',
          'redis connection lost'
        ];
        
        return cacheRetryableErrors.some(code => 
          error.message.toLowerCase().includes(code.toLowerCase()) ||
          (error as any).code === code
        );
      },
      onRetry: (error, attempt) => {
        logger.warn(`Cache operation "${operationName}" failed, retrying...`, {
          error,
          metadata: { attempt, operation: operationName }
        });
      }
    });
    
    if (!result.success) {
      throw result.error || new Error('Operation failed');
    }
    
    return result.result!;
  }

  /**
   * 외부 서비스 호출 재시도
   */
  static async executeForExternalService<T>(
    operation: () => Promise<T>,
    serviceName: string,
    operationName: string
  ): Promise<T> {
    const result = await RetryManager.execute(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 1.5,
      retryCondition: (error) => {
        // HTTP 상태 코드 기반 재시도 조건
        const status = (error as any).status || (error as any).statusCode;
        
        if (status) {
          // 5xx 서버 에러나 일부 4xx 에러에 대해서만 재시도
          return status >= 500 || status === 408 || status === 429;
        }
        
        // 네트워크 관련 에러에 대해서도 재시도
        const networkErrors = [
          'ECONNRESET',
          'ECONNREFUSED',
          'ENOTFOUND',
          'ETIMEDOUT',
          'EXTERNAL_SERVICE_ERROR'
        ];
        
        return networkErrors.some(code => 
          error.message.includes(code) || (error as any).code === code
        );
      },
      onRetry: (error, attempt) => {
        logger.warn(`External service "${serviceName}" operation "${operationName}" failed, retrying...`, {
          error,
          metadata: { 
            attempt, 
            service: serviceName,
            operation: operationName 
          }
        });
      }
    });
    
    if (!result.success) {
      throw result.error || new Error('Operation failed');
    }
    
    return result.result!;
  }

  /**
   * 지연 유틸리티
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 서킷 브레이커 패턴 (간단한 구현)
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly name: string,
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker "${this.name}" transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker "${this.name}" is OPEN`);
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`Circuit breaker "${this.name}" transitioning to CLOSED`);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error(`Circuit breaker "${this.name}" transitioning to OPEN after ${this.failures} failures`);
    }
  }

  getState(): string {
    return this.state;
  }
}