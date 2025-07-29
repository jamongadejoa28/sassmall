// ========================================
// 05_SimplifiedSchema - TypeORM Migration  
// src/infrastructure/database/migrations/05_SimplifiedSchema.ts
// ========================================

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 단순화된 쇼핑몰 스키마 (배송 필드 제거)
 * 
 * 새로운 테이블 구조:
 * 1. categories - 단순한 1차원 카테고리
 * 2. products - 배송 필드 제거한 핵심 상품 정보
 * 3. inventories - 단순한 재고 관리
 * 4. product_reviews - 상품평 시스템
 * 5. product_qna - 상품문의 시스템
 */
export class SimplifiedSchema1735550000000 implements MigrationInterface {
  name = "SimplifiedSchema1735550000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log("🔄 [Migration] 단순화된 스키마 생성 시작...");

    // ========================================
    // 1. 기존 복잡한 스키마 완전 제거
    // ========================================
    
    console.log("🗑️ [Migration] 기존 스키마 정리...");
    
    // 기존 뷰 제거
    await queryRunner.query(`DROP VIEW IF EXISTS "products_with_inventory"`);
    
    // 기존 트리거 제거
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_category_product_count_trigger ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_inventory_status_trigger ON "inventories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_inventories_updated_at_v2 ON "inventories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_products_updated_at_v2 ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_categories_updated_at_v2 ON "categories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_inventories_updated_at ON "inventories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_products_updated_at ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_categories_updated_at ON "categories"`);

    // 기존 함수 제거
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_category_product_count()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_inventory_status()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column_v2()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // 기존 테이블 제거 (FK 순서 고려)
    await queryRunner.query(`DROP TABLE IF EXISTS "inventories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);

    // Enum 타입 제거
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_status_enum"`);

    console.log("✅ [Migration] 기존 스키마 정리 완료");

    // ========================================
    // 2. 새로운 Categories 테이블 (단순화)
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(150) NOT NULL,
        "description" text,
        "sort_order" integer DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_categories_simple" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_slug_simple" UNIQUE ("slug")
      )
    `);

    // Categories 인덱스
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_sort_order" ON "categories" ("sort_order")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_active" ON "categories" ("is_active")
    `);

    // ========================================
    // 3. 새로운 Products 테이블 (배송 필드 제거)
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(300) NOT NULL,
        "description" text NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "original_price" numeric(12,2),
        "brand" varchar(100) NOT NULL,
        "sku" varchar(100) NOT NULL,
        "category_id" uuid NOT NULL,
        "rating" numeric(3,2) DEFAULT 0,
        "review_count" integer DEFAULT 0,
        "image_urls" jsonb DEFAULT '[]',
        "thumbnail_url" varchar(500),
        "weight" numeric(8,2),
        "dimensions" jsonb,
        "tags" jsonb DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "is_featured" boolean DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_products_simple" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_sku_simple" UNIQUE ("sku"),
        CONSTRAINT "CHK_products_price_positive" CHECK ("price" > 0),
        CONSTRAINT "CHK_products_weight_positive" CHECK ("weight" IS NULL OR "weight" > 0),
        CONSTRAINT "CHK_products_rating_valid" CHECK ("rating" >= 0 AND "rating" <= 5),
        CONSTRAINT "CHK_products_original_price" CHECK ("original_price" IS NULL OR "original_price" >= "price")
      )
    `);

    // Products 인덱스 (성능 최적화)
    await queryRunner.query(`
      CREATE INDEX "IDX_products_category_id" ON "products" ("category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_brand" ON "products" ("brand")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_price" ON "products" ("price")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_rating" ON "products" ("rating" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_active_featured" ON "products" ("is_active", "is_featured")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_tags_gin" ON "products" USING GIN("tags")
    `);
    // 전문 검색 인덱스 (영어 기본 설정)
    await queryRunner.query(`
      CREATE INDEX "IDX_products_search_text" ON "products" USING GIN(to_tsvector('english', "name" || ' ' || "description"))
    `);

    // ========================================
    // 4. 새로운 Inventories 테이블 (단순화)
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "inventories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "available_quantity" integer NOT NULL DEFAULT 0,
        "low_stock_threshold" integer NOT NULL DEFAULT 10,
        "location" varchar(100) NOT NULL DEFAULT 'MAIN_WAREHOUSE',
        "last_restocked_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_inventories_simple" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventories_product_id" UNIQUE ("product_id"),
        CONSTRAINT "CHK_inventories_quantity_non_negative" CHECK ("quantity" >= 0),
        CONSTRAINT "CHK_inventories_available_non_negative" CHECK ("available_quantity" >= 0),
        CONSTRAINT "CHK_inventories_available_lte_quantity" CHECK ("available_quantity" <= "quantity"),
        CONSTRAINT "CHK_inventories_threshold_positive" CHECK ("low_stock_threshold" > 0)
      )
    `);

    // Inventories 인덱스
    await queryRunner.query(`
      CREATE INDEX "IDX_inventories_product_id" ON "inventories" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventories_location" ON "inventories" ("location")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventories_low_stock" ON "inventories" ("available_quantity") WHERE "available_quantity" <= "low_stock_threshold"
    `);

    // ========================================
    // 5. 새로운 Product Reviews 테이블
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "product_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "user_name" varchar(100) NOT NULL,
        "rating" integer NOT NULL,
        "content" text NOT NULL,
        "is_verified_purchase" boolean DEFAULT false,
        "helpful_count" integer DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_product_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_product_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "CHK_product_reviews_helpful" CHECK ("helpful_count" >= 0)
      )
    `);

    // Product Reviews 인덱스
    await queryRunner.query(`
      CREATE INDEX "IDX_product_reviews_product_id" ON "product_reviews" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_reviews_rating" ON "product_reviews" ("rating")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_reviews_created_at" ON "product_reviews" ("created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_reviews_verified" ON "product_reviews" ("is_verified_purchase") WHERE "is_verified_purchase" = true
    `);

    // ========================================
    // 6. 새로운 Product QnA 테이블
    // ========================================
    await queryRunner.query(`
      CREATE TABLE "product_qna" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "user_name" varchar(100) NOT NULL,
        "question" text NOT NULL,
        "answer" text,
        "is_answered" boolean DEFAULT false,
        "answered_by" varchar(100),
        "answered_at" timestamp,
        "is_public" boolean DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_product_qna" PRIMARY KEY ("id")
      )
    `);

    // Product QnA 인덱스
    await queryRunner.query(`
      CREATE INDEX "IDX_product_qna_product_id" ON "product_qna" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_qna_answered" ON "product_qna" ("is_answered")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_qna_public" ON "product_qna" ("is_public")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_qna_created_at" ON "product_qna" ("created_at" DESC)
    `);

    // ========================================
    // 7. 외래 키 제약 조건 추가
    // ========================================
    
    // Products → Categories FK
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "FK_products_category_simple" 
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // Inventories → Products FK
    await queryRunner.query(`
      ALTER TABLE "inventories" 
      ADD CONSTRAINT "FK_inventories_product_simple" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Product Reviews → Products FK
    await queryRunner.query(`
      ALTER TABLE "product_reviews" 
      ADD CONSTRAINT "FK_product_reviews_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Product QnA → Products FK
    await queryRunner.query(`
      ALTER TABLE "product_qna" 
      ADD CONSTRAINT "FK_product_qna_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ========================================
    // 8. 간단한 Updated At 트리거 생성
    // ========================================

    // Updated At 자동 업데이트 함수
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_simple()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updated_at" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // 각 테이블에 updatedAt 트리거 적용
    await queryRunner.query(`
      CREATE TRIGGER update_categories_updated_at_simple 
      BEFORE UPDATE ON "categories" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_simple();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_products_updated_at_simple 
      BEFORE UPDATE ON "products" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_simple();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_inventories_updated_at_simple 
      BEFORE UPDATE ON "inventories" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_simple();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_product_reviews_updated_at 
      BEFORE UPDATE ON "product_reviews" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_simple();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_product_qna_updated_at 
      BEFORE UPDATE ON "product_qna" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_simple();
    `);

    // ========================================
    // 9. 유용한 뷰 생성 (성능 최적화)
    // ========================================

    // 상품 목록용 뷰 (재고 정보 포함)
    await queryRunner.query(`
      CREATE VIEW "products_with_details" AS
      SELECT 
        p.*,
        c."name" as category_name,
        c."slug" as category_slug,
        i."quantity" as inventory_quantity,
        i."available_quantity" as inventory_available,
        CASE 
          WHEN i."available_quantity" = 0 THEN 'out_of_stock'
          WHEN i."available_quantity" <= i."low_stock_threshold" THEN 'low_stock'
          ELSE 'sufficient'
        END as inventory_status,
        i."location" as inventory_location
      FROM "products" p
      LEFT JOIN "categories" c ON p."category_id" = c."id"
      LEFT JOIN "inventories" i ON p."id" = i."product_id"
      WHERE p."is_active" = true
    `);

    console.log("✅ [Migration] 단순화된 스키마 생성 완료");
    console.log("📊 [Migration] 생성된 테이블: categories, products, inventories, product_reviews, product_qna");
    console.log("🔗 [Migration] 생성된 뷰: products_with_details");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log("🔄 [Migration] 단순화된 스키마 롤백 시작...");

    // 뷰 삭제
    await queryRunner.query(`DROP VIEW IF EXISTS "products_with_details"`);

    // 트리거 삭제
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_product_qna_updated_at ON "product_qna"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON "product_reviews"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_inventories_updated_at_simple ON "inventories"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_products_updated_at_simple ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_categories_updated_at_simple ON "categories"`);

    // 함수 삭제
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_simple()`);

    // 테이블 삭제 (FK 순서 고려)
    await queryRunner.query(`DROP TABLE IF EXISTS "product_qna"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);

    console.log("✅ [Migration] 단순화된 스키마 롤백 완료");
  }
}