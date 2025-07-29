// ========================================
// OrderItem TypeORM Entity - 주문 항목 데이터베이스 엔티티
// order-service/src/adapters/entities/OrderItemEntity.ts
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrderEntity } from './OrderEntity';

@Entity('order_items')
@Index(['orderId'])
@Index(['productId'])
@Index(['orderId', 'productId'], { unique: true })
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  // 상품 정보 (주문 시점 스냅샷)
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'product_price', type: 'decimal', precision: 12, scale: 2 })
  productPrice!: number;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
  totalPrice!: number;

  // 추가 상품 정보
  @Column({ name: 'product_image_url', type: 'text', nullable: true })
  productImageUrl?: string;

  @Column({ name: 'product_options', type: 'jsonb', nullable: true })
  productOptions?: Record<string, any>;

  // 시간 정보
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // 관계 설정
  @ManyToOne(() => OrderEntity, order => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;
}