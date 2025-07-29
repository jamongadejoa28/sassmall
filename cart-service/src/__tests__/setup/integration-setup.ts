// ========================================
// 통합 테스트 환경 설정 (수정됨 - 환경 변수 완성)
// cart-service/src/__tests__/setup/integration-setup.ts
// ========================================

import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { Redis } from "ioredis";

// ========================================
// 테스트 환경 변수 설정 (추가됨)
// ========================================

// 기본 환경 설정
process.env.NODE_ENV = "test";
process.env.SERVICE_VERSION = "1.0.0-test";
process.env.PORT = "3006";
process.env.LOG_LEVEL = "error"; // 테스트 중 로그 최소화

// 데이터베이스 설정 (Docker Compose 테스트 환경과 일치)
process.env.DATABASE_HOST = "localhost";
process.env.DATABASE_PORT = "5433";
process.env.DATABASE_NAME = "cart_service_test";
process.env.DATABASE_USER = "test_user";
process.env.DATABASE_PASSWORD = "test_password";
process.env.DATABASE_SSL = "false";
process.env.DATABASE_LOGGING = "false";

// Redis 설정 (Docker Compose 테스트 환경과 일치)
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6380";
process.env.REDIS_PASSWORD = "";
process.env.REDIS_DB = "0";
process.env.REDIS_KEY_PREFIX = "cart-service-test:";
process.env.REDIS_MAX_RETRIES = "3";
process.env.REDIS_RETRY_DELAY = "1000";

// 캐시 설정
process.env.CACHE_DEFAULT_TTL = "60";
process.env.CACHE_CART_TTL = "300";
process.env.CACHE_USER_CART_TTL = "600";
process.env.CACHE_SESSION_CART_TTL = "1800";

// JWT 및 보안 설정 (테스트용)
process.env.JWT_SECRET = "test-jwt-secret-for-cart-service";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CORS_ORIGIN = "*";

// Rate Limiting 설정 (테스트용 - 관대하게)
process.env.RATE_LIMIT_WINDOW_MS = "60000"; // 1분
process.env.RATE_LIMIT_MAX = "1000"; // 1분당 1000회

// 외부 서비스 설정 (Mock)
process.env.PRODUCT_SERVICE_URL = "http://localhost:3003";
process.env.PRODUCT_SERVICE_TIMEOUT = "5000";

// 헬스체크 설정
process.env.HEALTH_CHECK_TIMEOUT = "5000";

// 테스트 모드 플래그
process.env.TEST_MODE = "true";
process.env.DISABLE_AUTH = "false"; // 인증 테스트를 위해 활성화
process.env.MOCK_EXTERNAL_SERVICES = "true";

console.log("🔧 [Integration Setup] 환경 변수 설정 완료");
console.log("📊 [Integration Setup] 테스트 환경 정보:");
console.log(
  `   - Database: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`
);
console.log(
  `   - Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/${process.env.REDIS_DB}`
);
console.log(`   - Cache TTL: ${process.env.CACHE_DEFAULT_TTL}s`);

// 글로벌 테스트 변수
declare global {
  var testDataSource: DataSource;
  var testRedis: Redis;
}

// ========================================
// 테스트 데이터베이스 연결 설정
// ========================================

/**
 * 테스트 DataSource 옵션 생성
 */
function createTestDataSourceOptions(): DataSourceOptions {
  return {
    type: "postgres",
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT!),
    database: process.env.DATABASE_NAME!,
    username: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    synchronize: false, // 스키마는 global-setup.ts에서 이미 초기화됨
    dropSchema: false,
    entities: ["src/adapters/entities/*.ts"],
    logging: process.env.DATABASE_LOGGING === "true",
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
    connectTimeoutMS: 10000,
    extra: {
      max: 5, // 테스트용 최대 연결 수 제한
      idleTimeoutMillis: 30000,
    },
  };
}

/**
 * 테스트 Redis 옵션 생성
 */
function createTestRedisOptions() {
  return {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB!),
    keyPrefix: process.env.REDIS_KEY_PREFIX,
    lazyConnect: true,
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES!),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY!),
    enableReadyCheck: true,
    maxLoadBalanceRetries: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };
}

// ========================================
// 테스트 환경 초기화
// ========================================

// 각 테스트 파일 실행 전 설정
beforeAll(async () => {
  console.log("🔧 [Test Setup] 테스트 데이터베이스 연결 중...");

  try {
    // PostgreSQL 연결 초기화
    if (!global.testDataSource || !global.testDataSource.isInitialized) {
      const options = createTestDataSourceOptions();
      global.testDataSource = new DataSource(options);
      await global.testDataSource.initialize();
      console.log("✅ [Test Setup] PostgreSQL 연결 성공");
    }

    // Redis 연결 초기화
    if (!global.testRedis || global.testRedis.status !== "ready") {
      const options = createTestRedisOptions();
      global.testRedis = new Redis(options);

      // Redis 연결 대기
      await global.testRedis.connect();
      console.log("✅ [Test Setup] Redis 연결 성공");

      // 연결 상태 확인
      const pingResult = await global.testRedis.ping();
      if (pingResult !== "PONG") {
        throw new Error("Redis ping 실패");
      }
    }

    console.log("✅ [Test Setup] 테스트 환경 연결 완료");
  } catch (error) {
    console.error("❌ [Test Setup] 테스트 환경 연결 실패:", error);
    throw error;
  }
});

// 각 테스트 파일 실행 후 정리
afterAll(async () => {
  console.log("🧹 [Test Cleanup] 테스트 환경 정리 중...");

  try {
    // Redis 연결 종료
    if (global.testRedis && global.testRedis.status === "ready") {
      await global.testRedis.quit();
      console.log("✅ [Test Cleanup] Redis 연결 종료");
    }

    // DB 연결 종료
    if (global.testDataSource && global.testDataSource.isInitialized) {
      await global.testDataSource.destroy();
      console.log("✅ [Test Cleanup] PostgreSQL 연결 종료");
    }

    console.log("✅ [Test Cleanup] 정리 완료");
  } catch (error) {
    console.error("❌ [Test Cleanup] 정리 실패:", error);
    // cleanup 실패는 경고만 표시하고 테스트는 계속 진행
  }
});

// 각 개별 테스트 전 데이터 정리
beforeEach(async () => {
  try {
    // Redis 캐시 전체 삭제
    if (global.testRedis && global.testRedis.status === "ready") {
      await global.testRedis.flushdb();
    }

    // 테스트 데이터 정리 (CASCADE로 관련 데이터도 삭제)
    if (global.testDataSource && global.testDataSource.isInitialized) {
      await global.testDataSource.query("TRUNCATE TABLE cart_items CASCADE");
      await global.testDataSource.query("TRUNCATE TABLE carts CASCADE");
    }
  } catch (error) {
    console.warn("⚠️ [Test Setup] 테스트 데이터 정리 실패:", error);
    // 데이터 정리 실패는 경고만 표시
  }
});

// Jest 타임아웃 설정 (통합 테스트는 더 오래 걸림)
jest.setTimeout(30000); // 30초

// 테스트 환경 확인 로그
console.log("🎯 [Integration Setup] 테스트 환경 설정 완료");
console.log(`   - Jest Timeout: ${30000}ms`);
console.log(`   - Test Mode: ${process.env.TEST_MODE}`);
console.log(
  `   - Mock External Services: ${process.env.MOCK_EXTERNAL_SERVICES}`
);
