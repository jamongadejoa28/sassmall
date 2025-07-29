// cart-service/src/utils/errorUtils.ts
// ========================================

/**
 * 타입 안전한 에러 메시지 추출 유틸리티
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "알 수 없는 오류가 발생했습니다";
}

/**
 * 에러 타입 확인 유틸리티
 */
export function isErrorInstance(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 비즈니스 로직 에러인지 확인
 */
export function isBusinessError(error: unknown): boolean {
  return error instanceof Error && error.name.includes("Error");
}

/**
 * 로깅용 에러 정보 추출
 */
export function getErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: getErrorMessage(error),
  };
}
