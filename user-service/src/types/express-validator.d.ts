declare module 'express-validator' {
  import { RequestHandler } from 'express';
  
  export function body(field?: string): ValidationChain;
  export function param(field: string): ValidationChain;
  export function validationResult(req: any): any;
  
  export interface ValidationChain extends RequestHandler {
    custom: (fn: any) => ValidationChain;
    if: (fn: any) => ValidationChain;
    trim: () => ValidationChain;
    notEmpty: () => ValidationChain;
    withMessage: (message: string) => ValidationChain;
    isLength: (options: any) => ValidationChain;
    matches: (pattern: RegExp) => ValidationChain;
    isEmail: () => ValidationChain;
    normalizeEmail: () => ValidationChain;
    optional: () => ValidationChain;
    isIn: (values: string[]) => ValidationChain;
    isUUID: () => ValidationChain;
  }
}