// cart-service/src/infrastructure/database/data-source.ts
// ========================================

import { DataSource } from "typeorm";
import { CartEntity } from "../../adapters/entities/CartEntity";
import { CartItemEntity } from "../../adapters/entities/CartItemEntity";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopping_mall_carts",
  synchronize: process.env.NODE_ENV === "development", // 개발환경에서만 자동 스키마 생성
  logging: process.env.NODE_ENV === "development",
  entities: [CartEntity, CartItemEntity],
  migrations: ["src/infrastructure/database/migrations/*.ts"],
  subscribers: ["src/infrastructure/database/subscribers/*.ts"],
});
