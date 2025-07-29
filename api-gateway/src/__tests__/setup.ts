// api-gateway/src/__tests__/setup.ts

// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Jest 타임아웃 설정 (10초)
jest.setTimeout(10000);

// 전역 테스트 설정
beforeAll(async () => {
  // 테스트 시작 전 초기화 작업
  // eslint-disable-next-line no-console
  console.log('🚀 Test environment initialized');
});

afterAll(async () => {
  // 테스트 종료 후 정리 작업
  // eslint-disable-next-line no-console
  console.log('✅ Test cleanup completed');
});

// 각 테스트 전후 정리
beforeEach(() => {
  // 각 테스트 전 초기화
});

afterEach(() => {
  // 각 테스트 후 정리
  jest.clearAllMocks();
});

// 콘솔 경고 숨기기 (테스트 환경에서)
// eslint-disable-next-line no-console
const originalWarn = console.warn;
beforeAll(() => {
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  console.warn = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      args[0].includes('deprecated')
    ) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn = originalWarn;
});

// Jest에서 빈 테스트 파일 에러를 방지하기 위한 더미 테스트 추가
describe('Test Environment Setup', () => {
  it('should properly configure test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
  });
});
