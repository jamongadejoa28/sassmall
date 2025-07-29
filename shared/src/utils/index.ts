// shared/src/utils/index.ts

import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User, TokenPair, JwtPayload } from "../types";

// ========================================
// JWT 토큰 관련 유틸리티
// ========================================

// JWT 만료 시간을 초 단위로 변환하는 헬퍼 함수
const parseExpirationTime = (timeStr: string): number => {
  const unit = timeStr.slice(-1);
  const value = parseInt(timeStr.slice(0, -1), 10);

  switch (unit) {
    case "s":
      return value; // 초
    case "m":
      return value * 60; // 분
    case "h":
      return value * 60 * 60; // 시간
    case "d":
      return value * 24 * 60 * 60; // 일
    default:
      return parseInt(timeStr, 10) || 900; // 기본 15분 (900초)
  }
};

export const generateTokenPair = (user: User): TokenPair => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    jti: uuidv4(), // JWT ID 추가로 고유성 보장
  };

  // JWT 시크릿 확인
  const jwtSecret = getEnvVar("JWT_SECRET");
  const refreshSecret = getEnvVar("JWT_REFRESH_SECRET");

  // 만료 시간을 초 단위로 변환
  const accessTokenExpiresIn = parseExpirationTime(
    getEnvVar("JWT_EXPIRES_IN", "15m")
  );
  const refreshTokenExpiresIn = parseExpirationTime(
    getEnvVar("JWT_REFRESH_EXPIRES_IN", "7d")
  );

  try {
    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = jwt.sign(
      { userId: user.id, jti: uuidv4() }, // 리프레시 토큰에도 고유 ID 추가
      refreshSecret,
      { expiresIn: refreshTokenExpiresIn }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(
      "Token generation failed: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, getEnvVar("JWT_SECRET")) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, getEnvVar("JWT_REFRESH_SECRET")) as {
      userId: string;
    };
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};

// ========================================
// ID 생성 유틸리티
// ========================================

export const generateRequestId = (): string => uuidv4();
export const generateUserId = (): string => uuidv4();
export const generateProductId = (): string => uuidv4();
export const generateOrderId = (): string => uuidv4();

// ========================================
// 날짜/시간 유틸리티
// ========================================

export const getCurrentTimestamp = (): string => new Date().toISOString();

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

// ========================================
// 문자열 유틸리티
// ========================================

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

export const truncate = (text: string, length: number): string => {
  return text.length > length ? text.substring(0, length) + "..." : text;
};

export const formatCurrency = (
  amount: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

// ========================================
// 유효성 검사 유틸리티
// ========================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // 최소 8자, 대문자, 소문자, 숫자, 특수문자 포함
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// ========================================
// 배열/객체 유틸리티
// ========================================

export const paginate = <T>(
  items: T[],
  page: number,
  limit: number
): { data: T[]; total: number; totalPages: number } => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = items.slice(startIndex, endIndex);
  const total = items.length;
  const totalPages = Math.ceil(total / limit);

  return { data, total, totalPages };
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ========================================
// 로깅 유틸리티
// ========================================

export interface Logger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export const createLogger = (serviceName: string): Logger => {
  const log = (level: string, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: serviceName,
      message,
      ...(meta && { meta }),
    };

    // 환경에 따른 로그 출력 방식 결정
    if (process.env.NODE_ENV === "production") {
      // 프로덕션 환경에서는 JSON 형태로 출력
      console.log(JSON.stringify(logEntry));
    } else {
      // 개발 환경에서는 읽기 쉬운 형태로 출력
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
      console.log(
        `[${timestamp}] ${level.toUpperCase()} [${serviceName}] ${message}${metaStr}`
      );
    }
  };

  return {
    info: (message: string, meta?: any) => log("info", message, meta),
    warn: (message: string, meta?: any) => log("warn", message, meta),
    error: (message: string, meta?: any) => log("error", message, meta),
    debug: (message: string, meta?: any) => {
      if (process.env.NODE_ENV === "development") {
        log("debug", message, meta);
      }
    },
  };
};

// ========================================
// 보안 유틸리티
// ========================================

export const maskEmail = (email: string): string => {
  const [username, domain] = email.split("@");
  const maskedUsername = username.slice(0, 2) + "*".repeat(username.length - 2);
  return `${maskedUsername}@${domain}`;
};

export const maskPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  const masked =
    cleaned.slice(0, 3) + "*".repeat(cleaned.length - 6) + cleaned.slice(-3);
  return masked;
};

// ========================================
// 환경 변수 유틸리티
// ========================================

export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
};

export const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  const numberValue = value ? parseInt(value, 10) : defaultValue!;
  if (isNaN(numberValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return numberValue;
};

export const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  if (!value) return defaultValue!;
  return value.toLowerCase() === "true" || value === "1";
};
