// ========================================
// 02_SeedInitialData - TypeORM Migration
// src/infrastructure/database/migrations/02_SeedInitialData.ts
// ========================================

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 초기 데이터 시딩
 * 
 * 시딩 데이터:
 * 1. 카테고리 계층 구조 (3단계 깊이)
 * 2. 샘플 상품 데이터 (각 카테고리별)
 * 3. 재고 초기 데이터
 * 
 * 계층 구조 예시:
 * - 전자제품 (depth: 0)
 *   ├── 컴퓨터 (depth: 1)
 *   │   ├── 노트북 (depth: 2)
 *   │   └── 데스크톱 (depth: 2)
 *   └── 스마트폰 (depth: 1)
 *       ├── 안드로이드 (depth: 2)
 *       └── 아이폰 (depth: 2)
 */
export class SeedInitialData1734567890124 implements MigrationInterface {
  name = "SeedInitialData1734567890124";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log("🌱 [Migration] 초기 데이터 시딩 시작...");

    // ========================================
    // 1. 카테고리 계층 구조 시딩
    // ========================================

    // 루트 카테고리들 (depth: 0)
    const rootCategories = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '전자제품',
        description: '전자제품 및 IT 기기 전반',
        slug: 'electronics',
        depth: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002', 
        name: '의류',
        description: '남성, 여성, 아동 의류',
        slug: 'clothing',
        depth: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: '도서',
        description: '각종 도서 및 전자책',
        slug: 'books',
        depth: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: '생활용품',
        description: '일상생활에 필요한 각종 용품',
        slug: 'household',
        depth: 0
      }
    ];

    for (const category of rootCategories) {
      await queryRunner.query(`
        INSERT INTO "categories" ("id", "name", "description", "slug", "parentId", "depth", "isActive", "productCount")
        VALUES ($1, $2, $3, $4, NULL, $5, true, 0)
      `, [category.id, category.name, category.description, category.slug, category.depth]);
    }

    // 1차 하위 카테고리들 (depth: 1)
    const subCategories = [
      // 전자제품 하위
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: '컴퓨터',
        description: '데스크톱, 노트북, 태블릿',
        slug: 'computers',
        parentId: '550e8400-e29b-41d4-a716-446655440001',
        depth: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: '스마트폰',
        description: '각종 스마트폰 및 액세서리',
        slug: 'smartphones',
        parentId: '550e8400-e29b-41d4-a716-446655440001',
        depth: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440013',
        name: '가전제품',
        description: '냉장고, 세탁기, 에어컨 등',
        slug: 'appliances',
        parentId: '550e8400-e29b-41d4-a716-446655440001',
        depth: 1
      },
      // 의류 하위
      {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: '남성의류',
        description: '남성 상의, 하의, 아우터',
        slug: 'men-clothing',
        parentId: '550e8400-e29b-41d4-a716-446655440002',
        depth: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440022',
        name: '여성의류',
        description: '여성 상의, 하의, 드레스',
        slug: 'women-clothing',
        parentId: '550e8400-e29b-41d4-a716-446655440002',
        depth: 1
      },
      // 도서 하위
      {
        id: '550e8400-e29b-41d4-a716-446655440031',
        name: '소설',
        description: '한국소설, 외국소설',
        slug: 'novels',
        parentId: '550e8400-e29b-41d4-a716-446655440003',
        depth: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440032',
        name: '기술서적',
        description: 'IT, 프로그래밍, 기술 관련 서적',
        slug: 'tech-books',
        parentId: '550e8400-e29b-41d4-a716-446655440003',
        depth: 1
      }
    ];

    for (const category of subCategories) {
      await queryRunner.query(`
        INSERT INTO "categories" ("id", "name", "description", "slug", "parentId", "depth", "isActive", "productCount")
        VALUES ($1, $2, $3, $4, $5, $6, true, 0)
      `, [category.id, category.name, category.description, category.slug, category.parentId, category.depth]);
    }

    // 2차 하위 카테고리들 (depth: 2)
    const leafCategories = [
      // 컴퓨터 하위
      {
        id: '550e8400-e29b-41d4-a716-446655440111',
        name: '노트북',
        description: '게이밍, 업무용, 맥북',
        slug: 'laptops',
        parentId: '550e8400-e29b-41d4-a716-446655440011',
        depth: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440112',
        name: '데스크톱',
        description: '완제품, 조립 PC',
        slug: 'desktops',
        parentId: '550e8400-e29b-41d4-a716-446655440011',
        depth: 2
      },
      // 스마트폰 하위
      {
        id: '550e8400-e29b-41d4-a716-446655440121',
        name: '안드로이드',
        description: '삼성, LG, 구글 픽셀',
        slug: 'android',
        parentId: '550e8400-e29b-41d4-a716-446655440012',
        depth: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440122',
        name: '아이폰',
        description: 'iPhone 시리즈',
        slug: 'iphone',
        parentId: '550e8400-e29b-41d4-a716-446655440012',
        depth: 2
      }
    ];

    for (const category of leafCategories) {
      await queryRunner.query(`
        INSERT INTO "categories" ("id", "name", "description", "slug", "parentId", "depth", "isActive", "productCount")
        VALUES ($1, $2, $3, $4, $5, $6, true, 0)
      `, [category.id, category.name, category.description, category.slug, category.parentId, category.depth]);
    }

    console.log("✅ [Migration] 카테고리 계층 구조 시딩 완료 (총 15개 카테고리)");

    // ========================================
    // 2. 샘플 상품 데이터 시딩
    // ========================================

    const sampleProducts = [
      // 노트북 상품들
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'MacBook Pro 16인치 M3 Pro',
        description: 'Apple의 최신 M3 Pro 칩을 탑재한 고성능 노트북. 18GB RAM, 512GB SSD로 개발자와 크리에이터를 위한 최적의 선택.',
        price: 3299000,
        categoryId: '550e8400-e29b-41d4-a716-446655440111',
        brand: 'Apple',
        sku: 'MBP16-M3PRO-18-512',
        weight: 2.14,
        dimensions: '{"width": 35.57, "height": 2.41, "depth": 24.81}',
        tags: '["노트북", "맥북", "M3", "고성능", "개발"]',
        discountPrice: 2999000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        name: 'LG 그램 17인치 2024',
        description: '17인치 대화면에 1.35kg의 초경량 노트북. 22시간 배터리 지속시간으로 이동성과 생산성을 동시에.',
        price: 1899000,
        categoryId: '550e8400-e29b-41d4-a716-446655440111',
        brand: 'LG',
        sku: 'GRAM17-2024-I7-16',
        weight: 1.35,
        dimensions: '{"width": 38.09, "height": 1.78, "depth": 26.5}',
        tags: '["노트북", "그램", "경량", "대화면", "업무용"]',
        discountPrice: null
      },
      // 스마트폰 상품들
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        name: 'iPhone 15 Pro Max',
        description: 'A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰. 48MP 카메라와 ProRes 동영상 촬영 지원.',
        price: 1550000,
        categoryId: '550e8400-e29b-41d4-a716-446655440122',
        brand: 'Apple',
        sku: 'IP15PM-256-NT',
        weight: 0.221,
        dimensions: '{"width": 76.7, "height": 159.9, "depth": 8.25}',
        tags: '["스마트폰", "아이폰", "A17Pro", "티타늄", "카메라"]',
        discountPrice: 1450000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        name: '갤럭시 S24 Ultra',
        description: 'AI 기능이 강화된 삼성의 플래그십 스마트폰. S펜과 200MP 카메라로 생산성과 창작 활동 지원.',
        price: 1398000,
        categoryId: '550e8400-e29b-41d4-a716-446655440121',
        brand: 'Samsung',
        sku: 'GS24U-256-TB',
        weight: 0.232,
        dimensions: '{"width": 79.0, "height": 162.3, "depth": 8.6}',
        tags: '["스마트폰", "갤럭시", "S펜", "AI", "200MP"]',
        discountPrice: null
      },
      // 도서 상품들
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        name: 'Clean Code: 애자일 소프트웨어 장인 정신',
        description: '로버트 C. 마틴의 클린 코드 원칙을 담은 필독서. 읽기 쉽고 유지보수 가능한 코드 작성법을 배운다.',
        price: 33000,
        categoryId: '550e8400-e29b-41d4-a716-446655440032',
        brand: '인사이트',
        sku: 'BOOK-CLEANCODE-KR',
        weight: 0.65,
        dimensions: null,
        tags: '["도서", "프로그래밍", "클린코드", "개발", "필독서"]',
        discountPrice: 29700
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        name: '토지 1-20권 세트',
        description: '박경리 작가의 대하소설 토지 전권 세트. 한국 근현대사를 배경으로 한 대서사시.',
        price: 198000,
        categoryId: '550e8400-e29b-41d4-a716-446655440031',
        brand: '마로니에북스',
        sku: 'BOOK-TOJI-SET-20',
        weight: 8.5,
        dimensions: null,
        tags: '["도서", "소설", "대하소설", "토지", "박경리"]',
        discountPrice: 178200
      },
      // 의류 상품들
      {
        id: '660e8400-e29b-41d4-a716-446655440007',
        name: '유니클로 히트텍 크루넥 긴팔티',
        description: '겨울철 필수 아이템인 히트텍 소재 긴팔티. 보온성과 착용감을 모두 만족하는 베이직 아이템.',
        price: 19900,
        categoryId: '550e8400-e29b-41d4-a716-446655440021',
        brand: 'UNIQLO',
        sku: 'UNI-HEATTECH-M-BLK',
        weight: 0.25,
        dimensions: null,
        tags: '["의류", "남성", "긴팔", "히트텍", "겨울"]',
        discountPrice: null
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440008',
        name: 'ZARA 울 블렌드 코트',
        description: '울 80% 블렌드 소재로 제작된 여성용 롱 코트. 클래식한 디자인으로 다양한 스타일링 가능.',
        price: 159000,
        categoryId: '550e8400-e29b-41d4-a716-446655440022',
        brand: 'ZARA',
        sku: 'ZARA-COAT-W-GREY-M',
        weight: 1.2,
        dimensions: null,
        tags: '["의류", "여성", "코트", "울", "겨울"]',
        discountPrice: 119250
      }
    ];

    for (const product of sampleProducts) {
      await queryRunner.query(`
        INSERT INTO "products" (
          "id", "name", "description", "price", "categoryId", "brand", "sku", 
          "weight", "dimensions", "tags", "isActive", "discountPrice"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
      `, [
        product.id, product.name, product.description, product.price,
        product.categoryId, product.brand, product.sku, product.weight,
        product.dimensions, product.tags, product.discountPrice
      ]);
    }

    console.log("✅ [Migration] 샘플 상품 데이터 시딩 완료 (총 8개 상품)");

    // ========================================
    // 3. 재고 초기 데이터 시딩
    // ========================================

    const sampleInventories = [
      {
        productId: '660e8400-e29b-41d4-a716-446655440001', // MacBook Pro
        quantity: 50,
        availableQuantity: 45,
        reservedQuantity: 5,
        lowStockThreshold: 10,
        location: 'MAIN_WAREHOUSE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440002', // LG 그램
        quantity: 30,
        availableQuantity: 28,
        reservedQuantity: 2,
        lowStockThreshold: 5,
        location: 'MAIN_WAREHOUSE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440003', // iPhone 15 Pro Max
        quantity: 100,
        availableQuantity: 95,
        reservedQuantity: 5,
        lowStockThreshold: 20,
        location: 'ELECTRONICS_STORE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440004', // 갤럭시 S24 Ultra
        quantity: 80,
        availableQuantity: 76,
        reservedQuantity: 4,
        lowStockThreshold: 15,
        location: 'ELECTRONICS_STORE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440005', // Clean Code
        quantity: 200,
        availableQuantity: 195,
        reservedQuantity: 5,
        lowStockThreshold: 30,
        location: 'BOOK_WAREHOUSE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440006', // 토지 세트
        quantity: 15,
        availableQuantity: 12,
        reservedQuantity: 3,
        lowStockThreshold: 5,
        location: 'BOOK_WAREHOUSE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440007', // 유니클로 긴팔티
        quantity: 500,
        availableQuantity: 480,
        reservedQuantity: 20,
        lowStockThreshold: 50,
        location: 'CLOTHING_STORE'
      },
      {
        productId: '660e8400-e29b-41d4-a716-446655440008', // ZARA 코트
        quantity: 25,
        availableQuantity: 22,
        reservedQuantity: 3,
        lowStockThreshold: 8,
        location: 'CLOTHING_STORE'
      }
    ];

    for (const inventory of sampleInventories) {
      await queryRunner.query(`
        INSERT INTO "inventories" (
          "productId", "quantity", "availableQuantity", "reservedQuantity",
          "lowStockThreshold", "location"
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        inventory.productId, inventory.quantity, inventory.availableQuantity,
        inventory.reservedQuantity, inventory.lowStockThreshold, inventory.location
      ]);
    }

    console.log("✅ [Migration] 재고 초기 데이터 시딩 완료 (총 8개 재고)");

    // ========================================
    // 4. 데이터 검증 및 요약
    // ========================================

    // 카테고리별 상품 수 검증 (트리거가 자동으로 업데이트했는지 확인)
    const categoryStats = await queryRunner.query(`
      SELECT 
        c.name as category_name,
        c.depth,
        c."productCount",
        COUNT(p.id) as actual_product_count
      FROM "categories" c
      LEFT JOIN "products" p ON c.id = p."categoryId"
      GROUP BY c.id, c.name, c.depth, c."productCount"
      ORDER BY c.depth, c.name
    `);

    console.log("📊 [Migration] 카테고리별 상품 수 현황:");
    categoryStats.forEach((stat: any) => {
      console.log(`  - ${stat.category_name} (depth: ${stat.depth}): ${stat.actual_product_count}개 상품`);
    });

    // 재고 상태 요약
    const inventoryStats = await queryRunner.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM("availableQuantity") as total_available
      FROM "inventories"
      GROUP BY status
      ORDER BY status
    `);

    console.log("📦 [Migration] 재고 상태 요약:");
    inventoryStats.forEach((stat: any) => {
      console.log(`  - ${stat.status}: ${stat.count}개 상품, 총 ${stat.total_available}개 재고`);
    });

    console.log("🎉 [Migration] 초기 데이터 시딩 완료!");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log("🔄 [Migration] 초기 데이터 시딩 롤백 시작...");

    // 재고 데이터 삭제
    await queryRunner.query(`DELETE FROM "inventories"`);
    console.log("✅ [Migration] 재고 데이터 삭제 완료");

    // 상품 데이터 삭제
    await queryRunner.query(`DELETE FROM "products"`);
    console.log("✅ [Migration] 상품 데이터 삭제 완료");

    // 카테고리 데이터 삭제 (계층 구조 역순으로)
    await queryRunner.query(`DELETE FROM "categories" WHERE "depth" = 2`);
    await queryRunner.query(`DELETE FROM "categories" WHERE "depth" = 1`);
    await queryRunner.query(`DELETE FROM "categories" WHERE "depth" = 0`);
    console.log("✅ [Migration] 카테고리 데이터 삭제 완료");

    console.log("🎉 [Migration] 초기 데이터 시딩 롤백 완료!");
  }
}