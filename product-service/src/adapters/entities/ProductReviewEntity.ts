// ========================================
// ProductReview TypeORM Entity
// src/adapters/entities/ProductReviewEntity.ts
// ========================================

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

/**
 * ProductReview TypeORM Entity
 * product_reviews 테이블과 매핑
 */
@Entity("product_reviews")
@Index(["product_id"])
@Index(["rating"])
@Index(["created_at"])
@Index(["is_verified_purchase"])
export class ProductReviewEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: false })
  product_id!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  user_name!: string;

  @Column({ type: "integer", nullable: false })
  rating!: number;

  @Column({ type: "text", nullable: false })
  content!: string;

  @Column({ type: "boolean", default: false })
  is_verified_purchase!: boolean;

  @Column({ type: "integer", default: 0 })
  helpful_count!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}