import { DataSource } from "typeorm";
import { ProductEntity } from "../../adapters/entities/ProductEntity";
import { CategoryEntity } from "../../adapters/entities/CategoryEntity";
import { InventoryEntity } from "../../adapters/entities/InventoryEntity";
import { ProductReviewEntity } from "../../adapters/entities/ProductReviewEntity";
import { ProductQnAEntity } from "../../adapters/entities/ProductQnAEntity";
import { RetryManager } from "../resilience/RetryManager";
import { DatabaseError } from "../../shared/errors/CustomErrors";
import { logger } from "../logging/Logger";
import * as dotenv from "dotenv";

// .env 파일의 환경 변수를 로드합니다.
dotenv.config();

/**
 * TypeORM CLI가 마이그레이션 작업을 위해 사용할 DataSource 인스턴스입니다.
 * 반드시 파일 최상단에서 export 되어야 합니다.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopping_mall_products",
  entities: [ProductEntity, CategoryEntity, InventoryEntity, ProductReviewEntity, ProductQnAEntity],
  // 마이그레이션 사용으로 자동 동기화 비활성화
  synchronize: false,
  logging: true, // CLI 실행 시 SQL 쿼리를 보려면 true로 설정
  // 마이그레이션 파일 경로를 명시합니다.
  migrations: ["src/infrastructure/database/migrations/*.ts"],
});

/**
 * 기존의 DatabaseConfig 클래스는 애플리케이션 런타임에서
 * 데이터베이스 연결을 관리하는 역할을 그대로 수행합니다.
 */
export class DatabaseConfig {
  private static dataSource: DataSource | null = null;

  /**
   * TypeORM DataSource 생성 및 초기화 - 재시도 로직 적용
   */
  static async createDataSource(): Promise<DataSource> {
    // 이미 연결이 초기화되었다면 기존 연결을 반환합니다.
    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource;
    }

    // CLI와 동일한 설정을 사용하는 AppDataSource 인스턴스를 사용하여 초기화합니다.
    this.dataSource = AppDataSource;

    try {
      await RetryManager.executeForDatabase(async () => {
        if (this.dataSource && !this.dataSource.isInitialized) {
          await this.dataSource.initialize();
        }
      }, "database-initialization");

      logger.info("PostgreSQL 연결 성공", {
        metadata: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME
        }
      });
      return this.dataSource;
    } catch (error) {
      logger.error("PostgreSQL 연결 실패", { error: error as Error });
      throw new DatabaseError("데이터베이스 연결에 실패했습니다", error);
    }
  }

  /**
   * 데이터베이스 연결 상태 확인
   */
  static isConnected(): boolean {
    return this.dataSource?.isInitialized || false;
  }

  /**
   * 연결 정리 - 재시도 로직 적용
   */
  static async disconnect(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      try {
        await RetryManager.executeForDatabase(async () => {
          if (this.dataSource) {
            await this.dataSource.destroy();
          }
        }, "database-disconnect");
        
        this.dataSource = null;
        logger.info("PostgreSQL 연결 종료");
      } catch (error) {
        logger.error("PostgreSQL 연결 종료 실패", { error: error as Error });
        // 강제로 null로 설정하여 메모리 누수 방지
        this.dataSource = null;
        throw new DatabaseError("데이터베이스 연결 종료에 실패했습니다", error);
      }
    }
  }
}
