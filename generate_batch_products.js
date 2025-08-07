/**
 * Mock 상품 데이터 생성 및 삽입
 * 기존 13개 + 신규 987개 = 총 1000개
 */

const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

// 기존 카테고리 ID (실제 DB에서 가져온 값)
const CATEGORIES = {
    '550e8400-e29b-41d4-a716-446655440001': '전자제품',
    '550e8400-e29b-41d4-a716-446655440002': '컴퓨터/노트북', 
    '550e8400-e29b-41d4-a716-446655440003': '의류/패션',
    '550e8400-e29b-41d4-a716-446655440004': '생활용품',
    '550e8400-e29b-41d4-a716-446655440005': '도서/문구'
};

// 카테고리별 상품 데이터 템플릿
const PRODUCT_TEMPLATES = {
    '550e8400-e29b-41d4-a716-446655440001': { // 전자제품
        names: [
            'LG OLED TV 65인치', 'Samsung QLED TV 55인치', '소니 4K 스마트TV', 
            '다이슨 무선청소기', 'LG 트윈워시 세탁기', 'Samsung 양문형 냉장고',
            '에어프라이어 대용량', 'Dyson V15 청소기', 'LG 스타일러', 'Samsung 건조기',
            'Panasonic 전자레인지', 'Breville 에스프레소 머신', '필립스 에어프라이어',
            '샤프 공기청정기', 'LG 디오스 냉장고', 'Samsung 무선청소기', 
            'Bosch 식기세척기', '하만카돈 블루투스 스피커', 'JBL 사운드바', 'Sony 헤드폰'
        ],
        brands: ['LG', 'Samsung', 'Sony', 'Dyson', 'Panasonic', 'Philips', 'Bosch', 'Sharp'],
        priceRange: [100000, 5000000],
        descriptions: [
            '최신 기술이 적용된 고화질 디스플레이',
            '에너지 효율 A급 인증 제품', 
            '스마트 기능 탑재로 편리한 사용',
            '강력한 흡입력과 긴 사용시간',
            '프리미엄 디자인과 뛰어난 성능'
        ]
    },
    '550e8400-e29b-41d4-a716-446655440002': { // 컴퓨터/노트북
        names: [
            'MacBook Pro 16인치', 'MacBook Air M3', 'LG 그램 17인치', 'Samsung 갤럭시북',
            'ASUS ZenBook Pro', 'Dell XPS 13', 'HP Envy 15', 'Lenovo ThinkPad',
            '아이맥 24인치', 'Mac mini M3', 'iPad Pro 12.9', 'iPad Air 5세대',
            'Surface Pro 9', 'Surface Laptop 5', 'MSI 게이밍 노트북', 'ASUS ROG',
            'Alienware 게이밍PC', 'HP Spectre x360', '갤럭시 탭 S9', 'Xiaomi RedmiBook'
        ],
        brands: ['Apple', 'LG', 'Samsung', 'ASUS', 'Dell', 'HP', 'Lenovo', 'Microsoft', 'MSI', 'Xiaomi'],
        priceRange: [500000, 4000000],
        descriptions: [
            'M3 칩셋 탑재로 뛰어난 성능',
            '초경량 디자인과 긴 배터리 수명',
            '고해상도 디스플레이 지원',
            '전문가용 고성능 워크스테이션',
            '게이밍 최적화 설계'
        ]
    },
    '550e8400-e29b-41d4-a716-446655440003': { // 의류/패션
        names: [
            '유니클로 히트텍 긴팔', 'ZARA 기본 셔츠', 'H&M 후드티', '무지 맨투맨',
            'Nike 트레이닝복', 'Adidas 운동화', 'Converse 척테일러', '반스 올드스쿨',
            '구찌 가방', 'Louis Vuitton 지갑', 'Hermes 스카프', '샤넬 향수',
            '리바이스 501 청바지', '캘빈클라인 언더웨어', '토미힐피거 폴로셔츠',
            '나이키 에어맥스', '조던 스니커즈', 'New Balance 운동화', '아디다스 스탠스미스',
            '닥터마틴 부츠'
        ],
        brands: ['유니클로', 'ZARA', 'H&M', 'Nike', 'Adidas', 'Gucci', 'Louis Vuitton', 'Levi\'s', 'Calvin Klein', 'Tommy Hilfiger'],
        priceRange: [10000, 2000000],
        descriptions: [
            '편안한 착용감의 데일리웨어',
            '트렌디한 디자인의 패션 아이템',
            '프리미엄 소재 사용',
            '사계절 착용 가능한 베이직 아이템',
            '스타일리시한 캐주얼룩'
        ]
    },
    '550e8400-e29b-41d4-a716-446655440004': { // 생활용품
        names: [
            '3M 수세미 세트', '다우니 섬유유연제', '아리엘 세제', 'Tide 세탁포드',
            '샴푸 1L 대용량', '린스 1L', '바디워시 펌프형', '치약 12개 세트',
            '휴지 24롤', '키친타올 12롤', '행주 10매', '고무장갑 5켤레',
            '스테인리스 텀블러', '보온보냉병 500ml', '유리컵 6개 세트', '머그컵 세트',
            '수건 세트', '베개 2개 세트', '이불 세트', '매트리스 토퍼'
        ],
        brands: ['3M', 'P&G', '유한킴벌리', '애경', 'LG생건', 'CJ라이온', 'Lock&Lock', 'Tupperware'],
        priceRange: [5000, 200000],
        descriptions: [
            '일상생활 필수 아이템',
            '대용량 가족형 제품',
            '친환경 소재 사용',
            '실용적이고 경제적인 선택',
            '고품질 생활용품'
        ]
    },
    '550e8400-e29b-41d4-a716-446655440005': { // 도서/문구
        names: [
            '원피스 전권 세트', '나루토 완결 세트', '귀멸의 칼날 23권', '드래곤볼 완전판',
            '해리포터 7권 세트', '반지의 제왕 3권', '어린왕자', '1984 조지 오웰',
            'A4 복사용지 2500매', '볼펜 12자루 세트', '형광펜 6색 세트', '마커펜 세트',
            '스테들러 색연필', '파버카스텔 연필', '모나미 153 볼펜', '제브라 사라사',
            '포스트잇 대용량', '클리어파일 10매', '바인더 5개 세트', '계산기 공학용'
        ],
        brands: ['대원씨아이', '학산문화사', '소학관', '집영사', '민음사', '문학동네', '모나미', 'Zebra', 'Staedtler', 'Faber-Castell'],
        priceRange: [1000, 500000],
        descriptions: [
            '베스트셀러 도서',
            '완결 만화 전권 세트',
            '고품질 문구용품',
            '학습 및 업무용 필수품',
            '수험생 추천 도서'
        ]
    }
};

// 태그 생성
const COMMON_TAGS = {
    '550e8400-e29b-41d4-a716-446655440001': ['가전', '전자제품', '스마트', '에너지절약', 'IoT'],
    '550e8400-e29b-41d4-a716-446655440002': ['IT', '노트북', '컴퓨터', '게이밍', '업무용'],
    '550e8400-e29b-41d4-a716-446655440003': ['패션', '의류', '액세서리', '트렌드', '브랜드'],
    '550e8400-e29b-41d4-a716-446655440004': ['생활용품', '일상', '실용적', '가정용', '청소'],
    '550e8400-e29b-41d4-a716-446655440005': ['도서', '문구', '학습', '만화', '소설']
};

function generateSKU(prefix, id) {
    return `${prefix}${id.slice(-8).toUpperCase()}`;
}

function getRandomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generatePrice(range) {
    const [min, max] = range;
    const basePrice = Math.floor(Math.random() * (max - min) + min);
    // 가격을 1000원 단위로 반올림
    return Math.round(basePrice / 1000) * 1000;
}

function generateDiscountPercentage() {
    if (Math.random() < 0.3) { // 30% 확률로 할인
        return Math.floor(Math.random() * 40 + 10); // 10-50% 할인
    }
    return 0;
}

function generateProduct(categoryId) {
    const template = PRODUCT_TEMPLATES[categoryId];
    const id = uuidv4();
    
    const name = getRandomFromArray(template.names) + ' ' + (Math.floor(Math.random() * 900) + 100);
    const brand = getRandomFromArray(template.brands);
    const originalPrice = generatePrice(template.priceRange);
    const discountPercentage = generateDiscountPercentage();
    const description = getRandomFromArray(template.descriptions) + '. ' + 
                       '고품질 소재와 정교한 제작으로 만든 프리미엄 제품입니다.';
    
    const tags = [];
    const categoryTags = COMMON_TAGS[categoryId];
    for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.7) {
            const tag = getRandomFromArray(categoryTags);
            if (!tags.includes(tag)) tags.push(tag);
        }
    }
    
    return {
        id,
        name,
        description,
        originalPrice,
        discountPercentage,
        categoryId,
        brand,
        sku: generateSKU(Object.values(CATEGORIES)[Object.keys(CATEGORIES).indexOf(categoryId)].slice(0, 2).toUpperCase(), id),
        tags: JSON.stringify(tags),
        isActive: Math.random() < 0.95, // 95% 활성
        weight: Math.random() < 0.7 ? (Math.random() * 10 + 0.1).toFixed(2) : null,
        dimensions: Math.random() < 0.5 ? {
            width: Math.floor(Math.random() * 100 + 10),
            height: Math.floor(Math.random() * 100 + 10),
            depth: Math.floor(Math.random() * 100 + 10)
        } : null,
        imageUrls: [], // 이미지는 생략
        thumbnailUrl: null,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
    };
}

async function insertProductBatch(products) {
    return new Promise((resolve, reject) => {
        const values = products.map(product => {
            const escapedName = product.name.replace(/'/g, "''");
            const escapedDescription = product.description.replace(/'/g, "''");
            const escapedBrand = product.brand.replace(/'/g, "''");
            const dimensionsStr = product.dimensions ? 
                `'${JSON.stringify(product.dimensions)}'::jsonb` : 'null';
            
            return `('${product.id}', '${escapedName}', '${escapedDescription}', ${product.originalPrice}, ${product.originalPrice}, '${escapedBrand}', '${product.sku}', '${product.categoryId}', '[]'::jsonb, null, ${product.weight || 'null'}, ${dimensionsStr}, '${product.tags}'::jsonb, ${product.isActive}, ${product.discountPercentage}, '${product.createdAt.toISOString()}', '${product.updatedAt.toISOString()}')`;
        }).join(',\n');
        
        const sql = `INSERT INTO products (
            id, name, description, price, original_price, brand, sku, category_id, 
            image_urls, thumbnail_url, weight, dimensions, tags, is_active, discount_percentage,
            created_at, updated_at
        ) VALUES \n${values};`;
        
        const tempFile = `temp_products_${Date.now()}.sql`;
        fs.writeFileSync(tempFile, sql);
        
        const command = `PGPASSWORD=rlarkdmf docker exec -i postgres-products psql -U postgres -d shopping_mall_products < ${tempFile}`;
        
        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error(`상품 배치 삽입 실패: ${error}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function generateInventoryBatch(productIds) {
    return new Promise((resolve, reject) => {
        const values = productIds.map(productId => {
            const quantity = Math.floor(Math.random() * 1000 + 10);
            const availableQuantity = Math.floor(quantity * (0.8 + Math.random() * 0.2)); // 80-100% 사용 가능
            const lowStockThreshold = Math.floor(Math.random() * 20 + 5);
            const location = 'MAIN_WAREHOUSE';
            
            return `('${uuidv4()}', '${productId}', ${quantity}, ${availableQuantity}, ${lowStockThreshold}, '${location}', null, '${new Date().toISOString()}', '${new Date().toISOString()}')`;
        }).join(',\n');
        
        const sql = `INSERT INTO inventories (
            id, product_id, quantity, available_quantity, low_stock_threshold, location, last_restocked_at, created_at, updated_at
        ) VALUES \n${values};`;
        
        const tempFile = `temp_inventories_${Date.now()}.sql`;
        fs.writeFileSync(tempFile, sql);
        
        const command = `PGPASSWORD=rlarkdmf docker exec -i postgres-products psql -U postgres -d shopping_mall_products < ${tempFile}`;
        
        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error(`재고 배치 삽입 실패: ${error}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function generateAndInsertProducts(totalProducts = 987) {
    console.log(`🚀 ${totalProducts}개의 상품 생성 및 삽입 시작...`);
    
    const batchSize = 50;
    const categories = Object.keys(CATEGORIES);
    let totalInserted = 0;
    let allProductIds = [];
    
    for (let i = 0; i < totalProducts; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, totalProducts - i);
        const batch = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
            const categoryId = getRandomFromArray(categories);
            const product = generateProduct(categoryId);
            batch.push(product);
            allProductIds.push(product.id);
        }
        
        try {
            await insertProductBatch(batch);
            totalInserted += batch.length;
            console.log(`✅ ${totalInserted}/${totalProducts} 상품 삽입 완료`);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`❌ 상품 배치 ${i}-${i + currentBatchSize} 삽입 실패:`, error);
            throw error;
        }
    }
    
    // 재고 데이터 생성
    console.log(`📦 재고 데이터 생성 중...`);
    for (let i = 0; i < allProductIds.length; i += batchSize) {
        const batchIds = allProductIds.slice(i, i + batchSize);
        try {
            await generateInventoryBatch(batchIds);
            console.log(`✅ ${i + batchIds.length}/${allProductIds.length} 재고 데이터 삽입 완료`);
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`❌ 재고 배치 삽입 실패:`, error);
            throw error;
        }
    }
    
    console.log(`\n🎉 모든 상품 생성 완료!`);
    console.log(`📊 통계:`);
    console.log(`   - 총 상품: ${totalInserted}개`);
    console.log(`   - 재고 데이터: ${allProductIds.length}개`);
    
    return { totalInserted, inventoryCount: allProductIds.length };
}

// 메인 실행
if (require.main === module) {
    generateAndInsertProducts(987).catch(console.error);
}

module.exports = { generateAndInsertProducts };