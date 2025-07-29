// ========================================
// CategoryEntity - TypeORM Entity (Infrastructure 계층)
// src/adapters/entities/CategoryEntity.ts
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { ProductEntity } from "./ProductEntity";

/**
 * CategoryEntity - TypeORM Entity (Framework 계층)
 *
 * 역할: 카테고리 데이터베이스 테이블과 객체 매핑
 * 특징: 단순한 1차원 카테고리 구조 (계층형 구조 제거)
 *
 * 단순화된 데이터 모델:
 * - 플랫한 카테고리 구조
 * - sort_order로 정렬 순서 관리
 * - slug로 SEO 친화적 URL 지원
 */
@Entity("categories")
@Index(["slug"], { unique: true }) // URL 슬러그 고유 인덱스
@Index(["sortOrder"]) // 정렬 순서별 조회 최적화
@Index(["isActive"]) // 활성 카테고리 조회 최적화
export class CategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "varchar",
    length: 150,
    nullable: false,
    unique: true,
  })
  slug!: string;

  // 정렬 순서 (표시 순서 결정)
  @Column({ type: "int", default: 0, name: "sort_order" })
  sortOrder!: number;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

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
  // 관계 매핑 (Products) - 단순화된 구조
  // ========================================

  // 이 카테고리에 속한 상품들 - Lazy Loading으로 순환 참조 방지
  @OneToMany("ProductEntity", "categoryId", { lazy: true })
  products?: any[]; // any 타입으로 순환 참조 방지

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
   * Domain Category 객체를 TypeORM Entity로 변환
   */
  static fromDomain(
    category: import("../../entities/Category").Category
  ): CategoryEntity {
    const entity = new CategoryEntity();

    // 필수 속성들
    if (category.getId()) entity.id = category.getId();
    entity.name = category.getName() || "";
    entity.slug = category.getSlug() || "";
    entity.isActive = category.isActive();
    entity.sortOrder = category.getSortOrder ? category.getSortOrder() : 0;
    entity.createdAt = category.getCreatedAt();
    entity.updatedAt = category.getUpdatedAt();

    // 선택적 속성들
    const description = category.getDescription();
    if (description !== undefined) {
      entity.description = description;
    }

    return entity;
  }

  /**
   * TypeORM Entity를 Domain Category 객체로 변환
   */
  static toDomain(entity: CategoryEntity): import("../../entities/Category").Category {
    // 동적 import를 사용하여 순환 종속성 완전 방지
    const { Category } = require("../../entities/Category");

    // Repository에서는 이미 저장된 데이터를 복원
    const categoryData: any = {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      isActive: entity.isActive,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    // 선택적 속성들 조건부 추가
    if (entity.description !== undefined && entity.description !== null) {
      categoryData.description = entity.description;
    }

    return Category.restore(categoryData);
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * URL 경로 생성
   * 예: "/categories/electronics"
   */
  getUrlPath(): string {
    return `/categories/${this.slug}`;
  }

  /**
   * 카테고리 기본 정보 반환
   */
  getBasicInfo() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      sortOrder: this.sortOrder,
      isActive: this.isActive,
    };
  }

  /**
   * 관리자용 상세 정보 반환
   */
  getAdminSummary() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      sortOrder: this.sortOrder,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
