// ========================================
// 데이터베이스 클리너
// cart-service/src/__tests__/utils/DatabaseCleaner.ts
// ========================================

import { DataSource } from "typeorm";

export class DatabaseCleaner {
  constructor(private dataSource: DataSource) {}

  /**
   * 모든 테스트 데이터 삭제
   */
  async cleanAll(): Promise<void> {
    await this.dataSource.query("TRUNCATE TABLE cart_items CASCADE");
    await this.dataSource.query("TRUNCATE TABLE carts CASCADE");
  }

  /**
   * 특정 사용자의 장바구니 삭제
   */
  async cleanUserCart(userId: string): Promise<void> {
    await this.dataSource.query("DELETE FROM carts WHERE user_id = $1", [
      userId,
    ]);
  }

  /**
   * 특정 세션의 장바구니 삭제
   */
  async cleanSessionCart(sessionId: string): Promise<void> {
    await this.dataSource.query("DELETE FROM carts WHERE session_id = $1", [
      sessionId,
    ]);
  }

  /**
   * 테스트 데이터 존재 여부 확인
   */
  async countCarts(): Promise<number> {
    const result = await this.dataSource.query(
      "SELECT COUNT(*) as count FROM carts"
    );
    return parseInt(result[0].count);
  }

  async countCartItems(): Promise<number> {
    const result = await this.dataSource.query(
      "SELECT COUNT(*) as count FROM cart_items"
    );
    return parseInt(result[0].count);
  }
}
