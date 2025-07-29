// ========================================
// 재고 관리 시스템 - 동시성 처리 포함
// cart-service/src/usecases/InventoryService.ts
// ========================================

import { DataSource } from "typeorm";

export interface ProductInventory {
  productId: string;
  stock: number;
  reserved: number; // 장바구니에 담긴 수량
  available: number; // 실제 구매 가능 수량
  lastUpdated: Date;
}

export interface InventoryCheckResult {
  success: boolean;
  available: number;
  requested: number;
  reason?: string;
}

export interface InventoryReservation {
  productId: string;
  quantity: number;
  cartId: string;
  expiresAt: Date; // 예약 만료 시간 (예: 30분)
}

/**
 * 재고 관리 서비스
 *
 * 실무적 특징:
 * - 동시성 처리 (DB 트랜잭션)
 * - 재고 예약 시스템 (장바구니 담기 시)
 * - 재고 부족 알림
 * - 예약 만료 처리
 */
export class InventoryService {
  constructor(private dataSource: DataSource) {}

  /**
   * 상품 재고 확인
   */
  async checkAvailability(
    productId: string,
    requestedQuantity: number
  ): Promise<InventoryCheckResult> {
    try {
      const inventory = await this.getProductInventory(productId);

      if (!inventory) {
        return {
          success: false,
          available: 0,
          requested: requestedQuantity,
          reason: "상품을 찾을 수 없습니다",
        };
      }

      if (inventory.available >= requestedQuantity) {
        return {
          success: true,
          available: inventory.available,
          requested: requestedQuantity,
        };
      }

      return {
        success: false,
        available: inventory.available,
        requested: requestedQuantity,
        reason: `재고 부족 (요청: ${requestedQuantity}, 가능: ${inventory.available})`,
      };
    } catch (error: any) {
      console.error("❌ [InventoryService] 재고 확인 오류:", error);
      return {
        success: false,
        available: 0,
        requested: requestedQuantity,
        reason: "재고 확인 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 재고 예약 (장바구니 담기 시)
   * 동시성 처리 포함
   */
  async reserveStock(
    cartId: string,
    productId: string,
    quantity: number
  ): Promise<InventoryCheckResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 비관적 락으로 재고 조회 (동시성 보장)
      const result = await queryRunner.manager.query(
        `
        SELECT stock, reserved 
        FROM product_inventory 
        WHERE product_id = $1 
        FOR UPDATE
      `,
        [productId]
      );

      if (result.length === 0) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          available: 0,
          requested: quantity,
          reason: "상품을 찾을 수 없습니다",
        };
      }

      const { stock, reserved } = result[0];
      const available = stock - reserved;

      if (available < quantity) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          available,
          requested: quantity,
          reason: `재고 부족 (가능: ${available}개)`,
        };
      }

      // 2. 기존 예약 삭제 (같은 장바구니의 같은 상품)
      await queryRunner.manager.query(
        `
        DELETE FROM inventory_reservations 
        WHERE cart_id = $1 AND product_id = $2
      `,
        [cartId, productId]
      );

      // 3. 새로운 예약 생성
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30분 후 만료
      await queryRunner.manager.query(
        `
        INSERT INTO inventory_reservations (cart_id, product_id, quantity, expires_at, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `,
        [cartId, productId, quantity, expiresAt]
      );

      // 4. 예약 수량 업데이트
      await queryRunner.manager.query(
        `
        UPDATE product_inventory 
        SET reserved = reserved - (
          SELECT COALESCE(SUM(quantity), 0) 
          FROM inventory_reservations 
          WHERE product_id = $1 AND cart_id = $2
        ) + $3,
        last_updated = NOW()
        WHERE product_id = $1
      `,
        [productId, cartId, quantity]
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        available: available - quantity,
        requested: quantity,
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("❌ [InventoryService] 재고 예약 오류:", error);
      return {
        success: false,
        available: 0,
        requested: quantity,
        reason: "재고 예약 중 오류가 발생했습니다",
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 재고 예약 해제 (장바구니에서 제거 시)
   */
  async releaseReservation(cartId: string, productId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 예약된 수량 조회
      const reservation = await queryRunner.manager.query(
        `
        SELECT quantity FROM inventory_reservations 
        WHERE cart_id = $1 AND product_id = $2
      `,
        [cartId, productId]
      );

      if (reservation.length === 0) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const reservedQuantity = reservation[0].quantity;

      // 2. 예약 삭제
      await queryRunner.manager.query(
        `
        DELETE FROM inventory_reservations 
        WHERE cart_id = $1 AND product_id = $2
      `,
        [cartId, productId]
      );

      // 3. 예약 수량 감소
      await queryRunner.manager.query(
        `
        UPDATE product_inventory 
        SET reserved = reserved - $1, last_updated = NOW()
        WHERE product_id = $2
      `,
        [reservedQuantity, productId]
      );

      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("❌ [InventoryService] 예약 해제 오류:", error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 주문 확정 시 실제 재고 차감
   */
  async confirmOrder(cartId: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 장바구니의 모든 예약 조회
      const reservations = await queryRunner.manager.query(
        `
        SELECT product_id, quantity 
        FROM inventory_reservations 
        WHERE cart_id = $1
      `,
        [cartId]
      );

      // 2. 각 상품의 실제 재고 차감
      for (const reservation of reservations) {
        const { product_id, quantity } = reservation;

        // 재고 확인 및 차감
        const result = await queryRunner.manager.query(
          `
          UPDATE product_inventory 
          SET stock = stock - $1, reserved = reserved - $2, last_updated = NOW()
          WHERE product_id = $3 AND stock >= $1
          RETURNING stock
        `,
          [quantity, quantity, product_id]
        );

        if (result.length === 0) {
          await queryRunner.rollbackTransaction();
          return false; // 재고 부족으로 주문 실패
        }
      }

      // 3. 모든 예약 삭제
      await queryRunner.manager.query(
        `
        DELETE FROM inventory_reservations WHERE cart_id = $1
      `,
        [cartId]
      );

      await queryRunner.commitTransaction();
      return true;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("❌ [InventoryService] 주문 확정 오류:", error);
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 만료된 예약 정리 (배치 작업용)
   */
  async cleanExpiredReservations(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        WITH expired_reservations AS (
          DELETE FROM inventory_reservations 
          WHERE expires_at < NOW()
          RETURNING product_id, quantity
        )
        UPDATE product_inventory 
        SET reserved = reserved - COALESCE((
          SELECT SUM(quantity) 
          FROM expired_reservations 
          WHERE expired_reservations.product_id = product_inventory.product_id
        ), 0),
        last_updated = NOW()
        WHERE product_id IN (SELECT DISTINCT product_id FROM expired_reservations)
      `);

      const cleanedCount = result.length;
      if (cleanedCount > 0) {
        console.log(
          `✅ [InventoryService] 만료된 예약 ${cleanedCount}개 정리 완료`
        );
      }

      return cleanedCount;
    } catch (error: any) {
      console.error("❌ [InventoryService] 예약 정리 오류:", error);
      return 0;
    }
  }

  /**
   * 상품 재고 정보 조회
   */
  private async getProductInventory(
    productId: string
  ): Promise<ProductInventory | null> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT 
          product_id,
          stock,
          reserved,
          (stock - reserved) as available,
          last_updated
        FROM product_inventory 
        WHERE product_id = $1
      `,
        [productId]
      );

      if (result.length === 0) {
        return null;
      }

      const data = result[0];
      return {
        productId: data.product_id,
        stock: data.stock,
        reserved: data.reserved,
        available: data.available,
        lastUpdated: data.last_updated,
      };
    } catch (error: any) {
      console.error("❌ [InventoryService] 재고 조회 오류:", error);
      return null;
    }
  }

  /**
   * 재고 초기화 (테스트용)
   */
  async initializeStock(
    productId: string,
    initialStock: number
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `
        INSERT INTO product_inventory (product_id, stock, reserved, last_updated)
        VALUES ($1, $2, 0, NOW())
        ON CONFLICT (product_id) 
        DO UPDATE SET stock = $2, last_updated = NOW()
      `,
        [productId, initialStock]
      );
    } catch (error: any) {
      console.error("❌ [InventoryService] 재고 초기화 오류:", error);
    }
  }
}
