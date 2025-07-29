// cart-service/src/__tests__/setup/global-setup.ts
// ========================================

import { execSync } from "child_process"; // 🔧 수정: import 추가
import { DataSource, DataSourceOptions } from "typeorm"; // 🔧 수정: DataSourceOptions 추가
// import { Client } from "pg";

export default async (): Promise<void> => {
  console.log("🚀 [Global Setup] 통합 테스트 환경 초기화 시작...");

  try {
    // 1. Docker Compose로 테스트 환경 시작
    console.log("📦 [Docker] 테스트 컨테이너 시작 중...");
    execSync(
      "docker-compose -f docker-compose.test.yml up -d postgres-test redis-test",
      {
        stdio: "inherit",
        timeout: 60000, // 60초 타임아웃
      }
    );

    // 2. DB 연결 대기 (헬스체크)
    console.log("⏳ [Database] PostgreSQL 준비 대기 중...");
    await waitForPostgresHealthy();

    // 3. Redis 연결 대기
    console.log("⏳ [Cache] Redis 준비 대기 중...");
    await waitForRedisHealthy();

    // 4. 데이터베이스 스키마 초기화
    console.log("🗄️ [Database] 스키마 초기화 중...");
    await initializeTestDatabase();

    console.log("✅ [Global Setup] 테스트 환경 준비 완료!");
  } catch (error) {
    console.error("❌ [Global Setup] 초기화 실패:", error);
    throw error;
  }
};

/**
 * 서비스 준비 상태 대기
 */
// async function waitForService(
//   host: string,
//   port: number,
//   timeout: number
// ): Promise<void> {
//   const net = require("net");
//   const startTime = Date.now();

//   return new Promise((resolve, reject) => {
//     const checkConnection = () => {
//       const socket = new net.Socket();

//       socket.setTimeout(1000);
//       socket.on("connect", () => {
//         socket.destroy();
//         resolve();
//       });

//       socket.on("timeout", () => {
//         socket.destroy();
//         checkAgain();
//       });

//       socket.on("error", () => {
//         checkAgain();
//       });

//       socket.connect(port, host);
//     };

//     const checkAgain = () => {
//       if (Date.now() - startTime > timeout) {
//         reject(
//           new Error(`Service ${host}:${port} not ready within ${timeout}ms`)
//         );
//       } else {
//         setTimeout(checkConnection, 1000);
//       }
//     };

//     checkConnection();
//   });
// }

// async function waitForPostgresReady(retries = 10, delay = 1000): Promise<void> {
//   const client = new Client({
//     host: "localhost",
//     port: 5433,
//     user: "test_user",
//     password: "test_password",
//     database: "cart_service_test",
//   });

//   for (let i = 1; i <= retries; i++) {
//     try {
//       await client.connect();
//       await client.end();
//       console.log(`✅ [Database] PostgreSQL 응답 확인 완료 (시도 ${i})`);
//       return;
//     } catch (e) {
//       console.log(`⏳ [Database] PostgreSQL 연결 시도 중... (시도 ${i})`);
//       await new Promise((res) => setTimeout(res, delay));
//     }
//   }

//   throw new Error("❌ [Database] PostgreSQL이 완전히 준비되지 않았습니다.");
// }

/**
 * 🔧 수정: Redis 헬스체크 대기 (더 견고한 체크)
 */
async function waitForRedisHealthy(
  retries: number = 20,
  delay: number = 3000
): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const result = execSync(
        `docker inspect --format='{{.State.Health.Status}}' cart-service-redis-test`
      )
        .toString()
        .trim();

      // 🔧 변경: toLowerCase()로 대소문자 무시, includes()로 부분 문자열 매치
      if (result.toLowerCase().includes("healthy")) {
        console.log(`✅ [Cache] Redis 헬시 상태 확인됨 (시도 ${i})`);
        return;
      }

      console.log(`⏳ [Cache] Redis 상태: ${result.trim()} (시도 ${i})`);
    } catch (err) {
      console.log(`❗ [Cache] docker inspect 실패 (시도 ${i})`);
    }

    await new Promise((res) => setTimeout(res, delay));
  }

  throw new Error("❌ [Cache] Redis 헬시 상태가 아님");
}

async function waitForPostgresHealthy(
  retries = 10,
  delay = 2000
): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const result = execSync(
        `docker inspect --format="{{.State.Health.Status}}" cart-service-postgres-test`
      )
        .toString()
        .trim();

      if (result === "healthy") {
        console.log(`✅ [Database] PostgreSQL 헬시 상태 확인됨 (시도 ${i})`);
        return;
      }

      console.log(
        `⏳ [Database] PostgreSQL 상태: ${result.trim()} (시도 ${i})`
      );
    } catch (err) {
      console.log(`❗ [Database] docker inspect 실패 (시도 ${i})`);
    }

    await new Promise((res) => setTimeout(res, delay));
  }

  throw new Error("❌ [Database] PostgreSQL 헬시 상태가 아님");
}

/**
 * 테스트 데이터베이스 스키마 초기화
 */
async function initializeTestDatabase(): Promise<void> {
  let dataSource: DataSource | undefined;
  try {
    const testDataSourceOptions: DataSourceOptions = {
      type: "postgres",
      host: "localhost",
      port: 5433, // 🔧 수정: Docker Compose의 PostgreSQL 포트와 일치
      database: "cart_service_test", // 🔧 수정: Docker Compose의 DB 이름과 일치
      username: "test_user", // 🔧 수정: Docker Compose의 DB 유저와 일치
      password: "test_password", // 🔧 수정: Docker Compose의 DB 비밀번호와 일치
      synchronize: true, // 테스트에서는 자동 스키마 동기화
      dropSchema: true, // 매번 깨끗한 상태로 시작
      entities: ["src/adapters/entities/*.ts"], // 🔧 수정: 엔티티 경로 추가
      logging: false,
    };
    dataSource = new DataSource(testDataSourceOptions);
    await dataSource.initialize();
    await dataSource.synchronize(true); // 스키마 동기화 (테이블 생성)
    console.log("✅ [Database] PostgreSQL 스키마 동기화 완료");
  } catch (error) {
    console.error("❌ [Database] 테스트 데이터베이스 초기화 실패:", error);
    throw error;
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}
