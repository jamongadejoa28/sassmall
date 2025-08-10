import { ValidationChain, ValidationError } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
export declare const commonValidations: {
    email: (field?: string) => {
        isEmail: {
            errorMessage: string;
        };
        normalizeEmail: boolean;
    };
    password: (minLength?: number) => {
        isLength: {
            options: {
                min: number;
            };
            errorMessage: string;
        };
        matches: {
            options: RegExp;
            errorMessage: string;
        };
    };
    required: (fieldName: string) => {
        notEmpty: {
            errorMessage: string;
        };
        trim: boolean;
    };
    numeric: (fieldName: string, min?: number, max?: number) => any;
    stringLength: (fieldName: string, min?: number, max?: number) => {
        isLength: {
            options: any;
            errorMessage: string;
        };
    };
    uuid: (fieldName: string) => {
        isUUID: {
            errorMessage: string;
        };
    };
    boolean: (fieldName: string) => {
        isBoolean: {
            errorMessage: string;
        };
    };
    date: (fieldName: string) => {
        isISO8601: {
            errorMessage: string;
        };
    };
    array: (fieldName: string, minLength?: number, maxLength?: number) => any;
};
export declare function handleValidationErrors(): (req: Request, res: Response, next: NextFunction) => void;
export declare function runValidations(validations: ValidationChain[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sanitizers: {
    stripTags: (value: string) => string;
    escapeSql: (value: string) => string;
    normalizeWhitespace: (value: string) => string;
    normalizeEmail: (email: string) => string;
    normalizePhoneNumber: (phone: string) => string;
};
export declare const businessValidators: {
    isStrongPassword: (password: string) => boolean;
    isKoreanMobileNumber: (phone: string) => boolean;
    isKoreanBusinessNumber: (businessNumber: string) => boolean;
    isPriceValid: (price: number, min?: number, max?: number) => boolean;
    isDiscountPercentageValid: (percentage: number) => boolean;
    isQuantityValid: (quantity: number) => boolean;
};
export declare function createValidationSchema(): Record<string, any>;
export declare function formatValidationErrors(errors: ValidationError[]): Record<string, string[]>;
//# sourceMappingURL=validation.d.ts.map