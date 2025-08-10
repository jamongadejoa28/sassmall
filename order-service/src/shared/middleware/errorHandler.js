"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.SharedErrorHandler = exports.InternalServerError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationAppError = exports.AppError = void 0;
exports.createErrorHandler = createErrorHandler;
exports.createValidationError = createValidationError;
exports.setupProcessExitHandlers = setupProcessExitHandlers;
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationAppError extends AppError {
    constructor(message, validationErrors) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationAppError';
        this.validationErrors = validationErrors;
    }
}
exports.ValidationAppError = ValidationAppError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND_ERROR');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR');
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
class SharedErrorHandler {
    constructor(serviceName = 'unknown-service') {
        this.handle = (error, req, res, next) => {
            let statusCode = 500;
            let message = 'Internal Server Error';
            let code = 'INTERNAL_ERROR';
            let details = undefined;
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
            else if (error.name === 'JsonWebTokenError') {
                statusCode = 401;
                message = 'Invalid token';
                code = 'INVALID_TOKEN';
            }
            else if (error.name === 'TokenExpiredError') {
                statusCode = 401;
                message = 'Token expired';
                code = 'TOKEN_EXPIRED';
            }
            else if (error.name === 'ValidationError') {
                statusCode = 400;
                message = error.message;
                code = 'VALIDATION_ERROR';
            }
            else if (error.name === 'CastError') {
                statusCode = 400;
                message = 'Invalid ID format';
                code = 'INVALID_ID';
            }
            this.logError(error, req, statusCode);
            const errorResponse = {
                success: false,
                message,
                error: {
                    code,
                    details: details || undefined,
                },
                statusCode,
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            };
            if (this.isDevelopment) {
                errorResponse.stack = error.stack;
            }
            res.status(statusCode).json(errorResponse);
        };
        this.notFound = (req, res) => {
            const error = new NotFoundError(`경로를 찾을 수 없습니다: ${req.originalUrl}`);
            this.logError(error, req, 404);
            const errorResponse = {
                success: false,
                message: error.message,
                error: {
                    code: error.code,
                },
                statusCode: error.statusCode,
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            };
            res.status(error.statusCode).json(errorResponse);
        };
        this.serviceName = serviceName;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }
    logError(error, req, statusCode) {
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
        }
        else {
            console.warn('[Error Handler] Client Error:', errorInfo);
        }
    }
}
exports.SharedErrorHandler = SharedErrorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
function createErrorHandler(serviceName) {
    return new SharedErrorHandler(serviceName);
}
function createValidationError(message, validationErrors) {
    return new ValidationAppError(message, validationErrors);
}
function setupProcessExitHandlers(serviceName = 'unknown-service') {
    const gracefulShutdown = (signal) => {
        console.log(`[${serviceName}] Received ${signal}. Starting graceful shutdown...`);
        process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
        console.error(`[${serviceName}] Uncaught Exception:`, {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error(`[${serviceName}] Unhandled Rejection:`, { reason, promise });
        process.exit(1);
    });
}
//# sourceMappingURL=errorHandler.js.map