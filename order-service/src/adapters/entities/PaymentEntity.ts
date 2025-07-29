// ========================================
// Payment TypeORM Entity - 결제 데이터베이스 엔티티
// order-service/src/adapters/entities/PaymentEntity.ts
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

@Entity('payments')
@Index(['paymentId'], { unique: true })
@Index(['orderId'])
@Index(['status'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'payment_id', type: 'varchar', length: 255, unique: true })
  paymentId!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['KAKAOPAY', 'CARD', 'BANK_TRANSFER', 'TOSSPAYMENTS'],
  })
  paymentMethod!: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: string;

  @Column({ name: 'payment_system_data', type: 'jsonb', nullable: true })
  paymentSystemData?: Record<string, any>;

  @Column({ name: 'requested_at', type: 'timestamp with time zone' })
  requestedAt!: Date;

  @Column({ name: 'approved_at', type: 'timestamp with time zone', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'failed_at', type: 'timestamp with time zone', nullable: true })
  failedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // 관계 설정
  @ManyToOne(() => OrderEntity, order => order.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;
}