import "reflect-metadata"; // Inversify를 위한 메타데이터 지원
import { DatabaseConfig } from "../config/DatabaseConfig";
import { RedisConfig } from "../config/RedisConfig";
import { DIContainer } from "../di/Container";
import { TYPES } from "../di/types";

/**
 * 애플리케이션 부트스트랩 클래스
 */
export class AppBootstrap {
  private static container: any = null;

  /**
   * 애플리케이션 초기화
   */
  static async initialize(): Promise<void> {
    try {
      console.log("[AppBootstrap] 애플리케이션 초기화 시작...");

      // 1. 환경변수 검증
      AppBootstrap.validateEnvironment();

      // 2. DI 컨테이너 초기화
      AppBootstrap.container = await DIContainer.create();

      // 3. 데이터베이스 연결 확인
      const isDbConnected = DatabaseConfig.isConnected();
      console.log(
        `[AppBootstrap] PostgreSQL 연결 상태: ${isDbConnected ? "성공" : "실패"}`
      );

      // 4. Redis 연결 확인
      const redisConfig = AppBootstrap.container.get(TYPES.RedisConfig) as RedisConfig;
      const cacheService = redisConfig.getCacheService();
      const isRedisConnected = await cacheService.healthCheck();
      console.log(
        `[AppBootstrap] Redis 연결 상태: ${isRedisConnected ? "성공" : "실패"}`
      );

      console.log("[AppBootstrap] 애플리케이션 초기화 완료 ✅");
    } catch (error) {
      console.error("[AppBootstrap] 애플리케이션 초기화 실패:", error);
      throw error;
    }
  }

  /**
   * 필수 환경변수 검증
   */
  private static validateEnvironment(): void {
    const requiredEnvs = [
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "DB_USER",
      "DB_PASSWORD",
      "REDIS_HOST",
      "REDIS_PORT",
    ];

    const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

    if (missingEnvs.length > 0) {
      throw new Error(
        `필수 환경변수가 누락되었습니다: ${missingEnvs.join(", ")}`
      );
    }
  }

  /**
   * DI 컨테이너 반환
   */
  static getContainer() {
    if (!AppBootstrap.container) {
      throw new Error(
        "애플리케이션이 초기화되지 않았습니다. AppBootstrap.initialize()를 먼저 호출하세요."
      );
    }
    return AppBootstrap.container;
  }

  /**
   * 애플리케이션 종료 처리
   */
  static async shutdown(): Promise<void> {
    console.log("[AppBootstrap] 애플리케이션 종료 시작...");

    try {
      await DIContainer.cleanup();
      console.log("[AppBootstrap] 애플리케이션 종료 완료 ✅");
    } catch (error) {
      console.error("[AppBootstrap] 애플리케이션 종료 중 오류:", error);
    }
  }
}

// ========================================
// 프로세스 종료 시그널 처리는 server.ts에서 통합 관리
// ========================================

// 중복 시그널 핸들러 제거 - server.ts에서 통합 관리
