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
        cases: readonly any[][]
      ) => (name: string, fn: (...args: any[]) => void) => void;
    }

    interface It {
      (
        name: string,
        fn?: (done?: DoneCallback) => void | Promise<any>,
        timeout?: number
      ): void;
      only: It;
      skip: It;
      todo: (name: string) => void;
      each: (
        cases: readonly any[][]
      ) => (name: string, fn: (...args: any[]) => void) => void;
    }

    interface Lifecycle {
      (
        fn: (done?: DoneCallback) => void | Promise<any>,
        timeout?: number
      ): void;
    }

    type DoneCallback = (reason?: string | Error) => void;

    interface Expect {
      <T = any>(actual: T): jest.Matchers<void, T>;
      assertions(num: number): void;
      hasAssertions(): void;
      any(classType: any): any;
      anything(): any;
      arrayContaining<E = any>(arr: E[]): any;
      objectContaining(obj: Record<string, any>): any;
      stringContaining(str: string): any;
      stringMatching(str: string | RegExp): any;
    }

    interface Matchers<R, T = {}> {
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
      toContain(expected: any): R;
      toContainEqual(expected: any): R;
      toHaveLength(expected: number): R;
      toMatch(expected: string | RegExp): R;
      toMatchObject(expected: Record<string, any>): R;
      toThrow(expected?: string | RegExp | Error): R;
      toThrowError(expected?: string | RegExp | Error): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...expected: any[]): R;
      toHaveBeenLastCalledWith(...expected: any[]): R;
      toHaveBeenNthCalledWith(nthCall: number, ...expected: any[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(expected: number): R;
      toHaveReturnedWith(expected: any): R;
      toHaveLastReturnedWith(expected: any): R;
      toHaveNthReturnedWith(nthCall: number, expected: any): R;
      resolves: Matchers<Promise<R>, T>;
      rejects: Matchers<Promise<R>, T>;
      not: Matchers<R, T>;
    }
  }
}

export {};
