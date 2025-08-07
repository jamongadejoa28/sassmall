/**
 * 배치 방식으로 Mock 사용자 데이터 생성 및 삽입
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { exec } = require('child_process');
const fs = require('fs');

// 한국 성씨와 이름 데이터
const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '조', '백', '허', '유'];
const maleNames = ['민수', '지훈', '성민', '현우', '동현', '준혁', '상훈', '지원', '태현', '승현', '우진', '민준', '도현', '건우', '현수', '진우', '성호', '준서', '시우', '예준'];
const femaleNames = ['지은', '수연', '예진', '민정', '하은', '서연', '지현', '유진', '소연', '미래', '은지', '혜진', '나연', '다은', '채영', '지우', '수빈', '예원', '가은', '서현'];

const emailDomains = ['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'yahoo.co.kr', 'outlook.com'];

const addresses = [
    { postal: '06234', addr: '서울특별시 강남구 테헤란로', detail: '101동 202호' },
    { postal: '48058', addr: '부산광역시 해운대구 센텀중앙로', detail: '203호' },
    { postal: '21554', addr: '인천광역시 남동구 구월동', detail: '12층 1201호' },
    { postal: '35229', addr: '대전광역시 서구 둔산로', detail: '5동 504호' },
    { postal: '41545', addr: '대구광역시 북구 칠성로', detail: '3층 302호' },
    { postal: '61475', addr: '광주광역시 동구 중앙로', detail: '8층 801호' },
    { postal: '44543', addr: '울산광역시 남구 삼산로', detail: '15동 1503호' },
    { postal: '16489', addr: '경기도 수원시 영통구 월드컵로', detail: '102호' },
    { postal: '13529', addr: '경기도 성남시 분당구 정자로', detail: '1504호' },
    { postal: '10881', addr: '경기도 파주시 문산읍', detail: '201호' }
];

function generatePhoneNumber() {
    const middle = Math.floor(Math.random() * 9000) + 1000;
    const last = Math.floor(Math.random() * 9000) + 1000;
    return `010${middle}${last}`;
}

function generateKoreanName() {
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const isMale = Math.random() > 0.5;
    const nameList = isMale ? maleNames : femaleNames;
    const name = nameList[Math.floor(Math.random() * nameList.length)];
    return surname + name;
}

function generateUniqueEmail(usedEmails, attemptCount = 0) {
    if (attemptCount > 10) {
        // 10번 시도해도 안 되면 타임스탬프 추가
        const timestamp = Date.now();
        const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
        return `user${timestamp}@${domain}`;
    }
    
    const randomNum = Math.floor(Math.random() * 999999);
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const email = `user${randomNum}@${domain}`;
    
    if (usedEmails.has(email)) {
        return generateUniqueEmail(usedEmails, attemptCount + 1);
    }
    
    usedEmails.add(email);
    return email;
}

function getRandomAddress() {
    const addr = addresses[Math.floor(Math.random() * addresses.length)];
    const buildingNum = Math.floor(Math.random() * 200) + 1;
    const detailNum = Math.floor(Math.random() * 999) + 1;
    return {
        postalCode: addr.postal,
        address: addr.addr + ' ' + buildingNum,
        detailAddress: addr.detail.replace(/\d+/g, detailNum.toString())
    };
}

async function insertUserBatch(users) {
    return new Promise((resolve, reject) => {
        // INSERT 문 생성
        const values = users.map(user => {
            const escapedName = user.name.replace(/'/g, "''");
            const escapedEmail = user.email.replace(/'/g, "''");
            const escapedAddress = user.address.replace(/'/g, "''");
            const escapedDetailAddress = user.detailAddress.replace(/'/g, "''");
            
            return `('${user.id}', '${escapedName}', '${escapedEmail}', '${user.password}', '${user.role}', '${user.phoneNumber}', ${user.isActive}, '${user.postalCode}', '${escapedAddress}', '${escapedDetailAddress}', null, null, null, '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}')`;
        }).join(',\n');
        
        const sql = `INSERT INTO users (
            id, name, email, password, role, "phoneNumber", "isActive", 
            "postalCode", address, "detailAddress", "deactivatedAt", 
            "lastLoginAt", "refreshToken", "createdAt", "updatedAt"
        ) VALUES \n${values};`;
        
        // 임시 SQL 파일 생성
        const tempFile = `temp_batch_${Date.now()}.sql`;
        fs.writeFileSync(tempFile, sql);
        
        // PostgreSQL에 삽입
        const command = `PGPASSWORD=rlarkdmf docker exec -i postgres-users psql -U postgres -d shopping_mall_users < ${tempFile}`;
        
        exec(command, (error, stdout, stderr) => {
            // 임시 파일 삭제
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error(`배치 삽입 실패: ${error}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function generateAndInsertUsers(totalUsers = 2996) {
    const saltRounds = 10;
    const defaultPassword = await bcrypt.hash('password123', saltRounds);
    const batchSize = 100; // 작은 배치 크기로 안정성 확보
    const usedEmails = new Set();
    
    console.log(`🚀 ${totalUsers}명의 사용자 생성 및 삽입 시작...`);
    
    let totalInserted = 0;
    let adminCount = 0;
    let customerCount = 0;
    
    for (let i = 0; i < totalUsers; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, totalUsers - i);
        const batch = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
            const name = generateKoreanName();
            const email = generateUniqueEmail(usedEmails);
            const addr = getRandomAddress();
            const isAdmin = Math.random() < 0.05; // 5% admin
            
            if (isAdmin) adminCount++;
            else customerCount++;
            
            const user = {
                id: uuidv4(),
                name: name,
                email: email,
                password: defaultPassword,
                role: isAdmin ? 'admin' : 'customer',
                phoneNumber: generatePhoneNumber(),
                isActive: Math.random() < 0.95,
                postalCode: addr.postalCode,
                address: addr.address,
                detailAddress: addr.detailAddress,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
                updatedAt: new Date()
            };
            
            batch.push(user);
        }
        
        try {
            await insertUserBatch(batch);
            totalInserted += batch.length;
            console.log(`✅ ${totalInserted}/${totalUsers} 사용자 삽입 완료`);
            
            // 너무 빠르게 요청하지 않도록 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`❌ 배치 ${i}-${i + currentBatchSize} 삽입 실패:`, error);
            throw error;
        }
    }
    
    console.log(`\n🎉 모든 사용자 생성 완료!`);
    console.log(`📊 통계:`);
    console.log(`   - 총 생성: ${totalInserted}명`);
    console.log(`   - 관리자: ${adminCount}명`);
    console.log(`   - 고객: ${customerCount}명`);
    
    return { totalInserted, adminCount, customerCount };
}

// 메인 실행
if (require.main === module) {
    generateAndInsertUsers(2996).catch(console.error);
}

module.exports = { generateAndInsertUsers };