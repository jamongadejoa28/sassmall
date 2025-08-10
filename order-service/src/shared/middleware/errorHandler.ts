// ========================================
// Shared Error Handler Middleware
// shared/src/middleware/errorHandler.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';

// ========================================
// Custom Error Classes
// ========================================

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  public validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationAppError';
    this.validationErrors = validationErrors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalServerError';
  }
}

// ========================================
// Error Response Interface
// ========================================

interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
  statusCode: number;
  timestamp: string;
  requestId: string;
  stack?: string;
}

// ========================================
// Error Handler Class
// ========================================

export class SharedErrorHandler {
  private serviceName: string;
  private isDevelopment: boolean;

  constructor(serviceName: string = 'unknown-service') {
    this.serviceName = serviceName;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Main error handler middleware
   */
  handle = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    // Handle different error types
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
      code = error.code || 'UNKNOWN_ERROR';

      if (error instanceof ValidationAppError) {
        details = {
          validationErrors: error.validationErrors.map(err => ({
            field: err.type === 'field' ? err.path : undefined,
            message: err.msg,
            value: err.type === 'field' ? err.value : undefined,
          })),
        };
      }
    }
    // JWT errors
    else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
      code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
      code = 'TOKEN_EXPIRED';
    }
    // Validation errors
    else if (error.name === 'ValidationError') {
      statusCode = 400;
      message = error.message;
      code = 'VALIDATION_ERROR';
    }
    // Database errors
    else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
      code = 'INVALID_ID';
    }

    // Log error
    this.logError(error, req, statusCode);

    // Create error response
    const errorResponse: ErrorResponse = {
      success: false,
      message,
      error: {
        code,
        details: details || undefined,
      },
      statusCode,
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    };

    // Include stack trace in development
    if (this.isDevelopment) {
      errorResponse.stack = error.stack;
    }

    res.status(statusCode).json(errorResponse);
  };

  /**
   * 404 Not Found handler
   */
  notFound = (req: Request, res: Response): void => {
    const error = new NotFoundError(`경로를 찾을 수 없습니다: ${req.originalUrl}`);

    this.logError(error, req, 404);

    const errorResponse: ErrorResponse = {
      success: false,
      message: error.message,
      error: {
        code: error.code!,
      },
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    };

    res.status(error.statusCode).json(errorResponse);
  };

  /**
   * Log error information
   */
  private logError(error: Error, req: Request, statusCode: number): void {
    const errorInfo = {
      service: this.serviceName,
      message: error.message,
      stack: error.stack,
      statusCode,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id'] || 'unknown',
    };

    if (statusCode >= 500) {
      console.error('[Error Handler] Server Error:', errorInfo);
    } else {
      console.warn('[Error Handler] Client Error:', errorInfo);
    }
  }
}

// ========================================
// Async Handler Wrapper
// ========================================

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ========================================
// Factory Functions
// ========================================

export function createErrorHandler(serviceName: string) {
  return new SharedErrorHandler(serviceName);
}

export function createValidationError(
  message: string,
  validationErrors: ValidationError[]
): ValidationAppError {
  return new ValidationAppError(message, validationErrors);
}

// ========================================
// Process Exit Handlers
// ========================================

export function setupProcessExitHandlers(serviceName: string = 'unknown-service') {
  const gracefulShutdown = (signal: string) => {
    console.log(`[${serviceName}] Received ${signal}. Starting graceful shutdown...`);
    process.exit(0);
  };

  // Signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Uncaught exception handler
  process.on('uncaughtException', (error: Error) => {
    console.error(`[${serviceName}] Uncaught Exception:`, {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Unhandled promise rejection handler
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error(`[${serviceName}] Unhandled Rejection:`, { reason, promise });
    process.exit(1);
  });
}