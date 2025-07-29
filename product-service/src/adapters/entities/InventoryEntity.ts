// ========================================
// InventoryEntity - TypeORM Entity (Infrastructure 계층)
// src/adapters/entities/InventoryEntity.ts
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { ProductEntity } from "./ProductEntity";

/**
 * 재고 상태 열거형 (도메인 객체와 정확히 동일)
 */
export enum InventoryStatus {
  SUFFICIENT = "sufficient", // 재고 충분
  LOW_STOCK = "low_stock", // 재고 부족
  OUT_OF_STOCK = "out_of_stock", // 재고 없음
}

/**
 * InventoryEntity - TypeORM Entity (Framework 계층)
 *
 * 역할: 상품 재고 정보 관리
 * 특징: Product와 1:1 관계, 실시간 재고 추적
 *
 * 재고 관리 핵심 기능:
 * - 총 재고 수량 (quantity)
 * - 가용 재고 수량 (availableQuantity = quantity - reservedQuantity)
 * - 예약된 수량 (reservedQuantity) - 주문 처리 중
 * - 재고 임계값 관리 (lowStockThreshold)
 * - 재고 위치 정보 (location)
 */
@Entity("inventories")
@Index(["productId"], { unique: true }) // Product와 1:1 관계
@Index(["availableQuantity"]) // 가용 수량별 조회
@Index(["location"]) // 창고별 조회
export class InventoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: false, unique: true, name: "product_id" })
  productId!: string;

  // 총 재고 수량
  @Column({ type: "int", default: 0 })
  quantity!: number;

  // 가용 재고 수량 (총 수량 - 예약 수량)
  @Column({ type: "int", default: 0, name: "available_quantity" })
  availableQuantity!: number;

  // Note: reserved_quantity and status columns don't exist in the simplified schema
  // These are calculated values, not stored in database

  // 재고 부족 임계값
  @Column({ type: "int", default: 10, name: "low_stock_threshold" })
  lowStockThreshold!: number;

  // 재고 위치 정보 (창고, 매장 등)
  @Column({ type: "varchar", length: 100, default: "MAIN_WAREHOUSE" })
  location!: string;

  // Note: last_updated column doesn't exist in simplified schema

  // 최종 재입고 일시
  @Column({
    type: process.env.NODE_ENV === "test" ? "datetime" : "timestamp",
    nullable: true,
    name: "last_restocked_at",
  })
  lastRestockedAt?: Date;

  @CreateDateColumn({
    type: process.env.NODE_ENV === "test" ? "datetime" : "timestamp",
    name: "created_at",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: process.env.NODE_ENV === "test" ? "datetime" : "timestamp",
    name: "updated_at",
  })
  updatedAt!: Date;

  // ========================================
  // 관계 매핑 (Product와 1:1)
  // ========================================

  @OneToOne(() => ProductEntity, { eager: false })
  @JoinColumn({ name: "product_id" })
  product?: ProductEntity;

  // ========================================
  // 생성자
  // ========================================

  constructor() {
    // TypeORM Entity는 빈 생성자 필요
  }

  // ========================================
  // Domain 객체와 상호 변환 메서드
  // ========================================

  /**
   * Domain Inventory 객체를 TypeORM Entity로 변환
   */
  static fromDomain(
    inventory: import("../../entities/Inventory").Inventory
  ): InventoryEntity {
    const entity = new InventoryEntity();

    // 필수 속성들
    if (inventory.getId()) entity.id = inventory.getId();
    entity.productId = inventory.getProductId();
    entity.quantity = inventory.getQuantity();
    entity.availableQuantity = inventory.getAvailableQuantity();
    // Note: reservedQuantity and status are calculated, not stored

    entity.lowStockThreshold = inventory.getLowStockThreshold();
    entity.location = inventory.getLocation();
    entity.createdAt = inventory.getCreatedAt();
    entity.updatedAt = inventory.getUpdatedAt();

    // 선택적 속성들 - exactOptionalPropertyTypes 대응
    const lastRestockedAt = inventory.getLastRestockedAt();
    if (lastRestockedAt !== undefined) {
      entity.lastRestockedAt = lastRestockedAt;
    }

    return entity;
  }

  /**
   * TypeORM Entity를 Domain Inventory 객체로 변환
   */
  static toDomain(entity: InventoryEntity): import("../../entities/Inventory").Inventory {
    // 동적 import를 사용하여 순환 종속성 완전 방지
    const { Inventory } = require("../../entities/Inventory");

    // Repository에서는 이미 저장된 데이터를 복원
    const inventoryData: any = {
      id: entity.id,
      productId: entity.productId,
      quantity: entity.quantity,
      reservedQuantity: 0, // Default value since not stored in DB
      lowStockThreshold: entity.lowStockThreshold,
      location: entity.location,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    // 선택적 속성들 조건부 추가
    if (entity.lastRestockedAt !== undefined) {
      inventoryData.lastRestockedAt = entity.lastRestockedAt;
    }

    return Inventory.restore(inventoryData);
  }

  // ========================================
  // 유틸리티 메서드 (도메인 객체와 동일)
  // ========================================

  /**
   * 재고 부족 상태인지 확인
   */
  isLowStock(): boolean {
    return this.availableQuantity <= this.lowStockThreshold;
  }

  /**
   * 재고 없음 상태인지 확인
   */
  isOutOfStock(): boolean {
    return this.availableQuantity <= 0;
  }

  /**
   * 재고 요약 정보 반환 (도메인 객체의 getSummary와 동일)
   */
  getSummary() {
    return {
      id: this.id,
      productId: this.productId,
      quantity: this.quantity,
      availableQuantity: this.availableQuantity,
      reservedQuantity: 0, // Default value since not stored in DB
      status: this.calculateStatus(), // Calculate status based on available quantity
      location: this.location,
      isLowStock: this.isLowStock(),
      isOutOfStock: this.isOutOfStock(),
    };
  }

  /**
   * Calculate inventory status based on available quantity
   */
  private calculateStatus(): InventoryStatus {
    if (this.isOutOfStock()) {
      return InventoryStatus.OUT_OF_STOCK;
    } else if (this.isLowStock()) {
      return InventoryStatus.LOW_STOCK;
    } else {
      return InventoryStatus.SUFFICIENT;
    }
  }
}
