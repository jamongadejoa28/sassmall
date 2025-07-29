// src/test-db-connection.ts
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false, // 프로덕션에서는 false
  logging: true,
});

async function testConnection() {
  try {
    await dataSource.initialize();
    console.log("✅ Database connection successful!");

    // 테이블 존재 확인
    const result = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log(
      "📋 Available tables:",
      result.map((r: any) => r.table_name)
    );

    await dataSource.destroy();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

testConnection();
