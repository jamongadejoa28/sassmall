/**
 * Mock 주문 및 주문 아이템 데이터 생성
 * 기존 4개 + 신규 996개 = 총 1000개
 * 
 * 중요: users.id와 products.id 간의 실제 관계 유지
 */

const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

// 주문 상태 분포 (실제 쇼핑몰 패턴)
const ORDER_STATUS_WEIGHTS = {
    'PENDING': 0.02,                // 2% - 대기중
    'PAYMENT_IN_PROGRESS': 0.01,    // 1% - 결제중 
    'PAYMENT_COMPLETED': 0.05,      // 5% - 결제완료
    'PAYMENT_FAILED': 0.02,         // 2% - 결제실패
    'CONFIRMED': 0.10,              // 10% - 주문확정
    'PREPARING_SHIPMENT': 0.05,     // 5% - 배송준비
    'SHIPPING': 0.10,               // 10% - 배송중
    'DELIVERED': 0.60,              // 60% - 배송완료 (가장 많음)
    'CANCELLED': 0.03,              // 3% - 취소됨
    'REFUND_IN_PROGRESS': 0.01,     // 1% - 환불중
    'REFUNDED': 0.01                // 1% - 환불완료
};

const PAYMENT_METHODS = ['KAKAOPAY', 'CARD', 'BANK_TRANSFER', 'TOSSPAYMENTS'];

// 한국 주소 데이터
const ADDRESSES = [
    { postal: '06234', addr: '서울특별시 강남구 테헤란로', name: '김철수', phone: '01012345678' },
    { postal: '48058', addr: '부산광역시 해운대구 센텀중앙로', name: '이영희', phone: '01023456789' },
    { postal: '21554', addr: '인천광역시 남동구 구월동', name: '박민수', phone: '01034567890' },
    { postal: '35229', addr: '대전광역시 서구 둔산로', name: '최지현', phone: '01045678901' },
    { postal: '41545', addr: '대구광역시 북구 칠성로', name: '정수연', phone: '01056789012' },
    { postal: '61475', addr: '광주광역시 동구 중앙로', name: '강동현', phone: '01067890123' },
    { postal: '44543', addr: '울산광역시 남구 삼산로', name: '조미래', phone: '01078901234' },
    { postal: '16489', addr: '경기도 수원시 영통구 월드컵로', name: '윤태현', phone: '01089012345' },
    { postal: '13529', addr: '경기도 성남시 분당구 정자로', name: '장승현', phone: '01090123456' },
    { postal: '10881', addr: '경기도 파주시 문산읍', name: '임우진', phone: '01001234567' }
];

async function getUserIds() {
    return new Promise((resolve, reject) => {
        const command = `PGPASSWORD=rlarkdmf docker exec postgres-users psql -U postgres -d shopping_mall_users -t -c "SELECT id FROM users WHERE role='customer' ORDER BY RANDOM();"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                const userIds = stdout.trim().split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.match(/^[0-9a-f-]+$/));
                resolve(userIds);
            }
        });
    });
}

async function getProductsWithPrices() {
    return new Promise((resolve, reject) => {
        const command = `PGPASSWORD=rlarkdmf docker exec postgres-products psql -U postgres -d shopping_mall_products -t -c "SELECT id, name, price FROM products WHERE is_active = true ORDER BY RANDOM();"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                const products = stdout.trim().split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.includes('|'))
                    .map(line => {
                        const parts = line.split('|').map(p => p.trim());
                        return {
                            id: parts[0],
                            name: parts[1],
                            price: parseFloat(parts[2])
                        };
                    });
                resolve(products);
            }
        });
    });
}

function getRandomStatus() {
    const random = Math.random();
    let sum = 0;
    for (const [status, weight] of Object.entries(ORDER_STATUS_WEIGHTS)) {
        sum += weight;
        if (random <= sum) {
            return status;
        }
    }
    return 'DELIVERED'; // 기본값
}

function generateOrderNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `ORD${dateStr}${randomStr}`;
}

function getRandomAddress() {
    const addr = ADDRESSES[Math.floor(Math.random() * ADDRESSES.length)];
    const buildingNum = Math.floor(Math.random() * 200) + 1;
    const detailNum = Math.floor(Math.random() * 999) + 101;
    
    return {
        postalCode: addr.postal,
        address: `${addr.addr} ${buildingNum}`,
        detailAddress: `${detailNum}호`,
        recipientName: addr.name,
        recipientPhone: addr.phone
    };
}

function generateOrderItems(products, maxItems = 5) {
    const itemCount = Math.floor(Math.random() * maxItems) + 1; // 1-5개 상품
    const selectedProducts = [];
    const usedProductIds = new Set();
    
    // 중복 없이 상품 선택
    for (let i = 0; i < itemCount; i++) {
        let product;
        let attempts = 0;
        do {
            product = products[Math.floor(Math.random() * products.length)];
            attempts++;
        } while (usedProductIds.has(product.id) && attempts < 10);
        
        if (!usedProductIds.has(product.id)) {
            usedProductIds.add(product.id);
            const quantity = Math.floor(Math.random() * 3) + 1; // 1-3개 수량
            const totalPrice = product.price * quantity;
            
            selectedProducts.push({
                id: uuidv4(),
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                quantity: quantity,
                totalPrice: totalPrice
            });
        }
    }
    
    return selectedProducts;
}

async function insertOrderBatch(orders) {
    return new Promise((resolve, reject) => {
        const orderValues = orders.map(order => {
            const shipping = order.shipping;
            const escapedMemo = order.memo ? `'${order.memo.replace(/'/g, "''")}'` : 'null';
            
            return `('${order.id}', '${order.orderNumber}', '${order.userId}', '${order.status}', '${shipping.postalCode}', '${shipping.address.replace(/'/g, "''")}', '${shipping.detailAddress.replace(/'/g, "''")}', '${shipping.recipientName.replace(/'/g, "''")}', '${shipping.recipientPhone}', '${order.paymentMethod}', '${order.paymentId || ''}', ${order.subtotal}, ${order.shippingFee}, ${order.totalAmount}, ${escapedMemo}, '${order.orderedAt.toISOString()}', '${order.createdAt.toISOString()}', '${order.updatedAt.toISOString()}')`;
        }).join(',\n');
        
        const orderSql = `INSERT INTO orders (
            id, order_number, user_id, status, shipping_postal_code, shipping_address, 
            shipping_detail_address, recipient_name, recipient_phone, payment_method, 
            payment_id, subtotal, shipping_fee, total_amount, memo, ordered_at, created_at, updated_at
        ) VALUES \n${orderValues};`;
        
        // 주문 아이템 SQL 생성
        let itemValues = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                itemValues.push(`('${item.id}', '${order.id}', '${item.productId}', '${item.productName.replace(/'/g, "''")}', ${item.productPrice}, ${item.quantity}, ${item.totalPrice}, null, null, '${new Date().toISOString()}', '${new Date().toISOString()}')`);
            });
        });
        
        const itemSql = itemValues.length > 0 ? `\nINSERT INTO order_items (
            id, order_id, product_id, product_name, product_price, quantity, 
            total_price, product_image_url, product_options, created_at, updated_at
        ) VALUES \n${itemValues.join(',\n')};` : '';
        
        const fullSql = orderSql + itemSql;
        
        const tempFile = `temp_orders_${Date.now()}.sql`;
        fs.writeFileSync(tempFile, fullSql);
        
        const command = `PGPASSWORD=rlarkdmf docker exec -i postgres-orders psql -U postgres -d shopping_mall_orders < ${tempFile}`;
        
        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error(`주문 배치 삽입 실패: ${error}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function generateOrder(userId, products) {
    const orderItems = generateOrderItems(products);
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const shippingFee = subtotal >= 50000 ? 0 : 3000; // 5만원 이상 무료배송
    const totalAmount = subtotal + shippingFee;
    
    const shipping = getRandomAddress();
    const status = getRandomStatus();
    const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
    
    const orderedAt = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)); // 지난 1년 내
    
    return {
        id: uuidv4(),
        orderNumber: generateOrderNumber(),
        userId: userId,
        status: status,
        shipping: shipping,
        paymentMethod: paymentMethod,
        paymentId: `${paymentMethod}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        subtotal: subtotal,
        shippingFee: shippingFee,
        totalAmount: totalAmount,
        memo: Math.random() < 0.3 ? '배송 전 연락 부탁드립니다.' : null,
        orderedAt: orderedAt,
        createdAt: orderedAt,
        updatedAt: new Date(),
        items: orderItems
    };
}

async function generateAndInsertOrders(totalOrders = 996) {
    console.log(`🚀 ${totalOrders}개의 주문 데이터 생성 및 삽입 시작...`);
    
    console.log('👥 사용자 ID 조회 중...');
    const userIds = await getUserIds();
    console.log(`✅ ${userIds.length}명의 고객 확인`);
    
    console.log('📦 상품 정보 조회 중...');
    const products = await getProductsWithPrices();
    console.log(`✅ ${products.length}개의 활성 상품 확인`);
    
    if (userIds.length === 0 || products.length === 0) {
        throw new Error('사용자 또는 상품 데이터가 없습니다.');
    }
    
    const batchSize = 25; // 주문은 복잡하므로 작은 배치 크기
    let totalInserted = 0;
    let statusStats = {};
    let totalOrderItems = 0;
    
    // 상태별 통계 초기화
    Object.keys(ORDER_STATUS_WEIGHTS).forEach(status => {
        statusStats[status] = 0;
    });
    
    for (let i = 0; i < totalOrders; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, totalOrders - i);
        const batch = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
            // 사용자를 랜덤하게 선택 (일부 사용자는 더 많은 주문 가능)
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            const order = generateOrder(userId, products);
            batch.push(order);
            
            statusStats[order.status]++;
            totalOrderItems += order.items.length;
        }
        
        try {
            await insertOrderBatch(batch);
            totalInserted += batch.length;
            console.log(`✅ ${totalInserted}/${totalOrders} 주문 삽입 완료`);
            
            await new Promise(resolve => setTimeout(resolve, 200)); // 조금 더 긴 대기
        } catch (error) {
            console.error(`❌ 주문 배치 ${i}-${i + currentBatchSize} 삽입 실패:`, error);
            throw error;
        }
    }
    
    console.log(`\n🎉 모든 주문 생성 완료!`);
    console.log(`📊 통계:`);
    console.log(`   - 총 주문: ${totalInserted}개`);
    console.log(`   - 총 주문 아이템: ${totalOrderItems}개`);
    console.log(`   - 평균 주문 아이템 수: ${(totalOrderItems / totalInserted).toFixed(1)}개`);
    console.log(`\n📋 주문 상태별 분포:`);
    
    Object.entries(statusStats).forEach(([status, count]) => {
        if (count > 0) {
            console.log(`   - ${status}: ${count}개 (${(count / totalInserted * 100).toFixed(1)}%)`);
        }
    });
    
    return { totalInserted, totalOrderItems, statusStats };
}

// 메인 실행
if (require.main === module) {
    generateAndInsertOrders(996).catch(console.error);
}

module.exports = { generateAndInsertOrders };