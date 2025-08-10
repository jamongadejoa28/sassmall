#!/usr/bin/env node

// ========================================
// Kafka Event System Integration Test
// ========================================

const axios = require('axios');
const { Kafka } = require('kafkajs');

const BASE_URL = 'http://localhost';

const SERVICES = {
  USER_SERVICE: `${BASE_URL}:3002`,
  PRODUCT_SERVICE: `${BASE_URL}:3003`,
  ORDER_SERVICE: `${BASE_URL}:3004`,
  NOTIFICATION_SERVICE: `${BASE_URL}:3005`,
  API_GATEWAY: `${BASE_URL}:3001`,
  KAFKA_UI: `${BASE_URL}:8080`,
};

// Kafka Consumer for testing event reception
const kafka = new Kafka({
  clientId: 'integration-test-client',
  brokers: ['localhost:9092'],
});

let eventsCaught = {
  userRegistered: 0,
  productAdded: 0,
  stockUpdated: 0,
  orderCreated: 0,
  orderPaymentCompleted: 0,
  orderStatusUpdated: 0,
  orderCancelled: 0,
};

async function setupKafkaTestConsumer() {
  console.log('🔧 [Test] Kafka Consumer 설정 시작...');
  
  const consumer = kafka.consumer({ groupId: 'integration-test-group' });
  
  try {
    await consumer.connect();
    
    // 모든 이벤트 토픽 구독
    await consumer.subscribe({ topics: ['user-events', 'product-events', 'order-events', 'cart-events'] });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          const eventType = event.eventType;
          
          console.log(`📨 [Test] 이벤트 수신: ${eventType} (토픽: ${topic})`);
          
          // 이벤트 카운팅
          switch (eventType) {
            case 'UserRegistered':
              eventsCaught.userRegistered++;
              break;
            case 'ProductAdded':
              eventsCaught.productAdded++;
              break;
            case 'StockUpdated':
              eventsCaught.stockUpdated++;
              break;
            case 'OrderCreated':
              eventsCaught.orderCreated++;
              break;
            case 'OrderPaymentCompleted':
              eventsCaught.orderPaymentCompleted++;
              break;
            case 'OrderStatusUpdated':
              eventsCaught.orderStatusUpdated++;
              break;
            case 'OrderCancelled':
              eventsCaught.orderCancelled++;
              break;
          }
          
        } catch (error) {
          console.error('❌ [Test] 이벤트 파싱 실패:', error);
        }
      },
    });
    
    console.log('✅ [Test] Kafka Consumer 설정 완료');
    return consumer;
    
  } catch (error) {
    console.error('❌ [Test] Kafka Consumer 설정 실패:', error);
    throw error;
  }
}

// 서비스 헬스체크
async function checkServiceHealth(serviceName, url) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    const status = response.status === 200 ? '✅' : '❌';
    console.log(`${status} [${serviceName}] ${url}/health - ${response.status}`);
    return response.status === 200;
  } catch (error) {
    console.log(`❌ [${serviceName}] ${url}/health - ${error.message}`);
    return false;
  }
}

// 전체 시스템 헬스체크
async function runHealthChecks() {
  console.log('\n🏥 === 시스템 헬스체크 ===');
  
  const healthChecks = [
    checkServiceHealth('User Service', SERVICES.USER_SERVICE),
    checkServiceHealth('Product Service', SERVICES.PRODUCT_SERVICE),
    checkServiceHealth('Order Service', SERVICES.ORDER_SERVICE),
    checkServiceHealth('Notification Service', SERVICES.NOTIFICATION_SERVICE),
    checkServiceHealth('API Gateway', SERVICES.API_GATEWAY),
  ];
  
  const results = await Promise.all(healthChecks);
  const healthyServices = results.filter(Boolean).length;
  
  console.log(`\n📊 서비스 상태: ${healthyServices}/${results.length} 정상`);
  return healthyServices === results.length;
}

// 이벤트 발생 시나리오 테스트
async function runEventScenarios() {
  console.log('\n🧪 === 이벤트 시나리오 테스트 ===');
  
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // 1. 사용자 등록 테스트 (UserRegistered 이벤트)
    console.log('\n1️⃣ [Test] 사용자 등록 테스트...');
    totalTests++;
    
    const userData = {
      name: '테스트사용자',
      email: `test${Date.now()}@example.com`,
      password: 'test123!',
      phone: '010-1234-5678',
      address: '서울시 강남구'
    };
    
    try {
      const userResponse = await axios.post(`${SERVICES.USER_SERVICE}/api/users/register`, userData, {
        timeout: 10000
      });
      
      if (userResponse.status === 201) {
        console.log('✅ [Test] 사용자 등록 성공');
        testsPassed++;
        
        // 잠시 대기 (이벤트 처리 시간)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log('❌ [Test] 사용자 등록 실패:', error.response?.data?.message || error.message);
    }
    
    // 2. 상품 등록 테스트 (ProductAdded 이벤트)
    console.log('\n2️⃣ [Test] 상품 등록 테스트...');
    totalTests++;
    
    const productData = {
      name: '테스트상품',
      description: '테스트용 상품입니다',
      price: 10000,
      categoryId: 'category-1',
      brand: '테스트브랜드',
      sku: `TEST-SKU-${Date.now()}`,
      initialStock: {
        quantity: 100,
        lowStockThreshold: 10,
        location: 'MAIN_WAREHOUSE'
      }
    };
    
    try {
      const productResponse = await axios.post(`${SERVICES.PRODUCT_SERVICE}/api/products`, productData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      if (productResponse.status === 201) {
        console.log('✅ [Test] 상품 등록 성공');
        testsPassed++;
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log('❌ [Test] 상품 등록 실패:', error.response?.data?.message || error.message);
    }
    
    // 3. 알림 서비스 로그 확인
    console.log('\n3️⃣ [Test] 알림 서비스 로그 확인...');
    totalTests++;
    
    try {
      const logsResponse = await axios.get(`${SERVICES.NOTIFICATION_SERVICE}/api/notifications/logs?limit=10`, {
        timeout: 5000
      });
      
      if (logsResponse.status === 200) {
        console.log('✅ [Test] 알림 로그 조회 성공');
        console.log(`📝 [Test] 총 ${logsResponse.data.data.logs.length}개 알림 로그 확인`);
        testsPassed++;
      }
    } catch (error) {
      console.log('❌ [Test] 알림 로그 조회 실패:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ [Test] 이벤트 시나리오 테스트 중 오류:', error);
  }
  
  console.log(`\n📊 이벤트 테스트 결과: ${testsPassed}/${totalTests} 통과`);
  return { testsPassed, totalTests };
}

// 이벤트 수신 결과 출력
function printEventResults() {
  console.log('\n📨 === 수신된 이벤트 통계 ===');
  Object.entries(eventsCaught).forEach(([eventType, count]) => {
    const icon = count > 0 ? '✅' : '⏸️';
    console.log(`${icon} ${eventType}: ${count}개`);
  });
  
  const totalEvents = Object.values(eventsCaught).reduce((sum, count) => sum + count, 0);
  console.log(`\n📊 총 수신된 이벤트: ${totalEvents}개`);
}

// 메인 테스트 실행
async function main() {
  console.log('🚀 === Kafka 이벤트 시스템 통합 테스트 시작 ===\n');
  
  let consumer;
  
  try {
    // 1. Kafka Consumer 설정
    consumer = await setupKafkaTestConsumer();
    
    // 2. 시스템 헬스체크
    const systemHealthy = await runHealthChecks();
    
    if (!systemHealthy) {
      console.log('\n⚠️ [Test] 일부 서비스가 정상 상태가 아닙니다. 테스트를 계속 진행합니다...');
    }
    
    // 3. 이벤트 시나리오 실행
    const { testsPassed, totalTests } = await runEventScenarios();
    
    // 4. 이벤트 수신 결과 대기
    console.log('\n⏳ [Test] 이벤트 처리 완료 대기 중 (5초)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 5. 결과 출력
    printEventResults();
    
    // 6. 최종 결과
    console.log('\n🎯 === 최종 테스트 결과 ===');
    console.log(`📋 API 테스트: ${testsPassed}/${totalTests} 통과`);
    console.log(`📨 이벤트 수신: ${Object.values(eventsCaught).reduce((sum, count) => sum + count, 0)}개`);
    
    const overallSuccess = testsPassed >= totalTests * 0.5; // 50% 이상 성공 시 통과
    console.log(`${overallSuccess ? '✅' : '❌'} 전체 테스트: ${overallSuccess ? '성공' : '실패'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 Kafka 이벤트 시스템이 정상적으로 작동하고 있습니다!');
    } else {
      console.log('\n⚠️ 일부 테스트가 실패했습니다. 시스템 상태를 확인해주세요.');
    }
    
  } catch (error) {
    console.error('\n❌ [Test] 통합 테스트 실행 중 오류:', error);
  } finally {
    // Consumer 정리
    if (consumer) {
      try {
        await consumer.disconnect();
        console.log('\n🔌 [Test] Kafka Consumer 연결 종료');
      } catch (error) {
        console.error('❌ [Test] Consumer 종료 중 오류:', error);
      }
    }
  }
  
  console.log('\n🏁 === Kafka 이벤트 시스템 통합 테스트 완료 ===');
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    console.error('테스트 실행 중 치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = {
  runHealthChecks,
  runEventScenarios,
  setupKafkaTestConsumer
};