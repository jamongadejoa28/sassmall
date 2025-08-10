export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // 프로토타입 체인 유지 (TypeScript에서 Error 상속시 필요)
    Object.setPrototypeOf(this, DomainError.prototype);
  }

  static productNotFound(): DomainError {
    return new DomainError("상품을 찾을 수 없습니다", "PRODUCT_NOT_FOUND", 404);
  }

  static productInactive(): DomainError {
    return new DomainError(
      "상품이 비활성화 상태입니다",
      "PRODUCT_INACTIVE",
      400
    );
  }

  static categoryNotFound(): DomainError {
    return new DomainError(
      "상품의 카테고리를 찾을 수 없습니다",
      "CATEGORY_NOT_FOUND",
      404
    );
  }

  static categoryInactive(): DomainError {
    return new DomainError(
      "상품의 카테고리가 비활성화 상태입니다",
      "CATEGORY_INACTIVE",
      400
    );
  }

  static invalidInput(message: string = "잘못된 입력값입니다"): DomainError {
    return new DomainError(message, "INVALID_INPUT", 400);
  }
}
