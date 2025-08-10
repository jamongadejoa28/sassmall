import express, { Express } from 'express';
import { ServiceConfig } from '../config/serviceConfig';
export interface BootstrapOptions {
    enableCors?: boolean;
    enableSecurity?: boolean;
    enableCompression?: boolean;
    enableLogging?: boolean;
    enableRateLimit?: boolean;
    customMiddleware?: Array<(app: Express) => void>;
}
export declare class ServiceBootstrap {
    private app;
    private config;
    private options;
    constructor(config: ServiceConfig, options?: Partial<BootstrapOptions>);
    private setupMiddleware;
    private setupHealthChecks;
    private setupErrorHandling;
    private setupProcessHandlers;
    addRoutes(path: string, router: express.Router): ServiceBootstrap;
    addMiddleware(middleware: express.RequestHandler): ServiceBootstrap;
    getApp(): Express;
    start(): Promise<void>;
}
export declare function createService(config: ServiceConfig, options?: Partial<BootstrapOptions>): ServiceBootstrap;
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}
export declare function logServiceInfo(serviceName: string): void;
export declare function validateEnvironment(requiredVars: string[]): void;
//# sourceMappingURL=serviceBootstrap.d.ts.map