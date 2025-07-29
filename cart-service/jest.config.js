// cart-service/jest.config.js

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],

  // ✅ TypeScript 변환 설정 (핵심 수정사항)
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: false,
        tsconfig: {
          types: ["node", "jest", "@types/jest"],
        },
      },
    ],
  },

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**",
    "!src/**/*.d.ts",
    "!src/test-setup.ts", // test-setup 파일 제외
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // ✅ 모듈 경로 매핑 추가
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/entities/(.*)$": "<rootDir>/src/entities/$1",
    "^@/usecases/(.*)$": "<rootDir>/src/usecases/$1",
    "^@/adapters/(.*)$": "<rootDir>/src/adapters/$1",
    "^@/frameworks/(.*)$": "<rootDir>/src/frameworks/$1",
    "^@/types/(.*)$": "<rootDir>/src/types/$1",
    "^@/utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@/config/(.*)$": "<rootDir>/src/config/$1",
  },

  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // ✅ 프로젝트별 테스트 설정 개선
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/entities/__tests__/**/*.test.ts"],
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            useESM: false,
            tsconfig: {
              types: ["node", "jest", "@types/jest"],
            },
          },
        ],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@/entities/(.*)$": "<rootDir>/src/entities/$1",
        "^@/usecases/(.*)$": "<rootDir>/src/usecases/$1",
        "^@/adapters/(.*)$": "<rootDir>/src/adapters/$1",
        "^@/frameworks/(.*)$": "<rootDir>/src/frameworks/$1",
        "^@/types/(.*)$": "<rootDir>/src/types/$1",
        "^@/utils/(.*)$": "<rootDir>/src/utils/$1",
        "^@/config/(.*)$": "<rootDir>/src/config/$1",
      },
      testTimeout: 5000,
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/adapters/__tests__/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            useESM: false,
            tsconfig: {
              types: ["node", "jest", "@types/jest"],
            },
          },
        ],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@/entities/(.*)$": "<rootDir>/src/entities/$1",
        "^@/usecases/(.*)$": "<rootDir>/src/usecases/$1",
        "^@/adapters/(.*)$": "<rootDir>/src/adapters/$1",
        "^@/frameworks/(.*)$": "<rootDir>/src/frameworks/$1",
        "^@/types/(.*)$": "<rootDir>/src/types/$1",
        "^@/utils/(.*)$": "<rootDir>/src/utils/$1",
        "^@/config/(.*)$": "<rootDir>/src/config/$1",
      },
      testTimeout: 30000,
    },
  ],
};
