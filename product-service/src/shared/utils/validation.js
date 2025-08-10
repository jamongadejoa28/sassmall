"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessValidators = exports.sanitizers = exports.commonValidations = void 0;
exports.handleValidationErrors = handleValidationErrors;
exports.runValidations = runValidations;
exports.createValidationSchema = createValidationSchema;
exports.formatValidationErrors = formatValidationErrors;
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
exports.commonValidations = {
    email: (field = 'email') => ({
        isEmail: {
            errorMessage: '유효한 이메일 주소를 입력해주세요',
        },
        normalizeEmail: true,
    }),
    password: (minLength = 8) => ({
        isLength: {
            options: { min: minLength },
            errorMessage: `비밀번호는 최소 ${minLength}자 이상이어야 합니다`,
        },
        matches: {
            options: /^(?=.*[a-zA-Z])(?=.*\d)/,
            errorMessage: '비밀번호는 영문자와 숫자를 포함해야 합니다',
        },
    }),
    required: (fieldName) => ({
        notEmpty: {
            errorMessage: `${fieldName}은(는) 필수 항목입니다`,
        },
        trim: true,
    }),
    numeric: (fieldName, min, max) => {
        const rules = {
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
    stringLength: (fieldName, min, max) => {
        const options = {};
        if (min !== undefined)
            options.min = min;
        if (max !== undefined)
            options.max = max;
        let errorMessage = `${fieldName}의 길이가 올바르지 않습니다`;
        if (min && max) {
            errorMessage = `${fieldName}은(는) ${min}자에서 ${max}자 사이여야 합니다`;
        }
        else if (min) {
            errorMessage = `${fieldName}은(는) 최소 ${min}자 이상이어야 합니다`;
        }
        else if (max) {
            errorMessage = `${fieldName}은(는) 최대 ${max}자 이하여야 합니다`;
        }
        return {
            isLength: {
                options,
                errorMessage,
            },
        };
    },
    uuid: (fieldName) => ({
        isUUID: {
            errorMessage: `${fieldName}의 형식이 올바르지 않습니다`,
        },
    }),
    boolean: (fieldName) => ({
        isBoolean: {
            errorMessage: `${fieldName}은(는) true 또는 false 값이어야 합니다`,
        },
    }),
    date: (fieldName) => ({
        isISO8601: {
            errorMessage: `${fieldName}은(는) 유효한 날짜 형식이어야 합니다 (YYYY-MM-DD)`,
        },
    }),
    array: (fieldName, minLength, maxLength) => {
        const rules = {
            isArray: {
                errorMessage: `${fieldName}은(는) 배열이어야 합니다`,
            },
        };
        if (minLength !== undefined || maxLength !== undefined) {
            const options = {};
            if (minLength !== undefined)
                options.min = minLength;
            if (maxLength !== undefined)
                options.max = maxLength;
            rules.isLength = {
                options,
                errorMessage: `${fieldName}의 항목 수가 올바르지 않습니다`,
            };
        }
        return rules;
    },
};
function handleValidationErrors() {
    return (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const validationErrors = errors.array();
            const error = new errorHandler_1.ValidationAppError('입력 데이터가 올바르지 않습니다', validationErrors);
            throw error;
        }
        next();
    };
}
function runValidations(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const validationErrors = errors.array();
            const error = new errorHandler_1.ValidationAppError('입력 데이터가 올바르지 않습니다', validationErrors);
            throw error;
        }
        next();
    };
}
exports.sanitizers = {
    stripTags: (value) => {
        return value.replace(/<[^>]*>/g, '');
    },
    escapeSql: (value) => {
        return value.replace(/['";\\]/g, '\\$&');
    },
    normalizeWhitespace: (value) => {
        return value.trim().replace(/\s+/g, ' ');
    },
    normalizeEmail: (email) => {
        return email.toLowerCase().trim();
    },
    normalizePhoneNumber: (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('010')) {
            return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        return cleaned;
    },
};
exports.businessValidators = {
    isStrongPassword: (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return (password.length >= minLength &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSpecialChar);
    },
    isKoreanMobileNumber: (phone) => {
        const pattern = /^010-?\d{4}-?\d{4}$/;
        return pattern.test(phone.replace(/\s/g, ''));
    },
    isKoreanBusinessNumber: (businessNumber) => {
        const cleaned = businessNumber.replace(/[-\s]/g, '');
        if (cleaned.length !== 10)
            return false;
        const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned[i]) * weights[i];
        }
        const checkDigit = (sum + parseInt(cleaned[8]) * 5 / 10) % 10;
        return checkDigit === parseInt(cleaned[9]);
    },
    isPriceValid: (price, min = 0, max = 10000000) => {
        return price >= min && price <= max && price % 1 === 0;
    },
    isDiscountPercentageValid: (percentage) => {
        return percentage >= 0 && percentage <= 100;
    },
    isQuantityValid: (quantity) => {
        return Number.isInteger(quantity) && quantity >= 0;
    },
};
function createValidationSchema() {
    return {};
}
function formatValidationErrors(errors) {
    const formatted = {};
    errors.forEach(error => {
        const field = error.type === 'field' ? error.path : 'general';
        if (!formatted[field]) {
            formatted[field] = [];
        }
        formatted[field].push(error.msg);
    });
    return formatted;
}
//# sourceMappingURL=validation.js.map