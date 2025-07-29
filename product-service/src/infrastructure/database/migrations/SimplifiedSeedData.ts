// ========================================
// 06_SimplifiedSeedData - TypeORM Migration
// src/infrastructure/database/migrations/06_SimplifiedSeedData.ts
// ========================================

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 단순화된 10개 상품 시드 데이터
 * 
 * 시딩 데이터:
 * 1. 5개 주요 카테고리
 * 2. 10개 실용적인 상품 (카테고리별 2개씩)
 * 3. 상품평 및 문의 샘플 데이터
 * 4. 배송 관련 필드 완전 제거
 */
export class SimplifiedSeedData1735550100000 implements MigrationInterface {
  name = "SimplifiedSeedData1735550100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log("🌱 [Migration] 단순화된 10개 상품 시드 데이터 생성 시작...");

    // ========================================
    // 1. 카테고리 데이터 시딩 (5개 주요 카테고리)
    // ========================================

    const categories = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '전자제품',
        description: 'TV, 냉장고, 세탁기, 소형가전 등',
        slug: 'electronics',
        sort_order: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002', 
        name: '컴퓨터/노트북',
        description: '노트북, 데스크톱, 태블릿, 컴퓨터 주변기기',
        slug: 'computers',
        sort_order: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: '의류/패션',
        description: '남성복, 여성복, 신발, 가방, 액세서리',
        slug: 'fashion',
        sort_order: 3
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: '생활용품',
        description: '주방용품, 생활잡화, 청소용품, 수납정리',
        slug: 'household',
        sort_order: 4
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: '도서/문구',
        description: '도서, 전자책, 문구용품, 사무용품',
        slug: 'books',
        sort_order: 5
      }
    ];

    for (const category of categories) {
      await queryRunner.query(`
        INSERT INTO "categories" ("id", "name", "description", "slug", "sort_order", "is_active")
        VALUES ($1, $2, $3, $4, $5, true)
      `, [category.id, category.name, category.description, category.slug, category.sort_order]);
    }

    console.log("✅ [Migration] 카테고리 데이터 시딩 완료 (5개)");

    // ========================================
    // 2. 상품 데이터 시딩 (카테고리별 2개씩, 총 10개)
    // ========================================

    const products = [
      // 전자제품 (2개)
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'LG 올레드 55인치 4K 스마트TV',
        description: '완벽한 블랙 표현의 OLED 디스플레이로 생생한 화질을 경험하세요. webOS 스마트 기능과 돌비 비전 지원으로 최고의 시청 경험을 제공합니다.',
        price: 1890000,
        original_price: 2290000,
        brand: 'LG전자',
        sku: 'LG-OLED55C3',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        rating: 4.6,
        review_count: 45,
        weight: 21.6,
        tags: '["OLED", "4K", "스마트TV", "돌비비전"]',
        is_featured: true
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002', 
        name: '다이슨 V15 무선청소기',
        description: '레이저로 먼지를 감지하는 혁신적인 무선청소기입니다. 60분 연속 사용 가능한 대용량 배터리와 5단계 필터링 시스템으로 완벽한 청소를 제공합니다.',
        price: 890000,
        original_price: 990000,
        brand: 'Dyson',
        sku: 'DYSON-V15-DETECT',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        rating: 4.8,
        review_count: 89,
        weight: 3.1,
        tags: '["무선청소기", "레이저감지", "60분배터리"]',
        is_featured: false
      },
      // 컴퓨터/노트북 (2개)
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        name: 'MacBook Air M2 13인치 (256GB)',
        description: 'M2 칩의 강력한 성능과 18시간 배터리 생활. 완전히 새로워진 디자인으로 어디서나 자유롭게 작업하세요. macOS와 완벽한 호환성을 자랑합니다.',
        price: 1690000,
        original_price: 1890000,
        brand: 'Apple',
        sku: 'MBA13-M2-256',
        category_id: '550e8400-e29b-41d4-a716-446655440002',
        rating: 4.8,
        review_count: 127,
        weight: 1.24,
        dimensions: '{"width": 30.41, "height": 1.13, "depth": 21.5}',
        tags: '["M2칩", "MacBook", "18시간배터리"]',
        is_featured: true
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        name: 'LG 그램 17인치 노트북 (i7, 16GB)',
        description: '17인치 대화면에 1.35kg 초경량. 22시간 배터리로 하루 종일 업무가 가능합니다. 인텔 12세대 i7 프로세서와 16GB 메모리로 뛰어난 성능을 제공합니다.',
        price: 2290000,
        original_price: null,
        brand: 'LG전자',
        sku: 'GRAM17-I7-16GB',
        category_id: '550e8400-e29b-41d4-a716-446655440002',
        rating: 4.5,
        review_count: 68,
        weight: 1.35,
        dimensions: '{"width": 37.6, "height": 1.7, "depth": 26.0}',
        tags: '["17인치", "초경량", "22시간배터리"]',
        is_featured: false
      },
      // 의류/패션 (2개)
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        name: '유니클로 히트텍 크루넥 긴팔T',
        description: '유니클로만의 히트텍 기술로 따뜻함을 유지하면서도 얇고 가벼운 착용감. 일상복부터 이너웨어까지 다양하게 활용 가능한 필수 아이템입니다.',
        price: 14900,
        original_price: 19900,
        brand: 'UNIQLO',
        sku: 'UNIQLO-HEATTECH-LS',
        category_id: '550e8400-e29b-41d4-a716-446655440003',
        rating: 4.3,
        review_count: 203,
        weight: 0.3,
        tags: '["히트텍", "긴팔", "보온", "일상복"]',
        is_featured: false
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        name: '나이키 에어포스1 스니커즈',
        description: '1982년 출시 이후 변함없는 디자인으로 사랑받는 클래식 농구화. 편안한 착용감과 뛰어난 내구성으로 데일리 신발로 완벽합니다.',
        price: 119000,
        original_price: null,
        brand: 'Nike',
        sku: 'NIKE-AF1-WHITE',
        category_id: '550e8400-e29b-41d4-a716-446655440003',
        rating: 4.7,
        review_count: 156,
        weight: 0.8,
        tags: '["나이키", "에어포스1", "스니커즈", "클래식"]',
        is_featured: true
      },
      // 생활용품 (2개)
      {
        id: '660e8400-e29b-41d4-a716-446655440007',
        name: '스테인리스 보온보냉 텀블러 500ml',
        description: '이중벽 진공 구조로 6시간 보온, 12시간 보냉 효과. 스테인리스 스틸 소재로 위생적이고 내구성이 뛰어납니다. 밀폐형 뚜껑으로 새지 않아요.',
        price: 19900,
        original_price: 29900,
        brand: 'STANLEY',
        sku: 'STANLEY-TUMBLER-500',
        category_id: '550e8400-e29b-41d4-a716-446655440004',
        rating: 4.4,
        review_count: 78,
        weight: 0.5,
        dimensions: '{"width": 8.5, "height": 20.3, "depth": 8.5}',
        tags: '["텀블러", "보온보냉", "스테인리스", "500ml"]',
        is_featured: false
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440008',
        name: '3M 스카치브라이트 수세미 6개입',
        description: '3M 스카치브라이트 수세미로 강력한 세정력과 내구성을 경험하세요. 코팅팬도 손상시키지 않는 부드러운 재질로 안심하고 사용할 수 있습니다.',
        price: 8900,
        original_price: null,
        brand: '3M',
        sku: '3M-SCOTCH-SPONGE-6',
        category_id: '550e8400-e29b-41d4-a716-446655440004',
        rating: 4.2,
        review_count: 234,
        weight: 0.1,
        tags: '["수세미", "3M", "6개입", "주방용품"]',
        is_featured: false
      },
      // 도서/문구 (2개)
      {
        id: '660e8400-e29b-41d4-a716-446655440009',
        name: '원피스 1-105권 완결 세트',
        description: '전 세계가 사랑하는 모험 만화 원피스 완결판. 루피와 동료들의 위대한 모험을 처음부터 끝까지 완주해보세요. 소장가치가 높은 정품 도서입니다.',
        price: 945000,
        original_price: 1050000,
        brand: '대원씨아이',
        sku: 'ONEPIECE-COMPLETE-SET',
        category_id: '550e8400-e29b-41d4-a716-446655440005',
        rating: 4.9,
        review_count: 92,
        weight: 15.0,
        tags: '["원피스", "만화", "완결세트", "소장용"]',
        is_featured: true
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440010',
        name: '모나미 153 볼펜 12자루 세트 (검정)',
        description: '1963년 출시 이후 60년간 사랑받는 국민 볼펜. 부드러운 필기감과 뛰어난 내구성으로 학생부터 직장인까지 모두가 선택하는 필수 문구입니다.',
        price: 6000,
        original_price: null,
        brand: '모나미',
        sku: 'MONAMI-153-BLACK-12',
        category_id: '550e8400-e29b-41d4-a716-446655440005',
        rating: 4.1,
        review_count: 445,
        weight: 0.2,
        tags: '["모나미", "볼펜", "12자루", "검정"]',
        is_featured: false
      }
    ];

    // 상품 데이터 삽입
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product) continue; // null 체크 추가
      
      await queryRunner.query(`
        INSERT INTO "products" (
          "id", "name", "description", "price", "original_price", "brand", 
          "sku", "category_id", "rating", "review_count", "weight", "dimensions",
          "tags", "is_active", "is_featured"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)
      `, [
        product.id, product.name, product.description, product.price, product.original_price,
        product.brand, product.sku, product.category_id, product.rating, product.review_count,
        product.weight, product.dimensions || null, product.tags, product.is_featured
      ]);

      // 각 상품에 대한 재고 데이터 추가
      const inventoryQuantity = Math.floor(Math.random() * 50) + 20; // 20-70개
      const availableQuantity = Math.floor(inventoryQuantity * 0.9); // 90% 정도가 사용가능
      
      await queryRunner.query(`
        INSERT INTO "inventories" (
          "product_id", "quantity", "available_quantity", "low_stock_threshold", 
          "location", "last_restocked_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        product.id, inventoryQuantity, availableQuantity, 10,
        'MAIN_WAREHOUSE',
        new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) // 최근 15일 내 랜덤
      ]);
    }

    console.log(`✅ [Migration] 상품 및 재고 데이터 시딩 완료 (${products.length}개)`);

    // ========================================
    // 3. 상품평 샘플 데이터 추가
    // ========================================

    const sampleReviews = [
      // LG OLED TV 리뷰들
      { product_id: '660e8400-e29b-41d4-a716-446655440001', user_name: '김지훈', rating: 5, content: '화질이 정말 선명하고 색감이 생생해요! OLED 기술력이 대단합니다. 영화 볼 때마다 감탄하고 있어요.', is_verified: true },
      { product_id: '660e8400-e29b-41d4-a716-446655440001', user_name: '박영희', rating: 4, content: '좋긴 한데 가격이 좀 비싸네요. 그래도 화질만큼은 최고입니다.', is_verified: true },
      { product_id: '660e8400-e29b-41d4-a716-446655440001', user_name: '이민수', rating: 5, content: '검은색 표현이 완전 블랙이라서 명암비가 엄청나요. 게임할 때도 완전 만족!', is_verified: false },
      
      // 다이슨 청소기 리뷰들  
      { product_id: '660e8400-e29b-41d4-a716-446655440002', user_name: '최수진', rating: 5, content: '레이저 기능이 신기해요! 보이지 않던 먼지까지 다 보여서 깨끗하게 청소할 수 있어요.', is_verified: true },
      { product_id: '660e8400-e29b-41d4-a716-446655440002', user_name: '정태호', rating: 4, content: '흡입력 좋고 무선이라 편해요. 다만 무거운 편이라 팔이 좀 아파요.', is_verified: true },
      
      // MacBook Air 리뷰들
      { product_id: '660e8400-e29b-41d4-a716-446655440003', user_name: '한소영', rating: 5, content: 'M2 칩 성능이 정말 뛰어나네요. 배터리도 하루 종일 쓸 수 있어서 만족합니다!', is_verified: true },
      { product_id: '660e8400-e29b-41d4-a716-446655440003', user_name: '김동현', rating: 5, content: '가볍고 얇아서 들고 다니기 편해요. 디자인도 세련되고 성능도 훌륭합니다.', is_verified: true },
      
      // 나이키 신발 리뷰들
      { product_id: '660e8400-e29b-41d4-a716-446655440006', user_name: '송지은', rating: 5, content: '클래식한 디자인이 어떤 옷에나 잘 어울려요. 착용감도 편하고 내구성도 좋네요.', is_verified: true },
      { product_id: '660e8400-e29b-41d4-a716-446655440006', user_name: '임현우', rating: 4, content: '신발이 좀 무거운 편이긴 하지만 디자인과 품질은 만족해요.', is_verified: false },
      
      // 원피스 만화 리뷰들
      { product_id: '660e8400-e29b-41d4-a716-446655440009', user_name: '오성민', rating: 5, content: '드디어 완결까지 다 모았네요! 25년간의 대서사가 정말 감동적이에요.', is_verified: true },
      { product_id: '660e8400-e29b-41d4-a716-446655440009', user_name: '윤미래', rating: 5, content: '아이가 너무 좋아해요. 포장 상태도 깔끔하고 정품이라 안심됩니다.', is_verified: true }
    ];

    for (let i = 0; i < sampleReviews.length; i++) {
      const review = sampleReviews[i];
      if (!review) continue; // null 체크 추가
      
      await queryRunner.query(`
        INSERT INTO "product_reviews" (
          "product_id", "user_name", "rating", "content", 
          "is_verified_purchase", "helpful_count"
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        review.product_id, review.user_name, review.rating, 
        review.content, review.is_verified, Math.floor(Math.random() * 20)
      ]);
    }

    console.log(`✅ [Migration] 상품평 데이터 시딩 완료 (${sampleReviews.length}개)`);

    // ========================================
    // 4. 상품문의 샘플 데이터 추가
    // ========================================

    const sampleQnA = [
      // LG OLED TV 문의들
      { product_id: '660e8400-e29b-41d4-a716-446655440001', user_name: '김철수', question: '벽걸이 브라켓은 별도 구매해야 하나요?', answer: '네, 벽걸이 브라켓은 별도 구매하셔야 합니다. LG 정품 브라켓을 권장드려요.', answered_by: '고객센터' },
      { product_id: '660e8400-e29b-41d4-a716-446655440001', user_name: '이영미', question: 'AS 기간은 얼마나 되나요?', answer: '구매일로부터 2년간 무상 A/S가 제공됩니다.', answered_by: '고객센터' },
      
      // MacBook 문의들  
      { product_id: '660e8400-e29b-41d4-a716-446655440003', user_name: '박준혁', question: '메모리 업그레이드 가능한가요?', answer: 'M2 MacBook Air는 메모리가 온보드 방식이라 업그레이드가 불가능합니다.', answered_by: '기술지원팀' },
      { product_id: '660e8400-e29b-41d4-a716-446655440003', user_name: '정수연', question: '충전기 별도 구매 가능한가요?', answer: '네, Apple 정품 충전기를 별도 구매하실 수 있습니다.', answered_by: '고객센터' },
      
      // 나이키 신발 문의들
      { product_id: '660e8400-e29b-41d4-a716-446655440006', user_name: '강태우', question: '사이즈 교환 가능한가요?', answer: '새 제품 상태에서 7일 이내 교환 가능합니다.', answered_by: '교환팀' },
      { product_id: '660e8400-e29b-41d4-a716-446655440006', user_name: '홍지영', question: '260mm면 몇 사이즈인가요?', answer: '나이키 기준으로 260mm는 41.5사이즈에 해당합니다.', answered_by: '고객센터' },
      
      // 텀블러 문의
      { product_id: '660e8400-e29b-41d4-a716-446655440007', user_name: '신동욱', question: '식기세척기 사용 가능한가요?', answer: null, answered_by: null }, // 미답변
      
      // 원피스 만화 문의
      { product_id: '660e8400-e29b-41d4-a716-446655440009', user_name: '조민정', question: '중고책인가요 새책인가요?', answer: '정품 새책입니다. 포장된 상태로 배송됩니다.', answered_by: '상품팀' }
    ];

    for (let i = 0; i < sampleQnA.length; i++) {
      const qna = sampleQnA[i];
      if (!qna) continue; // null 체크 추가
      const isAnswered = qna.answer !== null;
      
      // 질문 생성 시간 (1~10일 전 랜덤)
      const questionCreatedAt = new Date(Date.now() - (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000);
      
      // 답변 시간은 질문 시간 이후 1~7일 내 랜덤 (답변이 있는 경우에만)
      let answeredAt = null;
      if (isAnswered) {
        const minAnswerDelay = 1 * 60 * 60 * 1000; // 최소 1시간 후
        const maxAnswerDelay = 7 * 24 * 60 * 60 * 1000; // 최대 7일 후
        const answerDelay = Math.random() * (maxAnswerDelay - minAnswerDelay) + minAnswerDelay;
        answeredAt = new Date(questionCreatedAt.getTime() + answerDelay);
      }
      
      await queryRunner.query(`
        INSERT INTO "product_qna" (
          "product_id", "user_name", "question", "answer", 
          "is_answered", "answered_by", "answered_at", "is_public", "created_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
      `, [
        qna.product_id, qna.user_name, qna.question, qna.answer,
        isAnswered, qna.answered_by, answeredAt, questionCreatedAt
      ]);
    }

    console.log(`✅ [Migration] 상품문의 데이터 시딩 완료 (${sampleQnA.length}개)`);

    // ========================================
    // 5. 데이터 검증 및 요약
    // ========================================

    const categoryStats = await queryRunner.query(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as product_count,
        ROUND(AVG(p.price)) as avg_price,
        COUNT(CASE WHEN p.is_featured THEN 1 END) as featured_count
      FROM "categories" c
      LEFT JOIN "products" p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.sort_order
      ORDER BY c.sort_order
    `);

    console.log("📊 [Migration] 카테고리별 상품 현황:");
    categoryStats.forEach((stat: any) => {
      console.log(`  - ${stat.category_name}: ${stat.product_count}개 (평균가격: ${parseInt(stat.avg_price).toLocaleString()}원, 추천: ${stat.featured_count}개)`);
    });

    const reviewStats = await queryRunner.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 1) as avg_rating,
        COUNT(CASE WHEN is_verified_purchase THEN 1 END) as verified_reviews
      FROM "product_reviews"
    `);

    console.log("⭐ [Migration] 상품평 현황:");
    console.log(`  - 총 리뷰: ${reviewStats[0].total_reviews}개`);
    console.log(`  - 평균 평점: ${reviewStats[0].avg_rating}점`);
    console.log(`  - 구매인증 리뷰: ${reviewStats[0].verified_reviews}개`);

    const qnaStats = await queryRunner.query(`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN is_answered THEN 1 END) as answered_count,
        COUNT(CASE WHEN NOT is_answered THEN 1 END) as unanswered_count
      FROM "product_qna"
    `);

    console.log("❓ [Migration] 상품문의 현황:");
    console.log(`  - 총 문의: ${qnaStats[0].total_questions}개`);
    console.log(`  - 답변 완료: ${qnaStats[0].answered_count}개`);
    console.log(`  - 답변 대기: ${qnaStats[0].unanswered_count}개`);

    console.log("🎉 [Migration] 단순화된 10개 상품 시드 데이터 생성 완료!");
    console.log("🚀 [Migration] 배송 관련 복잡한 필드가 제거된 깔끔한 구조로 완성!");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log("🔄 [Migration] 시드 데이터 롤백 시작...");

    // 시간 순서가 잘못된 상품문의 데이터 수정
    console.log("🔧 [Migration] 상품문의 시간 순서 수정 중...");
    
    // answered_at이 created_at보다 이른 경우를 찾아서 수정
    const problematicQnAs = await queryRunner.query(`
      SELECT id, created_at, answered_at 
      FROM "product_qna" 
      WHERE answered_at IS NOT NULL 
      AND answered_at < created_at
    `);

    console.log(`🔍 [Migration] 시간 순서가 잘못된 문의 ${problematicQnAs.length}개 발견`);

    for (const qna of problematicQnAs) {
      // 답변 시간을 질문 시간 이후 1시간~7일 내 랜덤으로 설정
      const questionTime = new Date(qna.created_at);
      const minAnswerDelay = 1 * 60 * 60 * 1000; // 1시간
      const maxAnswerDelay = 7 * 24 * 60 * 60 * 1000; // 7일
      const answerDelay = Math.random() * (maxAnswerDelay - minAnswerDelay) + minAnswerDelay;
      const newAnsweredAt = new Date(questionTime.getTime() + answerDelay);

      await queryRunner.query(`
        UPDATE "product_qna" 
        SET answered_at = $1 
        WHERE id = $2
      `, [newAnsweredAt, qna.id]);

      console.log(`✅ [Migration] QnA ${qna.id} 시간 순서 수정: ${qna.created_at} → ${newAnsweredAt.toISOString()}`);
    }

    await queryRunner.query(`DELETE FROM "product_qna"`);
    await queryRunner.query(`DELETE FROM "product_reviews"`);
    await queryRunner.query(`DELETE FROM "inventories"`);
    await queryRunner.query(`DELETE FROM "products"`);
    await queryRunner.query(`DELETE FROM "categories"`);

    console.log("✅ [Migration] 시드 데이터 롤백 완료");
  }
}