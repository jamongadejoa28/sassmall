// src/shared/types/Result.ts

export class Result<T> {
  public readonly success: boolean;
  public readonly data?: T;
  public readonly error?: Error;

  private constructor(success: boolean, data?: T, error?: Error) {
    this.success = success;

    // exactOptionalPropertyTypes: true 대응
    // 성공 시에만 data 할당, 실패 시에만 error 할당
    if (success && data !== undefined) {
      (this as any).data = data;
    }
    if (!success && error !== undefined) {
      (this as any).error = error;
    }
  }

  static ok<T>(data?: T): Result<T> {
    return new Result<T>(true, data);
  }

  static fail<T>(error: Error): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  isFailure(): boolean {
    return !this.success;
  }

  isSuccess(): boolean {
    return this.success;
  }

  getValue(): T {
    if (!this.success || this.data === undefined) {
      throw new Error("Cannot get value from failed result");
    }
    return this.data;
  }

  getError(): Error {
    if (this.success || this.error === undefined) {
      throw new Error("Cannot get error from successful result");
    }
    return this.error;
  }
}
