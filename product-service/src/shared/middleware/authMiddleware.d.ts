import { Request, Response, NextFunction } from 'express';
export interface JWTPayload {
    userId?: string;
    sub?: string;
    email: string;
    role: 'customer' | 'admin';
    type?: string;
    iss?: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: 'customer' | 'admin';
}
export interface AuthMiddlewareConfig {
    jwtSecret: string;
    tokenHeader: string;
    tokenPrefix: string;
    ignoreExpiration?: boolean;
}
export declare class SharedAuthMiddleware {
    private config;
    constructor(config?: Partial<AuthMiddlewareConfig>);
    required: (req: Request, res: Response, next: NextFunction) => void;
    optional: (req: Request, res: Response, next: NextFunction) => void;
    requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
    private extractToken;
    private verifyToken;
    private handleAuthError;
}
export declare function createAuthMiddleware(config?: Partial<AuthMiddlewareConfig>): SharedAuthMiddleware;
export declare function createDevelopmentAuthMiddleware(): SharedAuthMiddleware;
export declare function createProductionAuthMiddleware(): SharedAuthMiddleware;
export declare const authMiddleware: {
    required: (req: Request, res: Response, next: NextFunction) => void;
    optional: (req: Request, res: Response, next: NextFunction) => void;
    requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
};
export declare function hasRole(user: AuthenticatedUser | undefined, role: string): boolean;
export declare function isAdmin(user: AuthenticatedUser | undefined): boolean;
export declare function createMockAuthMiddleware(mockUser: AuthenticatedUser): {
    required: (req: Request, res: Response, next: NextFunction) => void;
    optional: (req: Request, res: Response, next: NextFunction) => void;
    requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
};
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
//# sourceMappingURL=authMiddleware.d.ts.map