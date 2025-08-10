import { User, TokenPair, JwtPayload } from "../types";
export declare const generateTokenPair: (user: User) => TokenPair;
export declare const verifyAccessToken: (token: string) => JwtPayload;
export declare const verifyRefreshToken: (token: string) => {
    userId: string;
};
export declare const generateRequestId: () => string;
export declare const generateUserId: () => string;
export declare const generateProductId: () => string;
export declare const generateOrderId: () => string;
export declare const getCurrentTimestamp: () => string;
export declare const addDays: (date: Date, days: number) => Date;
export declare const addHours: (date: Date, hours: number) => Date;
export declare const slugify: (text: string) => string;
export declare const truncate: (text: string, length: number) => string;
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidPassword: (password: string) => boolean;
export declare const isValidPhoneNumber: (phone: string) => boolean;
export declare const paginate: <T>(items: T[], page: number, limit: number) => {
    data: T[];
    total: number;
    totalPages: number;
};
export declare const shuffleArray: <T>(array: T[]) => T[];
export interface Logger {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}
export declare const createLogger: (serviceName: string) => Logger;
export declare const maskEmail: (email: string) => string;
export declare const maskPhoneNumber: (phone: string) => string;
export declare const getEnvVar: (key: string, defaultValue?: string) => string;
export declare const getEnvNumber: (key: string, defaultValue?: number) => number;
export declare const getEnvBoolean: (key: string, defaultValue?: boolean) => boolean;
//# sourceMappingURL=index.d.ts.map