// ========================================
// ProductQnA TypeORM Entity
// src/adapters/entities/ProductQnAEntity.ts
// ========================================

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

/**
 * ProductQnA TypeORM Entity
 * product_qna 테이블과 매핑
 */
@Entity("product_qna")
@Index(["product_id"])
@Index(["is_answered"])
@Index(["is_public"])
@Index(["created_at"])
export class ProductQnAEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: false })
  product_id!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  user_name!: string;

  @Column({ type: "text", nullable: false })
  question!: string;

  @Column({ type: "text", nullable: true })
  answer?: string | undefined;

  @Column({ type: "boolean", default: false })
  is_answered!: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  answered_by?: string | undefined;

  @Column({ type: "timestamp", nullable: true })
  answered_at?: Date | undefined;

  @Column({ type: "boolean", default: true })
  is_public!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}