/**
 * 누락된 재고 데이터 생성
 */

const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

async function getMissingProductIds() {
    return new Promise((resolve, reject) => {
        const command = `PGPASSWORD=rlarkdmf docker exec postgres-products psql -U postgres -d shopping_mall_products -t -c "SELECT id FROM products WHERE id NOT IN (SELECT product_id FROM inventories);"`;
        
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

async function generateInventoryBatch(productIds) {
    return new Promise((resolve, reject) => {
        const values = productIds.map(productId => {
            const quantity = Math.floor(Math.random() * 1000 + 10);
            const availableQuantity = Math.floor(quantity * (0.8 + Math.random() * 0.2));
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

async function main() {
    try {
        console.log('🔍 누락된 상품 ID 조회 중...');
        const missingProductIds = await getMissingProductIds();
        console.log(`📦 재고 생성 필요한 상품: ${missingProductIds.length}개`);
        
        if (missingProductIds.length === 0) {
            console.log('✅ 모든 상품에 재고가 존재합니다.');
            return;
        }
        
        const batchSize = 50;
        let totalInserted = 0;
        
        for (let i = 0; i < missingProductIds.length; i += batchSize) {
            const batchIds = missingProductIds.slice(i, i + batchSize);
            try {
                await generateInventoryBatch(batchIds);
                totalInserted += batchIds.length;
                console.log(`✅ ${totalInserted}/${missingProductIds.length} 재고 데이터 생성 완료`);
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`❌ 재고 배치 생성 실패:`, error);
                throw error;
            }
        }
        
        console.log(`🎉 모든 재고 생성 완료! 총 ${totalInserted}개`);
    } catch (error) {
        console.error('❌ 재고 생성 중 오류:', error);
        throw error;
    }
}

main().catch(console.error);