import "reflect-metadata"; // TypeORM 데코레이터용
import { TestDataSource } from "./infrastructure/database/test-data-source";

// 전역 테스트 설정
beforeAll(async () => {
  // 테스트 시작 전 데이터베이스 연결 확인
  if (!TestDataSource.isInitialized) {
    try {
      await TestDataSource.initialize();
      console.log("✅ Test database connected");
    } catch (error) {
      console.error("❌ Test database connection failed:", error);
      throw error;
    }
  }
});

afterAll(async () => {
  // 모든 테스트 완료 후 연결 해제
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
    console.log("✅ Test database disconnected");
  }
});

// 각 테스트 후 데이터 정리 (선택적)
// afterEach(async () => {
//   if (TestDataSource.isInitialized) {
//     await TestDataSource.query('DELETE FROM cart_items');
//     await TestDataSource.query('DELETE FROM carts');
//   }
// });
