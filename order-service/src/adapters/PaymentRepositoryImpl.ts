// ========================================
// Payment Repository Implementation - 결제 리포지토리 구현
// order-service/src/adapters/PaymentRepositoryImpl.ts
// ========================================

import { Repository, DataSource, Between } from 'typeorm';
import { Payment } from '../entities/Payment';
import { PaymentRepository } from './PaymentRepository';
import { PaymentEntity } from './entities/PaymentEntity';

export class PaymentRepositoryImpl implements PaymentRepository {
  private repository: Repository<PaymentEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PaymentEntity);
  }

  // 결제 저장
  async save(payment: Payment): Promise<Payment> {
    try {
      const entity = this.toEntity(payment);
      
      // 기존 엔티티인지 확인 (ID가 있고 DB에 존재하는지)
      if (payment.id) {
        const existingEntity = await this.repository.findOne({ where: { id: payment.id } });
        if (existingEntity) {
          // 기존 엔티티가 존재하면 업데이트
          await this.repository.update(payment.id, entity);
          const updatedEntity = await this.repository.findOne({ where: { id: payment.id } });
          if (!updatedEntity) {
            throw new Error('업데이트된 엔티티를 찾을 수 없습니다');
          }
          return this.toDomain(updatedEntity);
        }
      }
      
      // 새로운 엔티티 생성
      const savedEntity = await this.repository.save(entity);
      return this.toDomain(savedEntity);
    } catch (error) {
      console.error('결제 저장 실패:', error);
      throw new Error('결제 정보를 저장하는 중 오류가 발생했습니다');
    }
  }

  // ID로 결제 조회
  async findById(id: string): Promise<Payment | null> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      return entity ? this.toDomain(entity) : null;
    } catch (error) {
      console.error('결제 조회 실패:', error);
      throw new Error('결제 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 결제 ID로 조회 (외부 결제 시스템 ID)
  async findByPaymentId(paymentId: string): Promise<Payment | null> {
    try {
      const entity = await this.repository.findOne({ where: { paymentId } });
      return entity ? this.toDomain(entity) : null;
    } catch (error) {
      console.error('결제 ID 조회 실패:', error);
      throw new Error('결제 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 주문 ID로 결제 조회
  async findByOrderId(orderId: string): Promise<Payment[]> {
    try {
      const entities = await this.repository.find({ 
        where: { orderId },
        order: { createdAt: 'DESC' }
      });
      return entities.map(entity => this.toDomain(entity));
    } catch (error) {
      console.error('주문 결제 조회 실패:', error);
      throw new Error('주문의 결제 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 결제 상태로 조회
  async findByStatus(status: string): Promise<Payment[]> {
    try {
      const entities = await this.repository.find({ 
        where: { status },
        order: { createdAt: 'DESC' }
      });
      return entities.map(entity => this.toDomain(entity));
    } catch (error) {
      console.error('결제 상태 조회 실패:', error);
      throw new Error('결제 상태별 조회 중 오류가 발생했습니다');
    }
  }

  // 결제 삭제
  async delete(id: string): Promise<void> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        throw new Error('삭제할 결제 정보를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('결제 삭제 실패:', error);
      throw new Error('결제 정보를 삭제하는 중 오류가 발생했습니다');
    }
  }

  // 결제 업데이트
  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      const existing = await this.repository.findOne({ where: { id } });
      if (!existing) {
        throw new Error('업데이트할 결제 정보를 찾을 수 없습니다');
      }

      // 업데이트할 필드만 매핑
      const updateData: Partial<PaymentEntity> = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paymentId !== undefined) updateData.paymentId = updates.paymentId;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.paymentSystemData !== undefined) updateData.paymentSystemData = updates.paymentSystemData;
      if (updates.approvedAt !== undefined) updateData.approvedAt = updates.approvedAt;
      if (updates.failedAt !== undefined) updateData.failedAt = updates.failedAt;

      await this.repository.update(id, updateData);
      
      const updated = await this.repository.findOne({ where: { id } });
      if (!updated) {
        throw new Error('업데이트된 결제 정보를 찾을 수 없습니다');
      }

      return this.toDomain(updated);
    } catch (error) {
      console.error('결제 업데이트 실패:', error);
      throw new Error('결제 정보를 업데이트하는 중 오류가 발생했습니다');
    }
  }

  // 특정 기간 결제 조회
  async findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]> {
    try {
      const entities = await this.repository.find({
        where: {
          createdAt: Between(startDate, endDate)
        },
        order: { createdAt: 'DESC' }
      });
      return entities.map(entity => this.toDomain(entity));
    } catch (error) {
      console.error('기간별 결제 조회 실패:', error);
      throw new Error('기간별 결제 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // Payment 엔티티를 PaymentEntity로 변환
  private toEntity(payment: Payment): PaymentEntity {
    const entity = new PaymentEntity();
    
    if (payment.id) entity.id = payment.id;
    entity.orderId = payment.orderId;
    entity.paymentId = payment.paymentId;
    entity.paymentMethod = payment.paymentMethod;
    entity.amount = payment.amount;
    entity.status = payment.status;
    entity.paymentSystemData = payment.paymentSystemData;
    entity.requestedAt = payment.requestedAt;
    entity.approvedAt = payment.approvedAt;
    entity.failedAt = payment.failedAt;
    entity.createdAt = payment.createdAt;
    entity.updatedAt = payment.updatedAt;

    return entity;
  }

  // PaymentEntity를 Payment 도메인 객체로 변환
  private toDomain(entity: PaymentEntity): Payment {
    const payment = new Payment({
      orderId: entity.orderId,
      paymentMethod: entity.paymentMethod,
      amount: entity.amount,
      paymentSystemData: entity.paymentSystemData,
    });

    // ID와 기타 필드 설정
    payment.id = entity.id;
    payment.paymentId = entity.paymentId;
    payment.status = entity.status;
    payment.requestedAt = entity.requestedAt;
    payment.approvedAt = entity.approvedAt;
    payment.failedAt = entity.failedAt;
    payment.createdAt = entity.createdAt;
    payment.updatedAt = entity.updatedAt;

    return payment;
  }
}