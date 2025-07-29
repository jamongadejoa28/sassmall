// ========================================
// Database Setup Script
// cart-service/src/setup-database.ts
// ========================================

import { DataSource } from "typeorm";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: true,
});

async function setupDatabase() {
  try {
    await dataSource.initialize();
    console.log("✅ Connected to database successfully!");

    // Read setup.sql file
    const setupSqlPath = path.join(__dirname, "../database/setup.sql");
    const setupSql = fs.readFileSync(setupSqlPath, "utf8");

    // Split SQL commands (remove CREATE DATABASE and \c commands as they can't be executed this way)
    const commands = setupSql
      .split(";")
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)
      .filter(cmd => !cmd.includes("CREATE DATABASE"))
      .filter(cmd => !cmd.includes("\\c "))
      .filter(cmd => !cmd.includes("RAISE NOTICE")); // Skip notices for now

    console.log(`📋 Executing ${commands.length} SQL commands...`);

    for (const command of commands) {
      if (command.trim()) {
        try {
          await dataSource.query(command);
          console.log("✅ Command executed successfully");
        } catch (error: any) {
          // Skip errors for already existing objects
          if (error.message.includes("already exists") || 
              error.message.includes("relation") ||
              error.message.includes("does not exist")) {
            console.log("⚠️ Skipping existing object:", error.message.split("\n")[0]);
          } else {
            console.error("❌ Error executing command:", error.message.split("\n")[0]);
          }
        }
      }
    }

    // Verify tables exist
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log("📋 Created tables:", tables.map((r: any) => r.table_name));

    await dataSource.destroy();
    console.log("🎉 Database setup complete!");

  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();