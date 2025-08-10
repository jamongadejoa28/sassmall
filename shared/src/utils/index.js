"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvBoolean = exports.getEnvNumber = exports.getEnvVar = exports.maskPhoneNumber = exports.maskEmail = exports.createLogger = exports.shuffleArray = exports.paginate = exports.isValidPhoneNumber = exports.isValidPassword = exports.isValidEmail = exports.formatCurrency = exports.truncate = exports.slugify = exports.addHours = exports.addDays = exports.getCurrentTimestamp = exports.generateOrderId = exports.generateProductId = exports.generateUserId = exports.generateRequestId = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokenPair = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const parseExpirationTime = (timeStr) => {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1), 10);
    switch (unit) {
        case "s":
            return value;
        case "m":
            return value * 60;
        case "h":
            return value * 60 * 60;
        case "d":
            return value * 24 * 60 * 60;
        default:
            return parseInt(timeStr, 10) || 900;
    }
};
const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        jti: (0, uuid_1.v4)(),
    };
    const jwtSecret = (0, exports.getEnvVar)("JWT_SECRET");
    const refreshSecret = (0, exports.getEnvVar)("JWT_REFRESH_SECRET");
    const accessTokenExpiresIn = parseExpirationTime((0, exports.getEnvVar)("JWT_EXPIRES_IN", "15m"));
    const refreshTokenExpiresIn = parseExpirationTime((0, exports.getEnvVar)("JWT_REFRESH_EXPIRES_IN", "7d"));
    try {
        const accessToken = jsonwebtoken_1.default.sign(payload, jwtSecret, {
            expiresIn: accessTokenExpiresIn,
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, jti: (0, uuid_1.v4)() }, refreshSecret, { expiresIn: refreshTokenExpiresIn });
        return { accessToken, refreshToken };
    }
    catch (error) {
        throw new Error("Token generation failed: " +
            (error instanceof Error ? error.message : "Unknown error"));
    }
};
exports.generateTokenPair = generateTokenPair;
const verifyAccessToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, (0, exports.getEnvVar)("JWT_SECRET"));
        return decoded;
    }
    catch (error) {
        throw new Error("Invalid or expired access token");
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, (0, exports.getEnvVar)("JWT_REFRESH_SECRET"));
        return decoded;
    }
    catch (error) {
        throw new Error("Invalid or expired refresh token");
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const generateRequestId = () => (0, uuid_1.v4)();
exports.generateRequestId = generateRequestId;
const generateUserId = () => (0, uuid_1.v4)();
exports.generateUserId = generateUserId;
const generateProductId = () => (0, uuid_1.v4)();
exports.generateProductId = generateProductId;
const generateOrderId = () => (0, uuid_1.v4)();
exports.generateOrderId = generateOrderId;
const getCurrentTimestamp = () => new Date().toISOString();
exports.getCurrentTimestamp = getCurrentTimestamp;
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
exports.addDays = addDays;
const addHours = (date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};
exports.addHours = addHours;
const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
};
exports.slugify = slugify;
const truncate = (text, length) => {
    return text.length > length ? text.substring(0, length) + "..." : text;
};
exports.truncate = truncate;
const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.isValidPassword = isValidPassword;
const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
};
exports.isValidPhoneNumber = isValidPhoneNumber;
const paginate = (items, page, limit) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = items.slice(startIndex, endIndex);
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    return { data, total, totalPages };
};
exports.paginate = paginate;
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffleArray = shuffleArray;
const createLogger = (serviceName) => {
    const log = (level, message, meta) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            service: serviceName,
            message,
            ...(meta && { meta }),
        };
        if (process.env.NODE_ENV === "production") {
            console.log(JSON.stringify(logEntry));
        }
        else {
            const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
            console.log(`[${timestamp}] ${level.toUpperCase()} [${serviceName}] ${message}${metaStr}`);
        }
    };
    return {
        info: (message, meta) => log("info", message, meta),
        warn: (message, meta) => log("warn", message, meta),
        error: (message, meta) => log("error", message, meta),
        debug: (message, meta) => {
            if (process.env.NODE_ENV === "development") {
                log("debug", message, meta);
            }
        },
    };
};
exports.createLogger = createLogger;
const maskEmail = (email) => {
    const [username, domain] = email.split("@");
    const maskedUsername = username.slice(0, 2) + "*".repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
};
exports.maskEmail = maskEmail;
const maskPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    const masked = cleaned.slice(0, 3) + "*".repeat(cleaned.length - 6) + cleaned.slice(-3);
    return masked;
};
exports.maskPhoneNumber = maskPhoneNumber;
const getEnvVar = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value || defaultValue;
};
exports.getEnvVar = getEnvVar;
const getEnvNumber = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required`);
    }
    const numberValue = value ? parseInt(value, 10) : defaultValue;
    if (isNaN(numberValue)) {
        throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return numberValue;
};
exports.getEnvNumber = getEnvNumber;
const getEnvBoolean = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required`);
    }
    if (!value)
        return defaultValue;
    return value.toLowerCase() === "true" || value === "1";
};
exports.getEnvBoolean = getEnvBoolean;
//# sourceMappingURL=index.js.map