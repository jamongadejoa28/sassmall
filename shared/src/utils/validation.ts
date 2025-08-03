// ========================================
// Shared Validation Utilities
// shared/src/utils/validation.ts
// ========================================

import { ValidationChain, validationResult, ValidationError } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationAppError } from '../middleware/errorHandler';

// ========================================
// Common Validation Rules
// ========================================

export const commonValidations = {
  // Email validation
  email: (field: string = 'email') => ({
    isEmail: {
      errorMessage: '유효한 이메일 주소를 입력해주세요',
    },
    normalizeEmail: true,
  }),

  // Password validation
  password: (minLength: number = 8) => ({
    isLength: {
      options: { min: minLength },
      errorMessage: `비밀번호는 최소 ${minLength}자 이상이어야 합니다`,
    },
    matches: {
      options: /^(?=.*[a-zA-Z])(?=.*\d)/,
      errorMessage: '비밀번호는 영문자와 숫자를 포함해야 합니다',
    },
  }),

  // Required field validation
  required: (fieldName: string) => ({
    notEmpty: {
      errorMessage: `${fieldName}은(는) 필수 항목입니다`,
    },
    trim: true,
  }),

  // Numeric validation
  numeric: (fieldName: string, min?: number, max?: number) => {
    const rules: any = {
      isNumeric: {
        errorMessage: `${fieldName}은(는) 숫자여야 합니다`,
      },
    };

    if (min !== undefined) {
      rules.isFloat = {
        options: { min },
        errorMessage: `${fieldName}은(는) ${min} 이상이어야 합니다`,
      };
    }

    if (max !== undefined) {
      rules.isFloat = {
        ...rules.isFloat,
        options: { ...rules.isFloat?.options, max },
        errorMessage: `${fieldName}은(는) ${min || 0}에서 ${max} 사이여야 합니다`,
      };
    }

    return rules;
  },

  // String length validation
  stringLength: (fieldName: string, min?: number, max?: number) => {
    const options: any = {};
    if (min !== undefined) options.min = min;
    if (max !== undefined) options.max = max;

    let errorMessage = `${fieldName}의 길이가 올바르지 않습니다`;
    if (min && max) {
      errorMessage = `${fieldName}은(는) ${min}자에서 ${max}자 사이여야 합니다`;
    } else if (min) {
      errorMessage = `${fieldName}은(는) 최소 ${min}자 이상이어야 합니다`;
    } else if (max) {
      errorMessage = `${fieldName}은(는) 최대 ${max}자 이하여야 합니다`;
    }

    return {
      isLength: {
        options,
        errorMessage,
      },
    };
  },

  // UUID validation
  uuid: (fieldName: string) => ({
    isUUID: {
      errorMessage: `${fieldName}의 형식이 올바르지 않습니다`,
    },
  }),

  // Boolean validation
  boolean: (fieldName: string) => ({
    isBoolean: {
      errorMessage: `${fieldName}은(는) true 또는 false 값이어야 합니다`,
    },
  }),

  // Date validation
  date: (fieldName: string) => ({
    isISO8601: {
      errorMessage: `${fieldName}은(는) 유효한 날짜 형식이어야 합니다 (YYYY-MM-DD)`,
    },
  }),

  // Array validation
  array: (fieldName: string, minLength?: number, maxLength?: number) => {
    const rules: any = {
      isArray: {
        errorMessage: `${fieldName}은(는) 배열이어야 합니다`,
      },
    };

    if (minLength !== undefined || maxLength !== undefined) {
      const options: any = {};
      if (minLength !== undefined) options.min = minLength;
      if (maxLength !== undefined) options.max = maxLength;

      rules.isLength = {
        options,
        errorMessage: `${fieldName}의 항목 수가 올바르지 않습니다`,
      };
    }

    return rules;
  },
};

// ========================================
// Validation Middleware
// ========================================

/**
 * Express-validator 결과를 확인하고 에러 처리하는 미들웨어
 */
export function handleValidationErrors() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      const error = new ValidationAppError(
        '입력 데이터가 올바르지 않습니다',
        validationErrors
      );
      throw error;
    }

    next();
  };
}

/**
 * 커스텀 validation chain을 실행하는 미들웨어
 */
export function runValidations(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      const error = new ValidationAppError(
        '입력 데이터가 올바르지 않습니다',
        validationErrors
      );
      throw error;
    }

    next();
  };
}

// ========================================
// Data Sanitization
// ========================================

export const sanitizers = {
  /**
   * XSS 공격 방지를 위한 HTML 태그 제거
   */
  stripTags: (value: string): string => {
    return value.replace(/<[^>]*>/g, '');
  },

  /**
   * SQL Injection 방지를 위한 특수문자 이스케이프
   */
  escapeSql: (value: string): string => {
    return value.replace(/['";\\]/g, '\\$&');
  },

  /**
   * 공백 문자 정리
   */
  normalizeWhitespace: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  },

  /**
   * 이메일 정규화
   */
  normalizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },

  /**
   * 전화번호 정규화 (한국 형식)
   */
  normalizePhoneNumber: (phone: string): string => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as Korean phone number
    if (cleaned.length === 11 && cleaned.startsWith('010')) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    return cleaned;
  },
};

// ========================================
// Business Logic Validators
// ========================================

export const businessValidators = {
  /**
   * 비밀번호 강도 검증
   */
  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  },

  /**
   * 한국 휴대폰 번호 검증
   */
  isKoreanMobileNumber: (phone: string): boolean => {
    const pattern = /^010-?\d{4}-?\d{4}$/;
    return pattern.test(phone.replace(/\s/g, ''));
  },

  /**
   * 사업자 등록번호 검증
   */
  isKoreanBusinessNumber: (businessNumber: string): boolean => {
    const cleaned = businessNumber.replace(/[-\s]/g, '');
    if (cleaned.length !== 10) return false;

    // Business number validation algorithm
    const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * weights[i];
    }

    const checkDigit = (sum + parseInt(cleaned[8]) * 5 / 10) % 10;
    return checkDigit === parseInt(cleaned[9]);
  },

  /**
   * 가격 범위 검증
   */
  isPriceValid: (price: number, min: number = 0, max: number = 10000000): boolean => {
    return price >= min && price <= max && price % 1 === 0; // 정수 확인
  },

  /**
   * 할인율 검증
   */
  isDiscountPercentageValid: (percentage: number): boolean => {
    return percentage >= 0 && percentage <= 100;
  },

  /**
   * 재고 수량 검증
   */
  isQuantityValid: (quantity: number): boolean => {
    return Number.isInteger(quantity) && quantity >= 0;
  },
};

// ========================================
// Utility Functions
// ========================================

export function createValidationSchema(): Record<string, any> {
  return {};
}

export function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  errors.forEach(error => {
    const field = error.type === 'field' ? error.path : 'general';
    if (!formatted[field]) {
      formatted[field] = [];
    }
    formatted[field].push(error.msg);
  });

  return formatted;
}