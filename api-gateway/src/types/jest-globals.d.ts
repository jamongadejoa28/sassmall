// api-gateway/src/types/jest-globals.d.ts

// Jest 글로벌 함수들의 타입 정의
declare global {
  const describe: jest.Describe;
  const it: jest.It;
  const test: jest.It;
  const expect: jest.Expect;
  const beforeAll: jest.Lifecycle;
  const afterAll: jest.Lifecycle;
  const beforeEach: jest.Lifecycle;
  const afterEach: jest.Lifecycle;

  namespace jest {
    interface Describe {
      (name: string, fn: () => void): void;
      only: Describe;
      skip: Describe;
      each: (
        cases: readonly unknown[][]
      ) => (name: string, fn: (...args: unknown[]) => void) => void;
    }

    interface It {
      (
        name: string,
        fn?: (done?: DoneCallback) => void | Promise<unknown>,
        timeout?: number
      ): void;
      only: It;
      skip: It;
      todo: (name: string) => void;
      each: (
        cases: readonly unknown[][]
      ) => (name: string, fn: (...args: unknown[]) => void) => void;
    }

    interface Lifecycle {
      (
        fn: (done?: DoneCallback) => void | Promise<unknown>,
        timeout?: number
      ): void;
    }

    type DoneCallback = (reason?: string | Error) => void;

    interface Expect {
      <T = unknown>(actual: T): jest.Matchers<void, T>;
      assertions(num: number): void;
      hasAssertions(): void;
      any(classType: unknown): unknown;
      anything(): unknown;
      arrayContaining<E = unknown>(arr: E[]): unknown;
      objectContaining(obj: Record<string, unknown>): unknown;
      stringContaining(str: string): unknown;
      stringMatching(str: string | RegExp): unknown;
    }

    interface Matchers<R, T = Record<string, never>> {
      toBe(expected: T): R;
      toEqual(expected: T): R;
      toStrictEqual(expected: T): R;
      toBeNull(): R;
      toBeUndefined(): R;
      toBeDefined(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toBeGreaterThan(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeLessThan(expected: number): R;
      toBeLessThanOrEqual(expected: number): R;
      toBeCloseTo(expected: number, precision?: number): R;
      toContain(expected: unknown): R;
      toContainEqual(expected: unknown): R;
      toHaveLength(expected: number): R;
      toMatch(expected: string | RegExp): R;
      toMatchObject(expected: Record<string, unknown>): R;
      toThrow(expected?: string | RegExp | Error): R;
      toThrowError(expected?: string | RegExp | Error): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...expected: unknown[]): R;
      toHaveBeenLastCalledWith(...expected: unknown[]): R;
      toHaveBeenNthCalledWith(nthCall: number, ...expected: unknown[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(expected: number): R;
      toHaveReturnedWith(expected: unknown): R;
      toHaveLastReturnedWith(expected: unknown): R;
      toHaveNthReturnedWith(nthCall: number, expected: unknown): R;
      resolves: Matchers<Promise<R>, T>;
      rejects: Matchers<Promise<R>, T>;
      not: Matchers<R, T>;
    }
  }
}

export {};
