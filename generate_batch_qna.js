/**
 * Mock 상품 QnA 데이터 생성
 * 기존 13개 + 신규 987개 = 총 1000개
 */

const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

// 한국 사용자 이름 풀
const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '조', '백', '허', '유'];
const maleNames = ['민수', '지훈', '성민', '현우', '동현', '준혁', '상훈', '지원', '태현', '승현', '우진', '민준', '도현', '건우', '현수', '진우', '성호', '준서', '시우', '예준'];
const femaleNames = ['지은', '수연', '예진', '민정', '하은', '서연', '지현', '유진', '소연', '미래', '은지', '혜진', '나연', '다은', '채영', '지우', '수빈', '예원', '가은', '서현'];

// 질문 템플릿들
const QUESTION_TEMPLATES = [
    // 일반적인 제품 문의
    '이 제품의 정확한 크기가 어떻게 되나요?',
    '배송은 언제쯤 가능한가요?',
    '색상 다른 옵션도 있나요?',
    'A/S는 어떻게 받을 수 있나요?',
    '품질보증 기간이 어떻게 되나요?',
    '실제 사용해보신 분들의 후기가 궁금합니다.',
    '사이즈 교환이나 반품이 가능한가요?',
    '설치나 조립이 어려운가요?',
    '다른 브랜드 제품과 호환되나요?',
    '전력 소비량은 어느 정도인가요?',
    
    // 전자제품 관련
    '전자파 인증은 받았나요?',
    '전력 효율 등급이 어떻게 되나요?',
    '무선 연결이 안정적인가요?',
    '앱으로 제어가 가능한가요?',
    '소음이 많이 나나요?',
    
    // 의류/패션 관련
    '실제 착용감은 어떤가요?',
    '세탁 방법이 까다로운가요?',
    '신축성이 있나요?',
    '계절에 상관없이 입을 수 있나요?',
    '정사이즈인가요, 크게 나오나요?',
    
    // 생활용품 관련
    '사용법이 간단한가요?',
    '내구성은 어떤가요?',
    '청소나 관리가 어렵나요?',
    '냄새가 나지 않나요?',
    '친환경 소재인가요?',
    
    // 컴퓨터/IT 관련
    '시스템 요구사항이 어떻게 되나요?',
    '호환되는 운영체제는 무엇인가요?',
    '성능은 어느 정도인가요?',
    '업데이트는 자동으로 되나요?',
    '기술 지원은 받을 수 있나요?'
];

// 답변 템플릿들
const ANSWER_TEMPLATES = [
    '안녕하세요! 문의해주신 내용에 대해 답변드립니다.',
    '문의해주셔서 감사합니다. 자세히 안내해드리겠습니다.',
    '고객님의 질문에 대해 정확한 정보를 제공해드리겠습니다.',
    '문의사항에 대해 확인 후 답변드립니다.',
    '궁금하신 점에 대해 상세히 설명드리겠습니다.'
];

const ANSWER_ENDINGS = [
    '추가 궁금한 점이 있으시면 언제든 문의해주세요.',
    '도움이 되셨기를 바라며, 감사합니다.',
    '더 궁금한 사항이 있으시면 고객센터로 연락주세요.',
    '구매에 도움이 되셨으면 좋겠습니다.',
    '언제든지 추가 문의 환영합니다.'
];

function generateKoreanName() {
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const isMale = Math.random() > 0.5;
    const nameList = isMale ? maleNames : femaleNames;
    const name = nameList[Math.floor(Math.random() * nameList.length)];
    return surname + name;
}

function generateQuestion() {
    const template = QUESTION_TEMPLATES[Math.floor(Math.random() * QUESTION_TEMPLATES.length)];
    
    // 가끔 질문을 조금 변형
    const variations = [
        ' 급해요!',
        ' 빠른 답변 부탁드립니다.',
        ' 구매 예정인데 확인 부탁드려요.',
        ' 선물용으로 구매하려고 하는데요.',
        ' 처음 구매해보는데 조언 부탁드립니다.'
    ];
    
    if (Math.random() < 0.3) { // 30% 확률로 변형 추가
        const variation = variations[Math.floor(Math.random() * variations.length)];
        return template + variation;
    }
    
    return template;
}

function generateAnswer() {
    const intro = ANSWER_TEMPLATES[Math.floor(Math.random() * ANSWER_TEMPLATES.length)];
    const ending = ANSWER_ENDINGS[Math.floor(Math.random() * ANSWER_ENDINGS.length)];
    
    // 중간 내용들
    const middles = [
        '해당 제품은 고품질 소재로 제작되어 내구성이 우수합니다.',
        '정품 인증을 받은 제품으로 품질보증이 가능합니다.',
        '전국 무료배송으로 2-3일 내 배송 예정입니다.',
        '사용법이 간단하여 누구나 쉽게 사용하실 수 있습니다.',
        '고객 만족도가 높은 인기 제품입니다.',
        'A/S는 구매 후 1년간 무상으로 제공됩니다.',
        '다양한 옵션을 준비하고 있으니 선택하셔서 주문해주세요.',
        '실제 구매고객들의 후기도 매우 긍정적입니다.'
    ];
    
    const middle = middles[Math.floor(Math.random() * middles.length)];
    return `${intro} ${middle} ${ending}`;
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

async function insertQnABatch(qnas) {
    return new Promise((resolve, reject) => {
        const values = qnas.map(qna => {
            const escapedUserName = qna.user_name.replace(/'/g, "''");
            const escapedQuestion = qna.question.replace(/'/g, "''");
            const escapedAnswer = qna.answer ? `'${qna.answer.replace(/'/g, "''")}'` : 'null';
            const escapedAnsweredBy = qna.answered_by ? `'${qna.answered_by.replace(/'/g, "''")}'` : 'null';
            const answeredAt = qna.answered_at ? `'${qna.answered_at.toISOString()}'` : 'null';
            
            return `('${qna.id}', '${qna.product_id}', '${escapedUserName}', '${escapedQuestion}', ${escapedAnswer}, ${qna.is_answered}, ${escapedAnsweredBy}, ${answeredAt}, ${qna.is_public}, '${qna.created_at.toISOString()}', '${qna.updated_at.toISOString()}')`;
        }).join(',\n');
        
        const sql = `INSERT INTO product_qna (
            id, product_id, user_name, question, answer, is_answered, answered_by, answered_at, is_public, created_at, updated_at
        ) VALUES \n${values};`;
        
        const tempFile = `temp_qna_${Date.now()}.sql`;
        fs.writeFileSync(tempFile, sql);
        
        const command = `PGPASSWORD=rlarkdmf docker exec -i postgres-products psql -U postgres -d shopping_mall_products < ${tempFile}`;
        
        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error(`QnA 배치 삽입 실패: ${error}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function generateQnA(productId) {
    const userName = generateKoreanName();
    const question = generateQuestion();
    const isAnswered = Math.random() < 0.75; // 75% 확률로 답변됨
    const isPublic = Math.random() < 0.9; // 90% 공개
    
    const qna = {
        id: uuidv4(),
        product_id: productId,
        user_name: userName,
        question,
        is_answered: isAnswered,
        is_public: isPublic,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)), // 지난 1년 내
        updated_at: new Date()
    };
    
    if (isAnswered) {
        qna.answer = generateAnswer();
        qna.answered_by = '관리자';
        // 질문 후 몇 시간~며칠 뒤 답변
        qna.answered_at = new Date(qna.created_at.getTime() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    } else {
        qna.answer = null;
        qna.answered_by = null;
        qna.answered_at = null;
    }
    
    return qna;
}

async function generateAndInsertQnA(totalQnAs = 987) {
    console.log(`🚀 ${totalQnAs}개의 상품 Q&A 생성 및 삽입 시작...`);
    
    const productIds = await getProductIds();
    console.log(`📦 총 ${productIds.length}개 상품에 Q&A 분배`);
    
    const batchSize = 50;
    let totalInserted = 0;
    let answeredCount = 0;
    let publicCount = 0;
    
    for (let i = 0; i < totalQnAs; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, totalQnAs - i);
        const batch = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
            // 상품을 랜덤하게 선택
            const productId = productIds[Math.floor(Math.random() * productIds.length)];
            const qna = generateQnA(productId);
            batch.push(qna);
            
            if (qna.is_answered) answeredCount++;
            if (qna.is_public) publicCount++;
        }
        
        try {
            await insertQnABatch(batch);
            totalInserted += batch.length;
            console.log(`✅ ${totalInserted}/${totalQnAs} Q&A 삽입 완료`);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`❌ Q&A 배치 ${i}-${i + currentBatchSize} 삽입 실패:`, error);
            throw error;
        }
    }
    
    console.log(`\n🎉 모든 Q&A 생성 완료!`);
    console.log(`📊 통계:`);
    console.log(`   - 총 Q&A: ${totalInserted}개`);
    console.log(`   - 답변 완료: ${answeredCount}개`);
    console.log(`   - 미답변: ${totalInserted - answeredCount}개`);
    console.log(`   - 공개: ${publicCount}개`);
    console.log(`   - 비공개: ${totalInserted - publicCount}개`);
    
    return { totalInserted, answeredCount, publicCount };
}

// 메인 실행
if (require.main === module) {
    generateAndInsertQnA(987).catch(console.error);
}

module.exports = { generateAndInsertQnA };