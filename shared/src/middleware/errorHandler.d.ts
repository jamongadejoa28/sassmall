import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;
    constructor(message: string, statusCode: number, code?: string);
}
export declare class ValidationAppError extends AppError {
    validationErrors: ValidationError[];
    constructor(message: string, validationErrors: ValidationError[]);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
export declare class SharedErrorHandler {
    private serviceName;
    private isDevelopment;
    constructor(serviceName?: string);
    handle: (error: Error, req: Request, res: Response, next: NextFunction) => void;
    notFound: (req: Request, res: Response) => void;
    private logError;
}
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>) => (req: Request, res: Response, next: NextFunction) => void;
export declare function createErrorHandler(serviceName: string): SharedErrorHandler;
export declare function createValidationError(message: string, validationErrors: ValidationError[]): ValidationAppError;
export declare function setupProcessExitHandlers(serviceName?: string): void;
//# sourceMappingURL=errorHandler.d.ts.map