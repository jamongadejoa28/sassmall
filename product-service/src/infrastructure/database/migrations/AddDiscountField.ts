// ========================================
// 07_AddDiscountField - TypeORM Migration
// src/infrastructure/database/migrations/07_AddDiscountField.ts
// ========================================

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * discount 필드 추가 및 자동 가격 계산 시스템 구축
 * 
 * 변경사항:
 * 1. products 테이블에 discount_percentage 필드 추가 (0-100)
 * 2. price를 계산된 필드로 변경 (original_price * (1 - discount_percentage/100))
 * 3. 자동 가격 계산 트리거 추가
 * 4. 기존 데이터 마이그레이션
 */
export class AddDiscountField1735551000000 implements MigrationInterface {
  name = "AddDiscountField1735551000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log("🔄 [Migration] discount 필드 추가 및 가격 계산 시스템 구축 시작...");

    // ========================================
    // 1. products 테이블에 discount_percentage 필드 추가
    // ========================================
    
    console.log("📊 [Migration] products 테이블에 discount_percentage 필드 추가...");
    
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD COLUMN "discount_percentage" DECIMAL(5,2) DEFAULT 0.00 
      CHECK ("discount_percentage" >= 0 AND "discount_percentage" <= 100)
    `);

    // ========================================
    // 2. 기존 데이터를 기반으로 discount_percentage 계산
    // ========================================
    
    console.log("🔄 [Migration] 기존 데이터 기반 할인율 계산...");
    
    // original_price가 있고 price가 더 작은 경우 할인율 계산
    await queryRunner.query(`
      UPDATE "products" 
      SET "discount_percentage" = ROUND(
        ((COALESCE("original_price", "price") - "price") / COALESCE("original_price", "price")) * 100, 
        2
      )
      WHERE "original_price" IS NOT NULL 
      AND "original_price" > "price"
    `);

    // original_price가 없는 경우 현재 price를 original_price로 설정
    await queryRunner.query(`
      UPDATE "products" 
      SET "original_price" = "price"
      WHERE "original_price" IS NULL
    `);

    // ========================================
    // 3. 자동 가격 계산 함수 생성
    // ========================================
    
    console.log("⚙️ [Migration] 자동 가격 계산 함수 생성...");
    
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_discounted_price()
      RETURNS TRIGGER AS $$
      BEGIN
        -- discount_percentage가 변경되거나 original_price가 변경된 경우 price 재계산
        IF TG_OP = 'INSERT' OR 
           OLD.discount_percentage IS DISTINCT FROM NEW.discount_percentage OR
           OLD.original_price IS DISTINCT FROM NEW.original_price THEN
          
          -- 할인된 가격 계산 (소수점 둘째자리까지)
          NEW.price = ROUND(
            NEW.original_price * (1 - COALESCE(NEW.discount_percentage, 0) / 100), 
            2
          );
          
          -- 계산된 가격이 0보다 작으면 0으로 설정
          IF NEW.price < 0 THEN
            NEW.price = 0;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ========================================
    // 4. 자동 가격 계산 트리거 추가
    // ========================================
    
    console.log("🔗 [Migration] 자동 가격 계산 트리거 추가...");
    
    await queryRunner.query(`
      CREATE TRIGGER calculate_price_trigger
        BEFORE INSERT OR UPDATE ON "products"
        FOR EACH ROW
        EXECUTE FUNCTION calculate_discounted_price();
    `);

    // ========================================
    // 5. 모든 상품의 가격 재계산
    // ========================================
    
    console.log("💰 [Migration] 모든 상품 가격 재계산...");
    
    await queryRunner.query(`
      UPDATE "products" 
      SET "discount_percentage" = "discount_percentage"
      WHERE TRUE
    `);

    // ========================================
    // 6. 데이터 검증 및 요약
    // ========================================
    
    const stats = await queryRunner.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN "discount_percentage" > 0 THEN 1 END) as discounted_products,
        ROUND(AVG("discount_percentage"), 2) as avg_discount,
        MAX("discount_percentage") as max_discount,
        MIN("price") as min_price,
        MAX("price") as max_price
      FROM "products"
    `);

    console.log("📊 [Migration] 가격 계산 시스템 구축 결과:");
    console.log(`  - 총 상품 수: ${stats[0].total_products}개`);
    console.log(`  - 할인 상품 수: ${stats[0].discounted_products}개`);
    console.log(`  - 평균 할인율: ${stats[0].avg_discount}%`);
    console.log(`  - 최대 할인율: ${stats[0].max_discount}%`);
    console.log(`  - 가격 범위: ${parseInt(stats[0].min_price).toLocaleString()}원 ~ ${parseInt(stats[0].max_price).toLocaleString()}원`);

    console.log("✅ [Migration] discount 필드 추가 및 가격 계산 시스템 구축 완료!");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log("🔄 [Migration] discount 필드 제거 및 시스템 롤백 시작...");

    // 트리거 제거
    await queryRunner.query(`DROP TRIGGER IF EXISTS calculate_price_trigger ON "products"`);
    
    // 함수 제거
    await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_discounted_price()`);
    
    // 필드 제거
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "discount_percentage"`);

    console.log("✅ [Migration] discount 필드 제거 및 시스템 롤백 완료");
  }
}