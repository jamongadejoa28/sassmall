// api-gateway/src/server.ts

import app from './app';

const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
};
const PORT = process.env.PORT || 3001;

// 서버 시작
const startServer = async (): Promise<void> => {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`🚀 API Gateway server is running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    });

    // Graceful shutdown 처리
    const gracefulShutdown = (signal: string) => {
      logger.info(`📡 Received ${signal}. Starting graceful shutdown...`, {
        signal,
      });

      server.close(err => {
        if (err) {
          logger.error('Error during server shutdown', {
            error: err.message,
            stack: err.stack,
          });
          process.exit(1);
        }

        logger.info('✅ Server closed successfully');
        process.exit(0);
      });
    };

    // 시그널 핸들러 등록
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 처리되지 않은 예외 핸들러
    process.on('uncaughtException', (error: Error) => {
      logger.error('💥 Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      process.exit(1);
    });

    // 처리되지 않은 Promise 거부 핸들러
    process.on(
      'unhandledRejection',
      (reason: unknown, promise: Promise<unknown>) => {
        logger.error('💥 Unhandled Rejection', {
          reason: reason instanceof Error ? reason.message : String(reason),
          promise: promise.toString(),
          timestamp: new Date().toISOString(),
        });
        process.exit(1);
      }
    );
  } catch (error) {
    logger.error('❌ Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

// 서버 시작
startServer();
