// ========================================
// 개선된 TestUtils.ts - UUID 생성 보장 및 실무적 헬퍼
// cart-service/src/test-utils/TestUtils.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

export class TestUtils {
  /**
   * ✅ 확실한 UUID 생성 (user_id, product_id용)
   */
  static generateUserId(): string {
    return uuidv4();
  }

  static generateProductId(): string {
    return uuidv4();
  }

  static generateCartId(): string {
    return uuidv4();
  }

  /**
   * ✅ 세션 ID 생성 (varchar이므로 문자열 가능)
   */
  static generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ✅ 실무적 테스트 데이터 생성
   */
  static createTestUser() {
    return {
      id: this.generateUserId(),
      email: `test-${Date.now()}@example.com`,
      name: `Test User ${Date.now()}`,
    };
  }

  static createTestProduct(name?: string) {
    return {
      id: this.generateProductId(),
      name: name || `Test Product ${Date.now()}`,
      price: this.generatePrice(1000, 50000),
      stock: this.generateQuantity(10, 100), // ✅ 재고 추가
    };
  }

  /**
   * ✅ 실무적 시나리오용 데이터 생성
   */
  static generatePrice(min: number = 1000, max: number = 50000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateQuantity(min: number = 1, max: number = 10): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * ✅ 동시성 테스트용 시간 지연
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ✅ UUID 검증
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * ✅ 실무적 시나리오 헬퍼들
   */
  static createBulkProducts(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: this.generateProductId(),
      name: `Product ${i + 1}`,
      price: (i + 1) * 1000,
      stock: Math.floor(Math.random() * 50) + 10,
    }));
  }

  static createBulkUsers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: this.generateUserId(),
      email: `user${i + 1}@test.com`,
      name: `User ${i + 1}`,
    }));
  }

  /**
   * ✅ 재고 부족 시나리오용
   */
  static createLowStockProduct() {
    return {
      id: this.generateProductId(),
      name: "Low Stock Product",
      price: 5000,
      stock: 1, // 재고 1개만
    };
  }

  static createOutOfStockProduct() {
    return {
      id: this.generateProductId(),
      name: "Out of Stock Product",
      price: 3000,
      stock: 0, // 품절
    };
  }
}
