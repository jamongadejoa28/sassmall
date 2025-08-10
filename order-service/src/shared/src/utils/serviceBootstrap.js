"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceBootstrap = void 0;
exports.createService = createService;
exports.logServiceInfo = logServiceInfo;
exports.validateEnvironment = validateEnvironment;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const uuid_1 = require("uuid");
const serviceConfig_1 = require("../config/serviceConfig");
const errorHandler_1 = require("../middleware/errorHandler");
const DEFAULT_BOOTSTRAP_OPTIONS = {
    enableCors: true,
    enableSecurity: true,
    enableCompression: true,
    enableLogging: true,
    enableRateLimit: true,
    customMiddleware: [],
};
class ServiceBootstrap {
    constructor(config, options = {}) {
        this.config = config;
        this.options = { ...DEFAULT_BOOTSTRAP_OPTIONS, ...options };
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupHealthChecks();
        this.setupErrorHandling();
        this.setupProcessHandlers();
    }
    setupMiddleware() {
        if (this.options.enableSecurity) {
            this.app.use((0, helmet_1.default)({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        scriptSrc: ["'self'"],
                        imgSrc: ["'self'", 'data:', 'https:'],
                    },
                },
                crossOriginEmbedderPolicy: false,
                frameguard: { action: 'deny' },
                xContentTypeOptions: true,
            }));
        }
        if (this.options.enableCors) {
            this.app.use((0, cors_1.default)(serviceConfig_1.CORS_CONFIG));
        }
        if (this.options.enableCompression) {
            this.app.use((0, compression_1.default)());
        }
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        if (this.options.enableLogging) {
            const logFormat = process.env.NODE_ENV === 'development' ? 'combined' : 'common';
            this.app.use((0, morgan_1.default)(logFormat));
        }
        if (this.options.enableRateLimit) {
            this.app.use((0, express_rate_limit_1.default)(serviceConfig_1.RATE_LIMIT_CONFIG));
        }
        this.app.use((req, res, next) => {
            req.requestId = (0, uuid_1.v4)();
            res.setHeader('X-Request-ID', req.requestId);
            next();
        });
        if (this.options.customMiddleware) {
            this.options.customMiddleware.forEach(middleware => {
                middleware(this.app);
            });
        }
    }
    setupHealthChecks() {
        this.app.get('/health', (req, res) => {
            const healthData = {
                status: 'healthy',
                service: this.config.name,
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString(),
            };
            res.json({
                success: true,
                data: healthData,
                message: `${this.config.name} is healthy`,
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            });
        });
        this.app.get('/health/live', (req, res) => {
            res.json({
                success: true,
                data: {
                    alive: true,
                    service: this.config.name,
                    timestamp: new Date().toISOString(),
                    pid: process.pid,
                },
                message: 'Service is alive',
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            });
        });
        this.app.get('/health/ready', (req, res) => {
            const checks = {
                memory: process.memoryUsage().heapUsed < 1024 * 1024 * 512,
                uptime: process.uptime() > 0,
                environment: !!process.env.NODE_ENV,
            };
            const ready = Object.values(checks).every(Boolean);
            res.json({
                success: true,
                data: {
                    ready,
                    service: this.config.name,
                    checks,
                },
                message: ready ? 'Service is ready' : 'Service is not ready',
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            });
        });
    }
    setupErrorHandling() {
        const errorHandler = (0, errorHandler_1.createErrorHandler)(this.config.name);
        this.app.use(errorHandler.notFound);
        this.app.use(errorHandler.handle);
    }
    setupProcessHandlers() {
        (0, errorHandler_1.setupProcessExitHandlers)(this.config.name);
    }
    addRoutes(path, router) {
        this.app.use(path, router);
        return this;
    }
    addMiddleware(middleware) {
        this.app.use(middleware);
        return this;
    }
    getApp() {
        return this.app;
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                const server = this.app.listen(this.config.port, () => {
                    console.log(`🚀 [${this.config.name}] Service started on port ${this.config.port}`);
                    console.log(`📋 [${this.config.name}] Health check: http://localhost:${this.config.port}/health`);
                    console.log(`🔗 [${this.config.name}] Base path: ${this.config.basePath}`);
                    console.log(`🌍 [${this.config.name}] Environment: ${process.env.NODE_ENV || 'development'}`);
                    resolve();
                });
                server.on('error', (error) => {
                    console.error(`❌ [${this.config.name}] Server error:`, error);
                    reject(error);
                });
                process.on('SIGTERM', () => {
                    console.log(`📥 [${this.config.name}] Received SIGTERM. Starting graceful shutdown...`);
                    server.close(() => {
                        console.log(`✅ [${this.config.name}] Server closed gracefully`);
                        process.exit(0);
                    });
                });
                process.on('SIGINT', () => {
                    console.log(`📥 [${this.config.name}] Received SIGINT. Starting graceful shutdown...`);
                    server.close(() => {
                        console.log(`✅ [${this.config.name}] Server closed gracefully`);
                        process.exit(0);
                    });
                });
            }
            catch (error) {
                console.error(`❌ [${this.config.name}] Failed to start service:`, error);
                reject(error);
            }
        });
    }
}
exports.ServiceBootstrap = ServiceBootstrap;
function createService(config, options) {
    return new ServiceBootstrap(config, options);
}
function logServiceInfo(serviceName) {
    console.log(`\n🔧 [${serviceName}] Service Configuration:`);
    console.log(`   - Node.js Version: ${process.version}`);
    console.log(`   - Platform: ${process.platform}`);
    console.log(`   - Architecture: ${process.arch}`);
    console.log(`   - Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
    console.log(`   - Process ID: ${process.pid}`);
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`   - Current Time: ${new Date().toISOString()}\n`);
}
function validateEnvironment(requiredVars) {
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}
//# sourceMappingURL=serviceBootstrap.js.map