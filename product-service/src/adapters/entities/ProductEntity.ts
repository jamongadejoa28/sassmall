// ========================================
// ProductEntity - TypeORM Entity (Infrastructure 계층)
// src/adapters/entities/ProductEntity.ts
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";

/**
 * ProductEntity - TypeORM Entity (Framework 계층)
 *
 * 역할: 데이터베이스 테이블과 객체 매핑
 * 특징: 도메인 로직 없음, 순수 데이터 구조
 *
 * user-service의 UserEntity 구조를 참고하여 일관성 유지
 */
@Entity("products")
@Index(["sku"], { unique: true }) // SKU 고유 인덱스
@Index(["categoryId"]) // 카테고리별 조회 최적화
@Index(["brand"]) // 브랜드별 조회 최적화
@Index(["price"]) // 가격별 정렬 최적화
@Index(["isActive", "createdAt"]) // 복합 인덱스
export class ProductEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  name?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price?: number;

  @Column({ type: "uuid", nullable: true, name: "category_id" })
  categoryId?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  brand?: string;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
    unique: true,
  })
  sku?: string;

  // 선택적 물리적 속성들
  @Column({
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  weight?: number;

  // ✅ 수정된 dimensions 컬럼
  @Column({
    type: "jsonb",
    nullable: true,
    transformer: {
      to: (
        value: { width: number; height: number; depth: number } | undefined
      ) => (value ? JSON.stringify(value) : null),
      from: (value: string | object | null) => {
        // ✅ 이미 객체인 경우 그대로 반환 (PostgreSQL에서 이미 파싱됨)
        if (value === null || value === undefined) return undefined;
        if (typeof value === "object") return value;
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return undefined;
          }
        }
        return undefined;
      },
    },
  })
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };

  // ✅ 수정된 tags 컬럼
  @Column({
    type: "jsonb",
    nullable: true,
    default: "[]",
    transformer: {
      to: (value: string[] = []) => JSON.stringify(value),
      from: (value: string | string[] | null) => {
        // ✅ 이미 배열인 경우 그대로 반환 (PostgreSQL에서 이미 파싱됨)
        if (value === null || value === undefined) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      },
    },
  })
  tags!: string[];

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  // 원래 가격 (할인 전 가격)
  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    name: "original_price",
  })
  originalPrice?: number;

  // 할인율 (0-100)
  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0.00,
    name: "discount_percentage",
  })
  discountPercentage!: number;

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
  // 관계 매핑 (Foreign Key) - 순환 참조 해결
  // ========================================

  // Category와의 관계 - Lazy Loading으로 순환 참조 방지
  @ManyToOne("CategoryEntity", { eager: false, lazy: true })
  @JoinColumn({ name: "category_id" })
  category?: any; // any 타입으로 순환 참조 방지

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
   * Domain Product 객체를 TypeORM Entity로 변환
   */
  static fromDomain(
    product: import("../../entities/Product").Product
  ): ProductEntity {
    const entity = new ProductEntity();

    // 필수 속성들
    if (product.getId()) entity.id = product.getId();
    entity.tags = product.getTags();
    entity.isActive = product.isActive();
    entity.createdAt = product.getCreatedAt();
    entity.updatedAt = product.getUpdatedAt();

    // 선택적 속성들로 변경
    const name = product.getName();
    if (name !== undefined) entity.name = name;
    
    const description = product.getDescription();
    if (description !== undefined) entity.description = description;
    
    const price = product.getPrice();
    if (price !== undefined) entity.price = price;
    
    const categoryId = product.getCategoryId();
    if (categoryId !== undefined) entity.categoryId = categoryId;
    
    const brand = product.getBrand();
    if (brand !== undefined) entity.brand = brand;
    
    const sku = product.getSku();
    if (sku !== undefined) entity.sku = sku;

    // 선택적 속성들 - exactOptionalPropertyTypes 대응
    const weight = product.getWeight();
    if (weight !== undefined) {
      entity.weight = weight;
    }

    const dimensions = product.getDimensions();
    if (dimensions !== undefined) {
      entity.dimensions = dimensions;
    }

    const originalPrice = product.getOriginalPrice();
    if (originalPrice !== undefined) {
      entity.originalPrice = originalPrice;
    }

    const discountPercentage = product.getDiscountPercentage();
    if (discountPercentage !== undefined) {
      entity.discountPercentage = discountPercentage;
    }

    return entity;
  }

  /**
   * TypeORM Entity를 Domain Product 객체로 변환
   */
  toDomain(): import("../../entities/Product").Product {
    // 동적 import를 사용하여 순환 종속성 완전 방지
    const { Product } = require("../../entities/Product");

    // Repository에서는 이미 저장된 데이터를 복원하므로 restore 메서드 사용
    // null/undefined 필드에 대해 기본값 제공
    const productData: any = {
      id: this.id,
      name: this.name || `Product-${this.id.slice(0, 8)}`, // 기본 이름
      description: this.description || '', // 빈 설명
      price: this.price || 0, // 기본 가격
      categoryId: this.categoryId || '', // 빈 카테고리 ID
      brand: this.brand || 'Unknown', // 기본 브랜드
      sku: this.sku || `SKU-${this.id.slice(0, 8)}`, // 기본 SKU
      tags: this.tags || [],
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    // 선택적 속성들 조건부 추가
    if (this.weight !== undefined) {
      productData.weight = this.weight;
    }

    if (this.dimensions !== undefined) {
      productData.dimensions = this.dimensions;
    }

    if (this.originalPrice !== undefined) {
      productData.originalPrice = this.originalPrice;
    }

    if (this.discountPercentage !== undefined) {
      productData.discountPercentage = this.discountPercentage;
    }

    return Product.restore(productData);
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 유효한 가격 정보인지 확인
   */
  hasValidPrice(): boolean {
    return this.price !== undefined && this.price !== null && this.price > 0;
  }

  /**
   * 할인이 적용된 상품인지 확인
   */
  hasDiscount(): boolean {
    return (
      this.originalPrice !== undefined &&
      this.originalPrice !== null &&
      this.price !== undefined &&
      this.price !== null &&
      this.originalPrice > this.price
    );
  }

  /**
   * 실제 판매 가격 반환
   */
  getEffectivePrice(): number {
    return this.price || 0;
  }

  /**
   * 검색용 텍스트 반환 (이름 + 브랜드 + 태그)
   */
  getSearchText(): string {
    return [this.name || '', this.brand || '', ...(this.tags || [])]
      .filter(text => text)
      .join(" ")
      .toLowerCase();
  }

  /**
   * 상품 요약 정보 반환
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name || null,
      price: this.price || null,
      effectivePrice: this.getEffectivePrice(),
      brand: this.brand || null,
      isActive: this.isActive,
      hasDiscount: this.hasDiscount(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
