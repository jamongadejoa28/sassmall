// ========================================
// Request Validation Middleware - Framework Layer (단순화)
// cart-service/src/frameworks/middleware/validateRequest.ts
// ========================================

import { Request, Response, NextFunction } from "express";

/**
 * ValidateRequest Middleware - 기본적인 HTTP 요청 검증
 *
 * 책임 (Clean Architecture 준수):
 * 1. HTTP 요청의 기본 형식 검증 (타입, 필수 여부)
 * 2. 명백히 잘못된 요청 조기 차단
 * 3. 보안 취약점 방지 (기본적인 인풋 sanitization)
 *
 * 비즈니스 로직 검증은 Use Case Layer에서 담당
 * 취업 포트폴리오 목적에 맞게 단순화
 */

// ========================================
// 기본 검증 규칙 (단순화)
// ========================================

export interface BasicValidationRule {
  required?: boolean;
  type?: "string" | "number";
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface ValidationSchema {
  [key: string]: BasicValidationRule;
}

// ========================================
// 검증 클래스 (단순화)
// ========================================

class RequestValidator {
  /**
   * 바디 검증 미들웨어
   */
  body(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors = this.validateObject(req.body || {}, schema);

      if (errors.length > 0) {
        // 첫 번째 에러 메시지를 메인 메시지로 사용
        const mainError = errors[0] || "요청 형식이 올바르지 않습니다";
        
        res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: mainError,
          code: "INVALID_REQUEST_FORMAT",
          details: errors,
        });
        return;
      }

      next();
    };
  }

  /**
   * 파라미터 검증 미들웨어
   */
  params(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors = this.validateObject(req.params || {}, schema);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: "요청 파라미터 형식이 올바르지 않습니다",
          code: "INVALID_PARAMS_FORMAT",
          details: errors,
        });
        return;
      }

      next();
    };
  }

  /**
   * 기본적인 객체 검증 (단순화)
   */
  private validateObject(data: any, schema: ValidationSchema): string[] {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];

      // 1. 필수 필드 검증
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`${field}는 필수 항목입니다`);
        continue;
      }

      // 값이 없으면 추가 검증 건너뛰기
      if (value === undefined || value === null) {
        continue;
      }

      // 2. 기본 타입 검증
      if (rule.type === "string" && typeof value !== "string") {
        errors.push(`${field}는 문자열이어야 합니다`);
        continue;
      }

      if (rule.type === "number") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`${field}는 숫자여야 합니다`);
          continue;
        }
        // 숫자로 변환 (문자열 "123" → 123)
        data[field] = numValue;
      }

      // 3. 기본 범위 검증
      if (rule.type === "string" && typeof value === "string") {
        if (rule.minLength && value.length < rule.minLength) {
          // productId 필드의 경우 한국어로 표시
          if (field === "productId") {
            errors.push(`상품 ID는 필수입니다`);
          } else {
            errors.push(`${field}는 최소 ${rule.minLength}자 이상이어야 합니다`);
          }
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field}는 최대 ${rule.maxLength}자까지 가능합니다`);
        }
      }

      if (rule.type === "number" && typeof data[field] === "number") {
        if (rule.min !== undefined && data[field] < rule.min) {
          // quantity 필드의 경우 한국어로 표시
          if (field === "quantity") {
            errors.push(`수량은 ${rule.min} 이상이어야 합니다`);
          } else {
            errors.push(`${field}는 ${rule.min} 이상이어야 합니다`);
          }
        }
        if (rule.max !== undefined && data[field] > rule.max) {
          errors.push(`${field}는 ${rule.max} 이하여야 합니다`);
        }
      }
    }

    return errors;
  }
}

// ========================================
// 미들웨어 인스턴스
// ========================================

const validator = new RequestValidator();

export const validateRequest = {
  body: validator.body.bind(validator),
  params: validator.params.bind(validator),
};

// ========================================
// 장바구니 서비스 전용 검증 스키마 (단순화)
// ========================================

export const CartValidationSchemas = {
  // 장바구니 추가 - cart-service API 스펙에 맞춤
  addToCart: {
    productId: {
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: 100,
    },
    quantity: {
      required: true,
      type: "number" as const,
      min: 1,
      max: 999,
    },
  },

  // 수량 변경
  updateQuantity: {
    quantity: {
      required: true,
      type: "number" as const,
      min: 1,
      max: 999,
    },
  },

  // 상품 ID 파라미터
  productIdParam: {
    productId: {
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: 100,
    },
  },
};

// ========================================
// 헬퍼 함수 (단순화)
// ========================================

/**
 * 기본적인 문자열 정리 (XSS 방지)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // 기본적인 HTML 태그 제거
    .slice(0, 1000); // 최대 길이 제한
}

/**
 * 숫자 형식 검증 및 변환
 */
export function parsePositiveInteger(input: any): number | null {
  const num = Number(input);

  if (isNaN(num) || !Number.isInteger(num) || num < 1) {
    return null;
  }

  return num;
}
