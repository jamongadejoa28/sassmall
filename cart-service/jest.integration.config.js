// ========================================
// Jest 통합 테스트 설정
// cart-service/jest.integration.config.js
// ========================================

const { pathsToModuleNameMapper } = require("ts-jest");
const { moduleNameMapper } = require("./jest.config"); // jest.config에서 moduleNameMapper를 가져옵니다.

module.exports = {
  // 기본 Jest 설정 확장
  preset: "ts-jest",
  testEnvironment: "node",

  // 프로젝트 루트 디렉토리
  rootDir: ".",

  // 통합 테스트 파일 패턴
  testMatch: [
    "<rootDir>/src/__tests__/integration/**/*.test.ts",
    "<rootDir>/src/__tests__/integration/**/*.spec.ts",
  ],

  // 제외할 파일/디렉토리
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "<rootDir>/src/__tests__/unit/",
    "<rootDir>/src/.*/__tests__/",
  ],

  // TypeScript 설정
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        isolatedModules: true,
      },
    ],
  },

  // 모듈 경로 매핑 (TypeScript paths와 동일)
  // jest.config.js에서 가져온 moduleNameMapper를 사용합니다.
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
    "@entities/(.*)": "<rootDir>/src/entities/$1",
    "@usecases/(.*)": "<rootDir>/src/usecases/$1",
    "@adapters/(.*)": "<rootDir>/src/adapters/$1",
    "@frameworks/(.*)": "<rootDir>/src/frameworks/$1",
    "@infrastructure/(.*)": "<rootDir>/src/infrastructure/$1",
    "@test-utils/(.*)": "<rootDir>/src/test-utils/$1",
    // 만약 jest.config.js의 moduleNameMapper를 확장하거나 병합해야 한다면,
    // 아래와 같이 스프레드 연산자를 사용할 수 있습니다.
    // ...moduleNameMapper,
    // "@test-utils/(.*)": "<rootDir>/src/test-utils/$1",
  },

  // 테스트 설정 파일
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup/integration-setup.ts"],

  // 글로벌 설정
  globalSetup: "<rootDir>/src/__tests__/setup/global-setup.ts",
  globalTeardown: "<rootDir>/src/__tests__/setup/global-teardown.ts",

  // 커버리지 설정 (통합 테스트용)
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/__tests__/**",
    "!src/test-utils/**",
    // 엔티티는 단위 테스트에서 커버되므로 제외
    "!src/entities/**",
    // 통합 테스트에서 주로 검증할 레이어들
    "src/frameworks/**/*.ts",
    "src/adapters/**/*.ts",
    "src/infrastructure/**/*.ts",
  ],
  coverageDirectory: "coverage/integration",
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // 통합 테스트 임계값 (단위 테스트보다 낮게 설정)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // 레이어별 세부 임계값
    "src/frameworks/": {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "src/adapters/": {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // 테스트 타임아웃 (통합 테스트는 더 오래 걸림)
  testTimeout: 30000,

  // 테스트 실행 설정
  maxWorkers: 1, // 통합 테스트는 순차 실행 (DB 격리)
  forceExit: true,
  detectOpenHandles: true,

  // 상세한 출력
  verbose: true,

  // 테스트 환경 변수
  testEnvironmentOptions: {
    NODE_ENV: "test",
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5433",
    DATABASE_NAME: "cart_service_test",
    DATABASE_USER: "test_user",
    DATABASE_PASSWORD: "test_password",
    REDIS_HOST: "localhost",
    REDIS_PORT: "6380",
    REDIS_PASSWORD: "",
    REDIS_DB: "0",
    REDIS_KEY_PREFIX: "cart-service-test:",
    CACHE_DEFAULT_TTL: "60",
    LOG_LEVEL: "error", // 테스트 중 로그 최소화
  },

  // 리포터 설정
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-results",
        outputName: "integration-test-results.xml",
        suiteNameTemplate: "{filepath}",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
      },
    ],
    [
      "jest-html-reporters",
      {
        publicPath: "test-results",
        filename: "integration-test-report.html",
        expand: true,
        hideIcon: true,
      },
    ],
  ],

  // 모듈 파일 확장자
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // 캐시 디렉토리
  cacheDirectory: "<rootDir>/.jest-cache/integration",

  // 테스트 결과 캐시 비활성화 (통합 테스트에서는 항상 새로 실행)
  cache: false,

  // ESM 모듈 지원
  extensionsToTreatAsEsm: [".ts"],

  // 모의 객체 설정 리셋
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // 테스트 실행 전 경고 메시지
  displayName: {
    name: "INTEGRATION",
    color: "blue",
  },
};
