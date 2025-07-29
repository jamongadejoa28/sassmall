// ========================================
// 관계 매핑 제거된 CartEntity.ts - 복잡성 완전 제거
// src/adapters/entities/CartEntity.ts
// ========================================

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Cart } from "../../entities/Cart";

@Entity("carts")
export class CartEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId?: string;

  @Column({ name: "session_id", type: "varchar", length: 255, nullable: true })
  sessionId?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // ✅ 관계 매핑 완전 제거 - 수동으로 처리

  // Domain 객체로 변환 (아이템 없이)
  toDomain(): Cart {
    return new Cart({
      id: this.id,
      userId: this.userId || undefined,
      sessionId: this.sessionId || undefined,
      items: [], // ✅ 빈 배열로 초기화, 별도로 로드
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  // Domain 객체에서 변환
  static fromDomain(cart: Cart): CartEntity {
    const entity = new CartEntity();

    if (cart.isPersisted()) {
      entity.id = cart.getId();
    }

    entity.userId = cart.getUserId();
    entity.sessionId = cart.getSessionId();
    entity.createdAt = cart.getCreatedAt();
    entity.updatedAt = cart.getUpdatedAt();

    return entity;
  }
}
