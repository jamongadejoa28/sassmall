// cart-service/src/infrastructure/database/test-data-source.ts
// ========================================

import { DataSource } from "typeorm";
import { CartEntity } from "../../adapters/entities/CartEntity";
import { CartItemEntity } from "../../adapters/entities/CartItemEntity";
import dotenv from "dotenv";

// 테스트 환경 변수 로드
dotenv.config({ path: ".env.test" });

export const TestDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5433"),
  username: process.env.DATABASE_USER || "test_user",
  password: process.env.DATABASE_PASSWORD || "test_password",
  database: process.env.DATABASE_NAME || "cart_service_test",
  synchronize: true, // 테스트 환경에서는 자동 스키마 동기화
  logging: false,
  entities: [CartEntity, CartItemEntity],

  // ✅ 테스트 최적화 설정
  extra: {
    max: 5, // 최대 연결 수
    min: 1, // 최소 연결 수
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000,
  },
});
