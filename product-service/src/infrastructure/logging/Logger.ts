// ========================================
// 구조화된 로깅 시스템 - Winston 기반
// src/infrastructure/logging/Logger.ts
// ========================================

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'winston';

/**
 * 로그 레벨 정의
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

/**
 * 로그 컨텍스트 인터페이스
 */
export interface LogContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  service?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * 구조화된 로거 클래스
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private readonly serviceName: string;

  constructor(serviceName: string = 'product-service') {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(serviceName?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(serviceName);
    }
    return Logger.instance;
  }

  /**
   * Winston 로거 생성
   */
  private createLogger(): winston.Logger {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug');

    // 커스텀 포맷 정의
    const customFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.json(),
      format.printf(({ timestamp, level, message, service, requestId, userId, error, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          service: service || this.serviceName,
          message,
          ...(requestId ? { requestId } : {}),
          ...(userId ? { userId } : {}),
          ...(error ? { 
            error: {
              message: (error as Error).message,
              stack: (error as Error).stack,
              name: (error as Error).name
            }
          } : {}),
          ...meta
        };

        return JSON.stringify(logEntry);
      })
    );

    // 트랜스포트 설정
    const transports: winston.transport[] = [];

    // 콘솔 출력 (개발 환경에서는 컬러 적용)
    if (env === 'development') {
      transports.push(
        new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.timestamp({ format: 'HH:mm:ss' }),
            format.printf(({ timestamp, level, message, service, requestId, userId, error, ...meta }) => {
              let logMessage = `[${timestamp}] ${level} [${service || this.serviceName}]`;
              
              if (requestId) logMessage += ` [${requestId}]`;
              if (userId) logMessage += ` [user:${userId}]`;
              
              logMessage += ` ${message}`;
              
              if (error) {
                logMessage += `\n${(error as Error).stack || (error as Error).message}`;
              }
              
              if (Object.keys(meta).length > 0) {
                logMessage += `\n${JSON.stringify(meta, null, 2)}`;
              }
              
              return logMessage;
            })
          )
        })
      );
    } else {
      // 운영 환경에서는 JSON 포맷
      transports.push(
        new winston.transports.Console({
          format: customFormat
        })
      );
    }

    // 파일 로그 (일별 로테이션)
    const logDir = process.env.LOG_DIR || './logs';
    
    // 에러 로그 파일
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '30d',
        maxSize: '100m',
        format: customFormat,
        zippedArchive: true
      })
    );

    // 일반 로그 파일
    transports.push(
      new DailyRotateFile({
        filename: `${logDir}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: '7d',
        maxSize: '100m',
        format: customFormat,
        zippedArchive: true
      })
    );

    return winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false,
      // 처리되지 않은 예외 캐치
      handleExceptions: true,
      handleRejections: true
    });
  }

  /**
   * 에러 로그
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * 경고 로그
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 정보 로그
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * HTTP 로그
   */
  http(message: string, context?: LogContext): void {
    this.log(LogLevel.HTTP, message, context);
  }

  /**
   * 디버그 로그
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 공통 로그 메소드
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logData = {
      message,
      service: this.serviceName,
      ...context
    };

    this.logger.log(level, logData);
  }

  /**
   * 요청 로그 (Express 미들웨어용)
   */
  logRequest(req: any, res: any, duration: number): void {
    const context: LogContext = {
      requestId: req.requestId,
      userId: req.user?.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      metadata: {
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection.remoteAddress,
        body: req.method !== 'GET' ? req.body : undefined
      }
    };

    if (res.statusCode >= 400) {
      this.error(`${req.method} ${req.originalUrl} - ${res.statusCode}`, context);
    } else {
      this.http(`${req.method} ${req.originalUrl} - ${res.statusCode}`, context);
    }
  }

  /**
   * 데이터베이스 쿼리 로그
   */
  logQuery(query: string, params?: any[], duration?: number, context?: LogContext): void {
    this.debug('Database query executed', {
      ...context,
      metadata: {
        query,
        params,
        duration
      }
    });
  }

  /**
   * 비즈니스 로직 로그
   */
  logBusiness(event: string, data?: any, context?: LogContext): void {
    this.info(`Business event: ${event}`, {
      ...context,
      metadata: { event, data }
    });
  }

  /**
   * 퍼포먼스 로그
   */
  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      ...context,
      metadata: { operation, duration }
    });
  }

  /**
   * 보안 로그
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high', context?: LogContext): void {
    const level = severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security event: ${event}`, {
      ...context,
      metadata: { event, severity, securityEvent: true }
    });
  }

  /**
   * 로거 종료
   */
  close(): void {
    this.logger.close();
  }
}

// 기본 로거 인스턴스 export
export const logger = Logger.getInstance();