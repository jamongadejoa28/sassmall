"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.VERSION = exports.CORS_CONFIG = exports.RATE_LIMIT_CONFIG = exports.REDIS_DEFAULTS = exports.DATABASE_DEFAULTS = exports.DEFAULT_HEALTH_CHECK = exports.getAllServiceUrls = exports.getServiceUrl = exports.getServiceConfig = exports.SERVICE_REGISTRY = exports.OrderStatus = exports.UserRole = exports.ErrorCode = exports.HTTP_STATUS = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return types_1.HTTP_STATUS; } });
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return types_1.ErrorCode; } });
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return types_1.UserRole; } });
Object.defineProperty(exports, "OrderStatus", { enumerable: true, get: function () { return types_1.OrderStatus; } });
var serviceConfig_1 = require("./config/serviceConfig");
Object.defineProperty(exports, "SERVICE_REGISTRY", { enumerable: true, get: function () { return serviceConfig_1.SERVICE_REGISTRY; } });
Object.defineProperty(exports, "getServiceConfig", { enumerable: true, get: function () { return serviceConfig_1.getServiceConfig; } });
Object.defineProperty(exports, "getServiceUrl", { enumerable: true, get: function () { return serviceConfig_1.getServiceUrl; } });
Object.defineProperty(exports, "getAllServiceUrls", { enumerable: true, get: function () { return serviceConfig_1.getAllServiceUrls; } });
Object.defineProperty(exports, "DEFAULT_HEALTH_CHECK", { enumerable: true, get: function () { return serviceConfig_1.DEFAULT_HEALTH_CHECK; } });
Object.defineProperty(exports, "DATABASE_DEFAULTS", { enumerable: true, get: function () { return serviceConfig_1.DATABASE_DEFAULTS; } });
Object.defineProperty(exports, "REDIS_DEFAULTS", { enumerable: true, get: function () { return serviceConfig_1.REDIS_DEFAULTS; } });
Object.defineProperty(exports, "RATE_LIMIT_CONFIG", { enumerable: true, get: function () { return serviceConfig_1.RATE_LIMIT_CONFIG; } });
Object.defineProperty(exports, "CORS_CONFIG", { enumerable: true, get: function () { return serviceConfig_1.CORS_CONFIG; } });
__exportStar(require("./utils"), exports);
__exportStar(require("./middleware/authMiddleware"), exports);
__exportStar(require("./middleware/errorHandler"), exports);
__exportStar(require("./utils/validation"), exports);
__exportStar(require("./utils/serviceBootstrap"), exports);
__exportStar(require("./events"), exports);
exports.VERSION = '1.0.0';
exports.DEFAULT_CONFIG = {
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000,
    RATE_LIMIT_MAX: 100,
};
//# sourceMappingURL=index.js.map