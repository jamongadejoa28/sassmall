/**
 * Mock 상품 리뷰 데이터 생성
 * 기존 11개 + 신규 989개 = 총 1000개
 */

const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

// 한국 사용자 이름 풀
const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '조', '백', '허', '유'];
const maleNames = ['민수', '지훈', '성민', '현우', '동현', '준혁', '상훈', '지원', '태현', '승현', '우진', '민준', '도현', '건우', '현수', '진우', '성호', '준서', '시우', '예준'];
const femaleNames = ['지은', '수연', '예진', '민정', '하은', '서연', '지현', '유진', '소연', '미래', '은지', '혜진', '나연', '다은', '채영', '지우', '수빈', '예원', '가은', '서현'];

// 리뷰 템플릿 (평점별)
const REVIEW_TEMPLATES = {
    5: [
        '정말 만족스러운 제품입니다! 품질도 좋고 배송도 빠르네요.',
        '기대했던 것보다 훨씬 좋아요. 강력 추천합니다!',
        '가격 대비 성능이 뛰어나네요. 다시 주문할 예정입니다.',
        '완벽한 제품이에요! 포장도 꼼꼼하게 잘 되어있었어요.',
        '사용해보니 정말 좋습니다. 주변에도 추천했어요.',
        '품질이 정말 우수하고 디자인도 마음에 들어요.',
        '기능이 다양하고 사용하기 편리합니다. 매우 만족해요.',
        '오래 쓸 수 있을 것 같아요. 내구성이 좋아 보입니다.'
    ],
    4: [
        '대체로 만족스럽습니다. 약간의 아쉬운 부분이 있지만 괜찮아요.',
        '좋은 제품이네요. 다만 가격이 조금 비싼 편인 것 같아요.',
        '품질은 좋은데 배송이 조금 늦었어요. 그래도 추천합니다.',
        '사용하기 편리하고 기능도 괜찮습니다. 만족해요.',
        '예상보다 좋아요. 몇 가지 개선점이 있으면 더 좋겠어요.',
        '전반적으로 만족스럽습니다. 재구매 의향 있어요.',
        '품질 좋고 실용적이에요. 작은 불편함은 있지만 괜찮습니다.'
    ],
    3: [
        '평범한 제품이에요. 나쁘지는 않지만 특별하지도 않아요.',
        '가격 대비 그럭저럭 괜찮은 것 같아요.',
        '기능은 되지만 기대했던 것보다는 아쉬워요.',
        '보통 수준의 제품입니다. 필요에 따라 구매하세요.',
        '무난한 제품이네요. 큰 장단점은 없어 보여요.',
        '사용할 만은 해요. 더 좋은 대안이 있을 수도 있겠네요.'
    ],
    2: [
        '기대했던 것보다 많이 아쉬워요. 개선이 필요할 것 같습니다.',
        '품질이 생각보다 별로네요. 가격에 비해 아쉬움이 많아요.',
        '사용하기에 불편한 부분들이 있어요. 재고려가 필요할 듯.',
        '배송은 빨랐지만 제품 품질이 기대에 못 미쳐요.',
        '몇 가지 문제점들이 있어서 만족스럽지 못해요.'
    ],
    1: [
        '정말 실망스러운 제품입니다. 추천하지 않아요.',
        '품질이 너무 안 좋아요. 반품하고 싶습니다.',
        '사용할 수 없을 정도로 문제가 많아요.',
        '가격만 비싸고 품질은 최악이에요. 돈이 아까워요.',
        '완전히 불량품인 것 같아요. 환불 받고 싶습니다.'
    ]
};

function generateKoreanName() {
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const isMale = Math.random() > 0.5;
    const nameList = isMale ? maleNames : femaleNames;
    const name = nameList[Math.floor(Math.random() * nameList.length)];
    return surname + name;
}

// 가중치 기반 평점 생성 (5점이 가장 많이, 1점이 가장 적게)
function generateRating() {
    const weights = [0.05, 0.1, 0.15, 0.25, 0.45]; // 1점~5점 확률
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
        if (random <= sum) {
            return i + 1;
        }
    }
    return 5; // 기본값
}

function generateReviewContent(rating) {
    const templates = REVIEW_TEMPLATES[rating];
    const baseContent = templates[Math.floor(Math.random() * templates.length)];
    
    // 가끔 추가 내용 덧붙이기
    const additions = [
        ' 친구들에게도 소개해주고 싶어요.',
        ' 다음에 또 구매할 예정입니다.',
        ' 고객센터 응대도 친절했어요.',
        ' 포장이 정말 꼼꼼하게 되어있었습니다.',
        ' 생각보다 빨리 도착했어요.',
        ' 사용설명서도 잘 되어있네요.',
        ' 가족들도 만족해해요.'
    ];
    
    if (Math.random() < 0.4) { // 40% 확률로 추가 내용
        const addition = additions[Math.floor(Math.random() * additions.length)];
        return baseContent + addition;
    }
    
    return baseContent;
}

async function getProductIds() {
    return new Promise((resolve, reject) => {
        const command = `PGPASSWORD=rlarkdmf docker exec postgres-products psql -U postgres -d shopping_mall_products -t -c "SELECT id FROM products ORDER BY RANDOM();"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                const productIds = stdout.trim().split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.match(/^[0-9a-f-]+$/));
                resolve(productIds);
            }
        });
    });
}

async function insertReviewBatch(reviews) {
    return new Promise((resolve, reject) => {
        const values = reviews.map(review => {
            const escapedUserName = review.user_name.replace(/'/g, "''");
            const escapedContent = review.content.replace(/'/g, "''");
            
            return `('${review.id}', '${review.product_id}', '${escapedUserName}', ${review.rating}, '${escapedContent}', ${review.is_verified_purchase}, ${review.helpful_count}, '${review.created_at.toISOString()}', '${review.updated_at.toISOString()}')`;
        }).join(',\n');
        
        const sql = `INSERT INTO product_reviews (
            id, product_id, user_name, rating, content, is_verified_purchase, helpful_count, created_at, updated_at
        ) VALUES \n${values};`;
        
        const tempFile = `temp_reviews_${Date.now()}.sql`;
        fs.writeFileSync(tempFile, sql);
        
        const command = `PGPASSWORD=rlarkdmf docker exec -i postgres-products psql -U postgres -d shopping_mall_products < ${tempFile}`;
        
        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error(`리뷰 배치 삽입 실패: ${error}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function generateReview(productId) {
    const rating = generateRating();
    const userName = generateKoreanName();
    const content = generateReviewContent(rating);
    const isVerifiedPurchase = Math.random() < 0.8; // 80% 확률로 구매 인증
    const helpfulCount = Math.floor(Math.random() * 20); // 0-19 도움이 됨
    
    return {
        id: uuidv4(),
        product_id: productId,
        user_name: userName,
        rating,
        content,
        is_verified_purchase: isVerifiedPurchase,
        helpful_count: helpfulCount,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)), // 지난 1년 내
        updated_at: new Date()
    };
}

async function generateAndInsertReviews(totalReviews = 989) {
    console.log(`🚀 ${totalReviews}개의 상품 리뷰 생성 및 삽입 시작...`);
    
    const productIds = await getProductIds();
    console.log(`📦 총 ${productIds.length}개 상품에 리뷰 분배`);
    
    const batchSize = 50;
    let totalInserted = 0;
    let ratingStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (let i = 0; i < totalReviews; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, totalReviews - i);
        const batch = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
            // 상품을 랜덤하게 선택 (인기 상품은 리뷰가 더 많도록)
            const productId = productIds[Math.floor(Math.random() * productIds.length)];
            const review = generateReview(productId);
            batch.push(review);
            ratingStats[review.rating]++;
        }
        
        try {
            await insertReviewBatch(batch);
            totalInserted += batch.length;
            console.log(`✅ ${totalInserted}/${totalReviews} 리뷰 삽입 완료`);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`❌ 리뷰 배치 ${i}-${i + currentBatchSize} 삽입 실패:`, error);
            throw error;
        }
    }
    
    console.log(`\n🎉 모든 리뷰 생성 완료!`);
    console.log(`📊 평점 분포:`);
    console.log(`   - ⭐️⭐️⭐️⭐️⭐️ (5점): ${ratingStats[5]}개`);
    console.log(`   - ⭐️⭐️⭐️⭐️ (4점): ${ratingStats[4]}개`);
    console.log(`   - ⭐️⭐️⭐️ (3점): ${ratingStats[3]}개`);
    console.log(`   - ⭐️⭐️ (2점): ${ratingStats[2]}개`);
    console.log(`   - ⭐️ (1점): ${ratingStats[1]}개`);
    
    return { totalInserted, ratingStats };
}

// 메인 실행
if (require.main === module) {
    generateAndInsertReviews(989).catch(console.error);
}

module.exports = { generateAndInsertReviews };