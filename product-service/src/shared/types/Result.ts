export class Result<T> {
  public readonly isSuccess: boolean;
  private readonly _value?: T;
  private readonly _error?: string;

  private constructor(isSuccess: boolean, value?: T, error?: string) {
    if (isSuccess && error) {
      throw new Error("Cannot create a successful result with an error message.");
    }
    if (!isSuccess && !error) {
      throw new Error("Cannot create a failed result without an error message.");
    }

    this.isSuccess = isSuccess;
    this._value = value;
    this._error = error;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Cannot get value from a failed result.");
    }
    return this._value!;
  }

  public getError(): string {
    if (this.isSuccess) {
      throw new Error("Cannot get error from a successful result.");
    }
    return this._error!;
  }
}
