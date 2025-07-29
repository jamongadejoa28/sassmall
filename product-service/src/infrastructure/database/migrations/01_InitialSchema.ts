// ========================================
// 01_InitialSchema - TypeORM Migration
// src/infrastructure/database/migrations/01_InitialSchema.ts
// ========================================

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 초기 데이터베이스 스키마 생성
 * 
 * 생성할 테이블:
 * 1. categories - 카테고리 계층 구조
 * 2. products - 상품 정보
 * 3. inventories - 재고 관리
 * 
 * 관계:
 * - categories: Self-referencing (부모-자식)
 * - products: Many-to-One with categories
 * - inventories: One-to-One with products
 */
export class InitialSchema1734567890123 implements MigrationInterface {
  name = "InitialSchema1734567890123";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. Categories 테이블 생성
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "slug" character varying(150) NOT NULL,
        "parentId" uuid,
        "depth" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "productCount" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")
      )
    `);

    // Categories 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_parentId" ON "categories" ("parentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_depth" ON "categories" ("depth")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_isActive_depth" ON "categories" ("isActive", "depth")
    `);

    // ========================================
    // 2. Products 테이블 생성
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "categoryId" uuid NOT NULL,
        "brand" character varying(100) NOT NULL,
        "sku" character varying(50) NOT NULL,
        "weight" numeric(8,2),
        "dimensions" jsonb,
        "tags" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "discountPrice" numeric(10,2),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_sku" UNIQUE ("sku"),
        CONSTRAINT "CHK_products_price_positive" CHECK ("price" > 0),
        CONSTRAINT "CHK_products_weight_positive" CHECK ("weight" IS NULL OR "weight" > 0),
        CONSTRAINT "CHK_products_discount_valid" CHECK (
          "discountPrice" IS NULL OR "discountPrice" < "price"
        )
      )
    `);

    // Products 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX "IDX_products_categoryId" ON "products" ("categoryId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_brand" ON "products" ("brand")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_price" ON "products" ("price")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_isActive_createdAt" ON "products" ("isActive", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_tags_gin" ON "products" USING GIN ("tags")
    `);

    // ========================================
    // 3. Inventories 테이블 생성
    // ========================================
    await queryRunner.query(`
      CREATE TYPE "inventory_status_enum" AS ENUM ('sufficient', 'low_stock', 'out_of_stock')
    `);

    await queryRunner.query(`
      CREATE TABLE "inventories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "productId" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "availableQuantity" integer NOT NULL DEFAULT 0,
        "reservedQuantity" integer NOT NULL DEFAULT 0,
        "status" "inventory_status_enum" NOT NULL DEFAULT 'sufficient',
        "lowStockThreshold" integer NOT NULL DEFAULT 10,
        "location" character varying(100) NOT NULL DEFAULT 'MAIN_WAREHOUSE',
        "lastRestockedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_inventories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventories_productId" UNIQUE ("productId"),
        CONSTRAINT "CHK_inventories_quantity_non_negative" CHECK ("quantity" >= 0),
        CONSTRAINT "CHK_inventories_available_non_negative" CHECK ("availableQuantity" >= 0),
        CONSTRAINT "CHK_inventories_reserved_non_negative" CHECK ("reservedQuantity" >= 0),
        CONSTRAINT "CHK_inventories_quantity_balance" CHECK (
          "quantity" = "availableQuantity" + "reservedQuantity"
        ),
        CONSTRAINT "CHK_inventories_threshold_positive" CHECK ("lowStockThreshold" > 0)
      )
    `);

    // Inventories 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX "IDX_inventories_status" ON "inventories" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventories_availableQuantity" ON "inventories" ("availableQuantity")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventories_location" ON "inventories" ("location")
    `);

    // ========================================
    // 4. 외래 키 제약 조건 추가
    // ========================================
    
    // Categories Self-referencing FK
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD CONSTRAINT "FK_categories_parent" 
      FOREIGN KEY ("parentId") REFERENCES "categories"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Products → Categories FK
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "FK_products_category" 
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // Inventories → Products FK
    await queryRunner.query(`
      ALTER TABLE "inventories" 
      ADD CONSTRAINT "FK_inventories_product" 
      FOREIGN KEY ("productId") REFERENCES "products"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ========================================
    // 5. 트리거 함수 생성 (자동 업데이트)
    // ========================================

    // Updated At 자동 업데이트 함수
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Categories updatedAt 트리거
    await queryRunner.query(`
      CREATE TRIGGER update_categories_updated_at 
      BEFORE UPDATE ON "categories" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Products updatedAt 트리거
    await queryRunner.query(`
      CREATE TRIGGER update_products_updated_at 
      BEFORE UPDATE ON "products" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Inventories updatedAt 트리거
    await queryRunner.query(`
      CREATE TRIGGER update_inventories_updated_at 
      BEFORE UPDATE ON "inventories" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // ========================================
    // 6. 재고 상태 자동 업데이트 트리거
    // ========================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_inventory_status()
      RETURNS TRIGGER AS $$
      BEGIN
          -- 재고 상태 자동 계산
          IF NEW."availableQuantity" = 0 THEN
              NEW."status" = 'out_of_stock'::inventory_status_enum;
          ELSIF NEW."availableQuantity" <= NEW."lowStockThreshold" THEN
              NEW."status" = 'low_stock'::inventory_status_enum;
          ELSE
              NEW."status" = 'sufficient'::inventory_status_enum;
          END IF;
          
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_inventory_status_trigger 
      BEFORE INSERT OR UPDATE ON "inventories" 
      FOR EACH ROW EXECUTE FUNCTION update_inventory_status();
    `);

    // ========================================
    // 7. 카테고리 상품 수 자동 업데이트 트리거
    // ========================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_category_product_count()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              -- 상품 추가 시 카테고리 상품 수 증가
              UPDATE "categories" 
              SET "productCount" = "productCount" + 1 
              WHERE "id" = NEW."categoryId";
              RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
              -- 상품 삭제 시 카테고리 상품 수 감소
              UPDATE "categories" 
              SET "productCount" = "productCount" - 1 
              WHERE "id" = OLD."categoryId";
              RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
              -- 카테고리 변경 시 기존 카테고리는 감소, 새 카테고리는 증가
              IF OLD."categoryId" != NEW."categoryId" THEN
                  UPDATE "categories" 
                  SET "productCount" = "productCount" - 1 
                  WHERE "id" = OLD."categoryId";
                  
                  UPDATE "categories" 
                  SET "productCount" = "productCount" + 1 
                  WHERE "id" = NEW."categoryId";
              END IF;
              RETURN NEW;
          END IF;
          RETURN NULL;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_category_product_count_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON "products" 
      FOR EACH ROW EXECUTE FUNCTION update_category_product_count();
    `);

    console.log("✅ [Migration] 초기 스키마 및 트리거 생성 완료");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 트리거 삭제
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_category_product_count_trigger ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_inventory_status_trigger ON "inventories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_inventories_updated_at ON "inventories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_products_updated_at ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_categories_updated_at ON "categories"`);

    // 함수 삭제
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_category_product_count()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_inventory_status()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // 테이블 삭제 (FK 순서 고려)
    await queryRunner.query(`DROP TABLE IF EXISTS "inventories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);

    // Enum 타입 삭제
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_status_enum"`);

    console.log("✅ [Migration] 초기 스키마 롤백 완료");
  }
}