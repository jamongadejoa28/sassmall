// ========================================
// Shared Service Bootstrap Utility
// shared/src/utils/serviceBootstrap.ts
// ========================================

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { ServiceConfig, CORS_CONFIG, RATE_LIMIT_CONFIG } from '../config/serviceConfig';
import { createErrorHandler, setupProcessExitHandlers } from '../middleware/errorHandler';

// ========================================
// Bootstrap Configuration
// ========================================

export interface BootstrapOptions {
  enableCors?: boolean;
  enableSecurity?: boolean;
  enableCompression?: boolean;
  enableLogging?: boolean;
  enableRateLimit?: boolean;
  customMiddleware?: Array<(app: Express) => void>;
}

const DEFAULT_BOOTSTRAP_OPTIONS: BootstrapOptions = {
  enableCors: true,
  enableSecurity: true,
  enableCompression: true,
  enableLogging: true,
  enableRateLimit: true,
  customMiddleware: [],
};

// ========================================
// Service Bootstrap Class
// ========================================

export class ServiceBootstrap {
  private app: Express;
  private config: ServiceConfig;
  private options: BootstrapOptions;

  constructor(config: ServiceConfig, options: Partial<BootstrapOptions> = {}) {
    this.config = config;
    this.options = { ...DEFAULT_BOOTSTRAP_OPTIONS, ...options };
    this.app = express();
    
    this.setupMiddleware();
    this.setupHealthChecks();
    this.setupErrorHandling();
    this.setupProcessHandlers();
  }

  /**
   * Setup common middleware
   */
  private setupMiddleware(): void {
    // Security headers
    if (this.options.enableSecurity) {
      this.app.use(helmet({
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

    // CORS
    if (this.options.enableCors) {
      this.app.use(cors(CORS_CONFIG));
    }

    // Compression
    if (this.options.enableCompression) {
      this.app.use(compression());
    }

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (this.options.enableLogging) {
      const logFormat = process.env.NODE_ENV === 'development' ? 'combined' : 'common';
      this.app.use(morgan(logFormat));
    }

    // Rate limiting
    if (this.options.enableRateLimit) {
      this.app.use(rateLimit(RATE_LIMIT_CONFIG));
    }

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = uuidv4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // Custom middleware
    if (this.options.customMiddleware) {
      this.options.customMiddleware.forEach(middleware => {
        middleware(this.app);
      });
    }
  }

  /**
   * Setup health check endpoints
   */
  private setupHealthChecks(): void {
    // Basic health check
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

    // Liveness probe
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

    // Readiness probe
    this.app.get('/health/ready', (req, res) => {
      // Basic readiness checks
      const checks = {
        memory: process.memoryUsage().heapUsed < 1024 * 1024 * 512, // 512MB
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

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    const errorHandler = createErrorHandler(this.config.name);
    
    // 404 handler
    this.app.use(errorHandler.notFound);
    
    // Error handler
    this.app.use(errorHandler.handle);
  }

  /**
   * Setup process handlers
   */
  private setupProcessHandlers(): void {
    setupProcessExitHandlers(this.config.name);
  }

  /**
   * Add routes to the application
   */
  public addRoutes(path: string, router: express.Router): ServiceBootstrap {
    this.app.use(path, router);
    return this;
  }

  /**
   * Add custom middleware
   */
  public addMiddleware(middleware: express.RequestHandler): ServiceBootstrap {
    this.app.use(middleware);
    return this;
  }

  /**
   * Get the Express application
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Start the service
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.config.port, () => {
          console.log(`🚀 [${this.config.name}] Service started on port ${this.config.port}`);
          console.log(`📋 [${this.config.name}] Health check: http://localhost:${this.config.port}/health`);
          console.log(`🔗 [${this.config.name}] Base path: ${this.config.basePath}`);
          console.log(`🌍 [${this.config.name}] Environment: ${process.env.NODE_ENV || 'development'}`);
          resolve();
        });

        // Handle server errors
        server.on('error', (error: Error) => {
          console.error(`❌ [${this.config.name}] Server error:`, error);
          reject(error);
        });

        // Graceful shutdown
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

      } catch (error) {
        console.error(`❌ [${this.config.name}] Failed to start service:`, error);
        reject(error);
      }
    });
  }
}

// ========================================
// Factory Function
// ========================================

export function createService(
  config: ServiceConfig, 
  options?: Partial<BootstrapOptions>
): ServiceBootstrap {
  return new ServiceBootstrap(config, options);
}

// ========================================
// Express Request Type Extension
// ========================================

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// ========================================
// Utility Functions
// ========================================

export function logServiceInfo(serviceName: string): void {
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

export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}