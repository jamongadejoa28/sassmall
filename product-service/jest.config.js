// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/__tests__/**",
    "!src/server.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
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
  // setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'], // 현재는 불필요
  testTimeout: 10000,
  verbose: true,
};
