// ========================================
// Order TypeORM Entity - 주문 데이터베이스 엔티티
// order-service/src/adapters/entities/OrderEntity.ts
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderItemEntity } from './OrderItemEntity';
import { PaymentEntity } from './PaymentEntity';

@Entity('orders')
@Index(['orderNumber'], { unique: true })
@Index(['userId'])
@Index(['status'])
@Index(['userId', 'status'])
@Index(['status', 'orderedAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 50, unique: true })
  orderNumber!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: [
      'PENDING',
      'PAYMENT_IN_PROGRESS',
      'PAYMENT_COMPLETED',
      'PAYMENT_FAILED',
      'CONFIRMED',
      'PREPARING_SHIPMENT',
      'SHIPPING',
      'DELIVERED',
      'CANCELLED',
      'REFUND_IN_PROGRESS',
      'REFUNDED',
    ],
    default: 'PENDING',
  })
  status!: string;

  // 배송 정보
  @Column({ name: 'shipping_postal_code', type: 'varchar', length: 10 })
  shippingPostalCode!: string;

  @Column({ name: 'shipping_address', type: 'varchar', length: 255 })
  shippingAddress!: string;

  @Column({ name: 'shipping_detail_address', type: 'varchar', length: 255, nullable: true })
  shippingDetailAddress?: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 100 })
  recipientName!: string;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20 })
  recipientPhone!: string;

  // 결제 정보
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['KAKAOPAY', 'CARD', 'BANK_TRANSFER', 'TOSSPAYMENTS'],
  })
  paymentMethod!: 'KAKAOPAY' | 'CARD' | 'BANK_TRANSFER' | 'TOSSPAYMENTS';

  @Column({ name: 'payment_id', type: 'varchar', length: 255, nullable: true })
  paymentId?: string;

  // 주문 금액 정보
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({ name: 'shipping_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingFee!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  // 기타
  @Column({ type: 'text', nullable: true })
  memo?: string;

  // 시간 정보
  @Column({ name: 'ordered_at', type: 'timestamp with time zone' })
  orderedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // 관계 설정
  @OneToMany(() => OrderItemEntity, orderItem => orderItem.order, {
    cascade: true,
    eager: false,
  })
  items!: OrderItemEntity[];

  @OneToMany(() => PaymentEntity, payment => payment.order, {
    cascade: true,
    eager: false,
  })
  payments!: PaymentEntity[];
}