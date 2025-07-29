// ========================================
// Order Repository Implementation - 주문 리포지토리 구현
// order-service/src/adapters/OrderRepositoryImpl.ts
// ========================================

import { Repository, DataSource, Between, In } from 'typeorm';
import { Order } from '../entities/Order';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderRepository, OrderSearchCriteria, AdminOrderSearchCriteria } from './OrderRepository';
import { OrderEntity } from './entities/OrderEntity';
import { OrderItemEntity } from './entities/OrderItemEntity';

export class OrderRepositoryImpl implements OrderRepository {
  private orderRepository: Repository<OrderEntity>;
  private orderItemRepository: Repository<OrderItemEntity>;

  constructor(dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(OrderEntity);
    this.orderItemRepository = dataSource.getRepository(OrderItemEntity);
  }

  // 주문 저장 (주문 항목도 함께 저장)
  async save(order: Order): Promise<Order> {
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    
    try {
      await queryRunner.startTransaction();

      // 1. 주문 엔티티 저장
      const orderEntity = this.toOrderEntity(order);
      const savedOrderEntity = await queryRunner.manager.save(OrderEntity, orderEntity);

      // 2. 주문 항목 엔티티들 저장
      const orderItemEntities = order.items.map(item => {
        const itemEntity = this.toOrderItemEntity(item);
        itemEntity.orderId = savedOrderEntity.id;
        return itemEntity;
      });

      const savedItemEntities = await queryRunner.manager.save(OrderItemEntity, orderItemEntities);

      await queryRunner.commitTransaction();

      // 3. 저장된 데이터로 도메인 객체 재구성
      const savedOrder = this.toDomain(savedOrderEntity, savedItemEntities);
      return savedOrder;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      // 데이터베이스 관련 오류인지 확인
      if (error instanceof Error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          throw new Error('데이터베이스 테이블이 존재하지 않습니다. 스키마 동기화가 필요합니다.');
        }
        if (error.message.includes('connect') || error.message.includes('connection')) {
          throw new Error('데이터베이스 연결 오류가 발생했습니다.');
        }
      }
      
      throw new Error(`주문 정보 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await queryRunner.release();
    }
  }

  // ID로 주문 조회 (주문 항목 포함)
  async findById(id: string): Promise<Order | null> {
    try {
      const orderEntity = await this.orderRepository.findOne({
        where: { id },
        relations: ['items'],
      });

      return orderEntity ? this.toDomain(orderEntity, orderEntity.items) : null;
    } catch (error) {
      throw new Error('주문 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 주문번호로 조회
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    try {
      const orderEntity = await this.orderRepository.findOne({
        where: { orderNumber },
        relations: ['items'],
      });

      return orderEntity ? this.toDomain(orderEntity, orderEntity.items) : null;
    } catch (error) {
      throw new Error('주문 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 사용자 ID로 주문 조회
  async findByUserId(userId: string, limit?: number, offset?: number): Promise<Order[]> {
    try {
      const query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .where('order.userId = :userId', { userId })
        .orderBy('order.orderedAt', 'DESC');

      if (limit) {
        query.limit(limit);
      }

      if (offset) {
        query.offset(offset);
      }

      const orderEntities = await query.getMany();
      return orderEntities.map(entity => this.toDomain(entity, entity.items));
    } catch (error) {
      throw new Error('사용자의 주문 정보를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 주문 상태로 조회
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    try {
      const orderEntities = await this.orderRepository.find({
        where: { status },
        relations: ['items'],
        order: { orderedAt: 'DESC' },
      });

      return orderEntities.map(entity => this.toDomain(entity, entity.items));
    } catch (error) {
      throw new Error('주문 상태별 조회 중 오류가 발생했습니다');
    }
  }

  // 조건별 주문 검색
  async findByQuery(criteria: OrderSearchCriteria): Promise<Order[]> {
    try {
      const query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items');

      if (criteria.userId) {
        query.andWhere('order.userId = :userId', { userId: criteria.userId });
      }

      if (criteria.status) {
        query.andWhere('order.status = :status', { status: criteria.status });
      }

      if (criteria.startDate && criteria.endDate) {
        query.andWhere('order.orderedAt BETWEEN :startDate AND :endDate', {
          startDate: criteria.startDate,
          endDate: criteria.endDate,
        });
      }

      query.orderBy('order.orderedAt', 'DESC');

      if (criteria.limit) {
        query.limit(criteria.limit);
      }

      if (criteria.offset) {
        query.offset(criteria.offset);
      }

      const orderEntities = await query.getMany();
      return orderEntities.map(entity => this.toDomain(entity, entity.items));
    } catch (error) {
      throw new Error('주문 검색 중 오류가 발생했습니다');
    }
  }

  // 주문 삭제
  async delete(id: string): Promise<void> {
    try {
      const result = await this.orderRepository.delete(id);
      if (result.affected === 0) {
        throw new Error('삭제할 주문을 찾을 수 없습니다');
      }
    } catch (error) {
      throw new Error('주문을 삭제하는 중 오류가 발생했습니다');
    }
  }

  // 주문 업데이트
  async update(id: string, updates: Partial<Order>): Promise<Order> {
    try {
      const existing = await this.orderRepository.findOne({ 
        where: { id },
        relations: ['items'],
      });
      
      if (!existing) {
        throw new Error('업데이트할 주문을 찾을 수 없습니다');
      }

      // 업데이트할 필드만 매핑
      const updateData: Partial<OrderEntity> = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paymentId !== undefined) updateData.paymentId = updates.paymentId;
      if (updates.memo !== undefined) updateData.memo = updates.memo;

      await this.orderRepository.update(id, updateData);
      
      const updated = await this.orderRepository.findOne({ 
        where: { id },
        relations: ['items'],
      });
      
      if (!updated) {
        throw new Error('업데이트된 주문을 찾을 수 없습니다');
      }

      return this.toDomain(updated, updated.items);
    } catch (error) {
      console.error('주문 업데이트 실패:', error);
      throw new Error('주문을 업데이트하는 중 오류가 발생했습니다');
    }
  }

  // 주문 개수 조회
  async count(criteria?: OrderSearchCriteria): Promise<number> {
    try {
      const query = this.orderRepository.createQueryBuilder('order');

      if (criteria?.userId) {
        query.andWhere('order.userId = :userId', { userId: criteria.userId });
      }

      if (criteria?.status) {
        query.andWhere('order.status = :status', { status: criteria.status });
      }

      if (criteria?.startDate && criteria?.endDate) {
        query.andWhere('order.orderedAt BETWEEN :startDate AND :endDate', {
          startDate: criteria.startDate,
          endDate: criteria.endDate,
        });
      }

      return await query.getCount();
    } catch (error) {
      console.error('주문 개수 조회 실패:', error);
      throw new Error('주문 개수를 조회하는 중 오류가 발생했습니다');
    }
  }

  // 특정 기간 주문 조회
  async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    try {
      const orderEntities = await this.orderRepository.find({
        where: {
          orderedAt: Between(startDate, endDate),
        },
        relations: ['items'],
        order: { orderedAt: 'DESC' },
      });

      return orderEntities.map(entity => this.toDomain(entity, entity.items));
    } catch (error) {
      console.error('기간별 주문 조회 실패:', error);
      throw new Error('기간별 주문을 조회하는 중 오류가 발생했습니다');
    }
  }

  // 주문 상태 벌크 업데이트
  async updateStatusBulk(orderIds: string[], status: OrderStatus): Promise<void> {
    try {
      await this.orderRepository.update(
        { id: In(orderIds) },
        { status }
      );
    } catch (error) {
      console.error('주문 상태 벌크 업데이트 실패:', error);
      throw new Error('주문 상태를 업데이트하는 중 오류가 발생했습니다');
    }
  }

  // ========================================
  // Admin 전용 메서드
  // ========================================

  // 관리자용 주문 목록 조회 (페이징, 검색, 필터링)
  async findManyForAdmin(criteria: AdminOrderSearchCriteria): Promise<{ orders: Order[]; total: number }> {
    try {
      const {
        search,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'orderedAt',
        sortOrder = 'desc'
      } = criteria;

      const queryBuilder = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items');

      // 검색 조건 (주문번호 검색 - 사용자 정보는 별도 서비스에서 처리)
      if (search && search.trim()) {
        queryBuilder.andWhere(
          'order.orderNumber ILIKE :search',
          { search: `%${search.trim()}%` }
        );
      }

      // 상태 필터링
      if (status) {
        queryBuilder.andWhere('order.status = :status', { status });
      }

      // 날짜 범위 필터링
      if (startDate && endDate) {
        queryBuilder.andWhere('order.orderedAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        });
      } else if (startDate) {
        queryBuilder.andWhere('order.orderedAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('order.orderedAt <= :endDate', { endDate });
      }

      // 정렬
      const validSortFields = ['orderedAt', 'totalAmount', 'status', 'orderNumber'];
      if (validSortFields.includes(sortBy)) {
        const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';
        queryBuilder.orderBy(`order.${sortBy}`, orderDirection);
      } else {
        queryBuilder.orderBy('order.orderedAt', 'DESC');
      }

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행
      const [orderEntities, total] = await queryBuilder.getManyAndCount();

      // 도메인 객체로 변환
      const orders = orderEntities.map(entity => this.toDomain(entity, entity.items));

      return { orders, total };
    } catch (error) {
      console.error('관리자 주문 목록 조회 실패:', error);
      throw new Error('주문 목록을 조회하는 중 오류가 발생했습니다');
    }
  }

  // 주문 통계 조회
  async getOrderStatistics(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersToday: number;
    revenueToday: number;
    ordersThisWeek: number;
    revenueThisWeek: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    statusCounts: Record<string, number>;
    averageOrderValue: number;
  }> {
    try {
      // 시간 기준점 설정
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 기본 통계 쿼리들을 병렬로 실행
      const [
        totalOrdersResult,
        totalRevenueResult,
        ordersTodayResult,
        revenueTodayResult,
        ordersThisWeekResult,
        revenueThisWeekResult,
        ordersThisMonthResult,
        revenueThisMonthResult,
        statusCountsResult
      ] = await Promise.all([
        // 전체 주문 수
        this.orderRepository.count(),
        
        // 전체 매출 (완료된 주문만)
        this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'total')
          .where('order.status IN (:...statuses)', { 
            statuses: ['PAYMENT_COMPLETED', 'DELIVERED', 'CONFIRMED', 'PREPARING_SHIPMENT', 'SHIPPING'] 
          })
          .getRawOne(),
        
        // 오늘 주문 수
        this.orderRepository
          .createQueryBuilder('order')
          .where('order.orderedAt >= :today', { today })
          .getCount(),
        
        // 오늘 매출
        this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'total')
          .where('order.orderedAt >= :today', { today })
          .andWhere('order.status IN (:...statuses)', { 
            statuses: ['PAYMENT_COMPLETED', 'DELIVERED', 'CONFIRMED', 'PREPARING_SHIPMENT', 'SHIPPING'] 
          })
          .getRawOne(),
        
        // 이번 주 주문 수
        this.orderRepository
          .createQueryBuilder('order')
          .where('order.orderedAt >= :thisWeek', { thisWeek })
          .getCount(),
        
        // 이번 주 매출
        this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'total')
          .where('order.orderedAt >= :thisWeek', { thisWeek })
          .andWhere('order.status IN (:...statuses)', { 
            statuses: ['PAYMENT_COMPLETED', 'DELIVERED', 'CONFIRMED', 'PREPARING_SHIPMENT', 'SHIPPING'] 
          })
          .getRawOne(),
        
        // 이번 달 주문 수
        this.orderRepository
          .createQueryBuilder('order')
          .where('order.orderedAt >= :thisMonth', { thisMonth })
          .getCount(),
        
        // 이번 달 매출
        this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'total')
          .where('order.orderedAt >= :thisMonth', { thisMonth })
          .andWhere('order.status IN (:...statuses)', { 
            statuses: ['PAYMENT_COMPLETED', 'DELIVERED', 'CONFIRMED', 'PREPARING_SHIPMENT', 'SHIPPING'] 
          })
          .getRawOne(),
        
        // 상태별 주문 수
        this.orderRepository
          .createQueryBuilder('order')
          .select('order.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('order.status')
          .getRawMany()
      ]);

      const totalRevenue = parseFloat(totalRevenueResult?.total || '0');
      const revenueToday = parseFloat(revenueTodayResult?.total || '0');
      const revenueThisWeek = parseFloat(revenueThisWeekResult?.total || '0');
      const revenueThisMonth = parseFloat(revenueThisMonthResult?.total || '0');

      // 상태별 카운트를 객체로 변환
      const statusCounts: Record<string, number> = {};
      statusCountsResult.forEach((item: any) => {
        statusCounts[item.status] = parseInt(item.count);
      });

      // 평균 주문 금액 계산
      const averageOrderValue = totalOrdersResult > 0 ? totalRevenue / totalOrdersResult : 0;

      return {
        totalOrders: totalOrdersResult,
        totalRevenue,
        ordersToday: ordersTodayResult,
        revenueToday,
        ordersThisWeek: ordersThisWeekResult,
        revenueThisWeek,
        ordersThisMonth: ordersThisMonthResult,
        revenueThisMonth,
        statusCounts,
        averageOrderValue
      };
    } catch (error) {
      console.error('주문 통계 조회 실패:', error);
      throw new Error('주문 통계를 조회하는 중 오류가 발생했습니다');
    }
  }

  // Order 도메인 객체를 OrderEntity로 변환
  private toOrderEntity(order: Order): OrderEntity {
    const entity = new OrderEntity();
    
    if (order.id) entity.id = order.id;
    entity.orderNumber = order.orderNumber || '';
    entity.userId = order.userId;
    entity.status = order.status;
    entity.shippingPostalCode = order.shippingAddress.postalCode;
    entity.shippingAddress = order.shippingAddress.address;
    entity.shippingDetailAddress = order.shippingAddress.detailAddress;
    entity.recipientName = order.shippingAddress.recipientName;
    entity.recipientPhone = order.shippingAddress.recipientPhone;
    entity.paymentMethod = order.paymentMethod;
    entity.paymentId = order.paymentId;
    entity.subtotal = order.subtotal;
    entity.shippingFee = order.shippingFee;
    entity.totalAmount = order.totalAmount;
    entity.memo = order.memo;
    entity.orderedAt = order.orderedAt;
    entity.createdAt = order.createdAt;
    entity.updatedAt = order.updatedAt;

    return entity;
  }

  // OrderItem을 OrderItemEntity로 변환
  private toOrderItemEntity(orderItem: any): OrderItemEntity {
    const entity = new OrderItemEntity();
    
    entity.id = orderItem.id;
    entity.productId = orderItem.productId;
    entity.productName = orderItem.productName;
    entity.productPrice = orderItem.productPrice;
    entity.quantity = orderItem.quantity;
    entity.totalPrice = orderItem.totalPrice;
    entity.productImageUrl = orderItem.productImageUrl;
    entity.productOptions = orderItem.productOptions;
    entity.createdAt = orderItem.createdAt;
    entity.updatedAt = orderItem.updatedAt;

    return entity;
  }

  // OrderEntity를 Order 도메인 객체로 변환
  private toDomain(orderEntity: OrderEntity, itemEntities: OrderItemEntity[]): Order {
    const orderData = {
      userId: orderEntity.userId,
      items: itemEntities.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: Number(item.productPrice),
        quantity: item.quantity,
        productImageUrl: item.productImageUrl,
        productOptions: item.productOptions,
      })),
      shippingAddress: {
        postalCode: orderEntity.shippingPostalCode,
        address: orderEntity.shippingAddress,
        detailAddress: orderEntity.shippingDetailAddress,
        recipientName: orderEntity.recipientName,
        recipientPhone: orderEntity.recipientPhone,
      },
      paymentMethod: orderEntity.paymentMethod,
      memo: orderEntity.memo,
    };

    const order = new Order(orderData);
    
    // 저장된 정보 설정
    order.id = orderEntity.id;
    order.orderNumber = orderEntity.orderNumber;
    order.status = orderEntity.status as any;
    order.paymentId = orderEntity.paymentId;
    order.orderedAt = orderEntity.orderedAt;
    order.createdAt = orderEntity.createdAt;
    order.updatedAt = orderEntity.updatedAt;

    return order;
  }
}