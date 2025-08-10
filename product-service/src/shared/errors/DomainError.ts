// Domain Error
export class DomainError extends Error {
  public code: string;
  public statusCode: number;
  
  constructor(message: string, code: string = 'DOMAIN_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
  }

  static invalidInput(message: string = '잘못된 입력입니다'): DomainError {
    return new DomainError(message, 'INVALID_INPUT', 400);
  }

  static productNotFound(message: string = '상품을 찾을 수 없습니다'): DomainError {
    return new DomainError(message, 'PRODUCT_NOT_FOUND', 404);
  }

  static categoryNotFound(message: string = '카테고리를 찾을 수 없습니다'): DomainError {
    return new DomainError(message, 'CATEGORY_NOT_FOUND', 404);
  }

  static categoryInactive(message: string = '비활성화된 카테고리입니다'): DomainError {
    return new DomainError(message, 'CATEGORY_INACTIVE', 400);
  }

  static productInactive(message: string = '비활성화된 상품입니다'): DomainError {
    return new DomainError(message, 'PRODUCT_INACTIVE', 400);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string = '리소스') {
    super(`${resource}를 찾을 수 없습니다.`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}