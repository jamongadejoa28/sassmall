// ========================================
// 완전 수동 처리 CartRepositoryImpl.ts - TypeORM 관계 매핑 제거
// cart-service/src/adapters/CartRepositoryImpl.ts
// ========================================

import { Repository, DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Cart } from "../entities/Cart";
import { CartItem } from "../entities/CartItem";
import { CartRepository } from "../usecases/types";
import { CartEntity } from "./entities/CartEntity";
import { CartItemEntity } from "./entities/CartItemEntity";
import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class CartRepositoryImpl implements CartRepository {
  private cartRepository: Repository<CartEntity>;
  private itemRepository: Repository<CartItemEntity>;

  constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
    this.cartRepository = dataSource.getRepository(CartEntity);
    this.itemRepository = dataSource.getRepository(CartItemEntity);
  }

  async save(cart: Cart): Promise<Cart> {
    console.log(`🔍 [SAVE] Saving cart ${cart.getId()}: userId=${cart.getUserId()}, sessionId=${cart.getSessionId()}, items=${cart.getItems().length}`);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ 1단계: Cart만 저장 (아이템 제외)
      const cartEntity = CartEntity.fromDomain(cart);
      console.log(`🔍 [SAVE] CartEntity: userId=${cartEntity.userId}, sessionId=${cartEntity.sessionId}`);
      
      const savedCartEntity = await queryRunner.manager.save(
        CartEntity,
        cartEntity
      );

      console.log(`🔍 [SAVE] SavedCartEntity: id=${savedCartEntity.id}, userId=${savedCartEntity.userId}, sessionId=${savedCartEntity.sessionId}`);

      // ✅ 2단계: 기존 아이템들 삭제 (모든 경우)
      const deleteResult = await queryRunner.manager.query(
        "DELETE FROM cart_items WHERE cart_id = $1",
        [savedCartEntity.id]
      );

      console.log(`🔍 [SAVE] Deleted ${deleteResult[1] || 0} existing items`);

      // ✅ 3단계: 새로운 아이템들을 raw SQL로 삽입
      const items = cart.getItems();
      console.log(`🔍 [SAVE] Inserting ${items.length} items`);
      
      for (const item of items) {
        console.log(`🔍 [SAVE] Inserting item: ${item.getProductId()}, qty=${item.getQuantity()}`);
        await queryRunner.manager.query(
          `
          INSERT INTO cart_items (id, cart_id, product_id, quantity, price, added_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [
            uuidv4(),
            savedCartEntity.id,
            item.getProductId(),
            item.getQuantity(),
            item.getPrice(),
            item.getAddedAt(),
          ]
        );
      }

      // ✅ 4단계: 저장된 데이터를 동일한 transaction 내에서 조회해서 반환
      const itemEntities = await queryRunner.manager.query(
        "SELECT * FROM cart_items WHERE cart_id = $1",
        [savedCartEntity.id]
      );

      console.log(`🔍 [SAVE] Found ${itemEntities.length} items after insert`);

      await queryRunner.commitTransaction();

      // Domain 객체로 변환
      const cartItems = itemEntities.map((item: any) => {
        return new CartItem({
          cartId: item.cart_id,
          productId: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          addedAt: item.added_at,
        });
      });

      const result = new Cart({
        id: savedCartEntity.id,
        userId: savedCartEntity.userId || undefined,
        sessionId: savedCartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: savedCartEntity.createdAt,
        updatedAt: savedCartEntity.updatedAt,
      });

      result.markAsPersisted();
      console.log(`🔍 [SAVE] Returning cart with ${result.getItems().length} items`);
      return result;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("❌ [CartRepository] 저장 오류:", error);
      throw new Error(`장바구니 저장 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<Cart | null> {
    try {
      if (!id || !this.isValidUUID(id)) {
        return null;
      }

      // ✅ Cart와 CartItem을 별도로 조회
      const cartEntity = await this.cartRepository.findOne({
        where: { id },
      });

      if (!cartEntity) {
        return null;
      }

      // ✅ 아이템들을 별도 쿼리로 조회
      const itemEntities = await this.itemRepository.find({
        where: { cartId: id },
      });

      // ✅ Domain 객체로 변환
      const cartItems = itemEntities.map((item) => item.toDomain());

      return new Cart({
        id: cartEntity.id,
        userId: cartEntity.userId || undefined,
        sessionId: cartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: cartEntity.createdAt,
        updatedAt: cartEntity.updatedAt,
      });
    } catch (error: any) {
      console.error("❌ [CartRepository] 조회 오류:", error);
      return null;
    }
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    try {
      if (!userId || !this.isValidUUID(userId)) {
        return null;
      }

      const cartEntity = await this.cartRepository.findOne({
        where: { userId },
        order: { updatedAt: "DESC" },
      });

      if (!cartEntity) {
        return null;
      }

      // 아이템들 별도 조회
      const itemEntities = await this.itemRepository.find({
        where: { cartId: cartEntity.id },
      });

      const cartItems = itemEntities.map((item) => item.toDomain());

      return new Cart({
        id: cartEntity.id,
        userId: cartEntity.userId || undefined,
        sessionId: cartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: cartEntity.createdAt,
        updatedAt: cartEntity.updatedAt,
      });
    } catch (error: any) {
      console.error("❌ [CartRepository] 사용자 조회 오류:", error);
      return null;
    }
  }

  async findBySessionId(sessionId: string): Promise<Cart | null> {
    console.log(`🔍 [FIND_SESSION] Looking for sessionId: ${sessionId}`);
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        console.log(`🔍 [FIND_SESSION] Invalid sessionId`);
        return null;
      }

      const cartEntity = await this.cartRepository.findOne({
        where: { sessionId },
        order: { updatedAt: "DESC" },
      });

      console.log(`🔍 [FIND_SESSION] Found cart entity:`, cartEntity ? {
        id: cartEntity.id,
        sessionId: cartEntity.sessionId,
        userId: cartEntity.userId
      } : null);

      if (!cartEntity) {
        return null;
      }

      // 아이템들 별도 조회
      const itemEntities = await this.itemRepository.find({
        where: { cartId: cartEntity.id },
      });

      const cartItems = itemEntities.map((item) => item.toDomain());

      return new Cart({
        id: cartEntity.id,
        userId: cartEntity.userId || undefined,
        sessionId: cartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: cartEntity.createdAt,
        updatedAt: cartEntity.updatedAt,
      });
    } catch (error: any) {
      console.error("❌ [CartRepository] 세션 조회 오류:", error);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!id || !this.isValidUUID(id)) {
        return;
      }
      // CASCADE 설정으로 인해 cart_items도 자동 삭제됨
      await this.cartRepository.delete(id);
    } catch (error: any) {
      console.error("❌ [CartRepository] 삭제 오류:", error);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      if (!userId || !this.isValidUUID(userId)) {
        return;
      }
      await this.cartRepository.delete({ userId });
    } catch (error: any) {
      console.error("❌ [CartRepository] 사용자 삭제 오류:", error);
    }
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        return;
      }
      await this.cartRepository.delete({ sessionId });
    } catch (error: any) {
      console.error("❌ [CartRepository] 세션 삭제 오류:", error);
    }
  }

  /**
   * 장바구니와 관련된 모든 데이터를 완전히 삭제
   * cart_items도 함께 삭제하여 orphan 데이터 방지
   */
  async deleteCart(cartId: string): Promise<void> {
    if (!cartId || !this.isValidUUID(cartId)) {
      console.warn(`[CartRepository] 유효하지 않은 cartId: ${cartId}`);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log(`[CartRepository] 장바구니 완전 삭제 시작: cartId=${cartId}`);

      // 1. 먼저 cart_items 삭제
      const deleteItemsResult = await queryRunner.manager.query(
        "DELETE FROM cart_items WHERE cart_id = $1",
        [cartId]
      );
      console.log(`[CartRepository] cart_items 삭제 완료: ${deleteItemsResult.length || 0}개`);

      // 2. 그 다음 cart 삭제
      const deleteCartResult = await queryRunner.manager.query(
        "DELETE FROM carts WHERE id = $1",
        [cartId]
      );
      console.log(`[CartRepository] cart 삭제 완료: cartId=${cartId}`);

      await queryRunner.commitTransaction();
      console.log(`[CartRepository] 장바구니 완전 삭제 성공: cartId=${cartId}`);

    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error(`❌ [CartRepository] 장바구니 삭제 오류 (rollback 완료): cartId=${cartId}`, error);
      throw new Error(`장바구니 삭제 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
