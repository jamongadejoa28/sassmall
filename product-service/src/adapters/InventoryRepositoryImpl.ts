// ========================================
// InventoryRepositoryImpl - Infrastructure 계층 (수정됨)
// src/adapters/InventoryRepositoryImpl.ts
// ========================================
import { injectable, inject } from "inversify";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { Inventory } from "../entities/Inventory";
import { InventoryEntity, InventoryStatus } from "./entities/InventoryEntity";
import { InventoryRepository } from "../usecases/types";
import { TYPES } from "../infrastructure/di/types";

/**
 * InventoryRepositoryImpl - PostgreSQL 기반 Inventory Repository 구현체
 *
 * 책임:
 * 1. Inventory Domain 객체와 InventoryEntity 간 변환
 * 2. 동시성 제어 (Optimistic/Pessimistic Locking)
 * 3. 재고 수량 정확성 보장
 * 4. 재고 상태별 조회 및 필터링
 * 5. 재고 히스토리 추적 지원
 * 6. 성능 최적화 (배치 업데이트)
 *
 * 특징:
 * - Product와 1:1 관계
 * - 트랜잭션 필수 (재고 정확성)
 * - Row-level locking 지원
 * - 상태별 인덱싱 최적화
 */
@injectable()
export class InventoryRepositoryImpl implements InventoryRepository {
  private repository: Repository<InventoryEntity>;

  constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
    this.repository = dataSource.getRepository(InventoryEntity);
  }

  // ========================================
  // 기본 CRUD 연산
  // ========================================

  /**
   * 재고 저장 (생성/수정)
   */
  async save(inventory: Inventory): Promise<Inventory> {
    try {
      // Domain → Entity 변환
      const entity = InventoryEntity.fromDomain(inventory);

      // 재고 상태 자동 계산
      this.updateInventoryStatus(entity);

      // 데이터베이스 저장
      const savedEntity = await this.repository.save(entity);

      // Entity → Domain 변환 후 반환
      return InventoryEntity.toDomain(savedEntity);
    } catch (error) {
      this.handleDatabaseError(error, "save");
      throw error;
    }
  }

  /**
   * ID로 재고 조회
   */
  async findById(id: string): Promise<Inventory | null> {
    try {
      if (!id) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { id },
      });

      return entity ? InventoryEntity.toDomain(entity) : null;
    } catch (error) {
      this.handleDatabaseError(error, "findById");
      throw error;
    }
  }

  /**
   * 상품 ID로 재고 조회
   */
  async findByProductId(productId: string): Promise<Inventory | null> {
    try {
      if (!productId) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { productId },
      });

      return entity ? InventoryEntity.toDomain(entity) : null;
    } catch (error) {
      this.handleDatabaseError(error, "findByProductId");
      throw error;
    }
  }

  /**
   * 재고 업데이트 (인터페이스 요구사항)
   */
  async update(inventory: Inventory): Promise<Inventory> {
    try {
      // save 메서드와 동일한 로직 (TypeORM save는 create/update 모두 처리)
      return await this.save(inventory);
    } catch (error) {
      this.handleDatabaseError(error, "update");
      throw error;
    }
  }

  /**
   * 재고 삭제 (실제로는 거의 사용하지 않음)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      this.handleDatabaseError(error, "delete");
      throw error;
    }
  }

  // ========================================
  // 동시성 제어 및 락킹
  // ========================================

  /**
   * 상품 ID로 재고 조회 (비관적 락킹)
   * 재고 수정 시 동시성 문제 방지
   */
  async findByProductIdWithLock(
    productId: string,
    queryRunner?: QueryRunner
  ): Promise<Inventory | null> {
    try {
      if (!productId) {
        return null;
      }

      const manager = queryRunner?.manager || this.dataSource.manager;

      const entity = await manager
        .createQueryBuilder(InventoryEntity, "inventory")
        .where("inventory.productId = :productId", { productId })
        .setLock("pessimistic_write") // Row-level lock
        .getOne();

      return entity ? InventoryEntity.toDomain(entity) : null;
    } catch (error) {
      this.handleDatabaseError(error, "findByProductIdWithLock");
      throw error;
    }
  }

  /**
   * 트랜잭션 내에서 재고 저장 (락킹 포함)
   */
  async saveInTransaction(
    inventory: Inventory,
    queryRunner: QueryRunner
  ): Promise<Inventory> {
    try {
      const repository = queryRunner.manager.getRepository(InventoryEntity);

      const entity = InventoryEntity.fromDomain(inventory);
      this.updateInventoryStatus(entity);

      const savedEntity = await repository.save(entity);

      return InventoryEntity.toDomain(savedEntity);
    } catch (error) {
      this.handleDatabaseError(error, "saveInTransaction");
      throw error;
    }
  }

  // ========================================
  // 상태별 조회 및 필터링
  // ========================================

  /**
   * 재고 상태별 조회
   */
  async findByStatus(
    status: string,
    options: {
      page?: number;
      limit?: number;
      location?: string;
    } = {}
  ): Promise<{ inventories: Inventory[]; total: number }> {
    try {
      const { page = 1, limit = 50, location } = options;

      const queryBuilder = this.repository.createQueryBuilder("inventory");

      // 상태 필터
      queryBuilder.where("inventory.status = :status", { status });

      // 위치 필터
      if (location) {
        queryBuilder.andWhere("inventory.location = :location", { location });
      }

      // 정렬 (가용 수량 오름차순)
      queryBuilder.orderBy("inventory.availableQuantity", "ASC");

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Domain 객체로 변환
      const inventories = entities.map((entity) => InventoryEntity.toDomain(entity));

      return { inventories, total };
    } catch (error) {
      this.handleDatabaseError(error, "findByStatus");
      throw error;
    }
  }

  /**
   * 재고 부족 상품들 조회 (인터페이스 요구사항)
   */
  async findLowStock(threshold?: number): Promise<Inventory[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("inventory");

      if (threshold !== undefined) {
        // 특정 임계값 사용
        queryBuilder.where("inventory.availableQuantity <= :threshold", {
          threshold,
        });
      } else {
        // 각 상품의 개별 임계값 사용
        queryBuilder.where(
          "inventory.availableQuantity <= inventory.lowStockThreshold"
        );
      }

      // 정렬 (심각한 재고 부족 순)
      queryBuilder.orderBy(
        "(inventory.availableQuantity - inventory.lowStockThreshold)",
        "ASC"
      );

      const entities = await queryBuilder.getMany();

      return entities.map((entity) => InventoryEntity.toDomain(entity));
    } catch (error) {
      this.handleDatabaseError(error, "findLowStock");
      throw error;
    }
  }

  /**
   * 재고 부족 상품들 조회 (기존 메서드명 유지)
   */
  async findLowStockItems(location?: string): Promise<Inventory[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("inventory");

      // 재고 부족 조건
      queryBuilder.where(
        "inventory.availableQuantity <= inventory.lowStockThreshold"
      );

      // 위치 필터
      if (location) {
        queryBuilder.andWhere("inventory.location = :location", { location });
      }

      // 정렬 (심각한 재고 부족 순)
      queryBuilder.orderBy(
        "(inventory.availableQuantity - inventory.lowStockThreshold)",
        "ASC"
      );

      const entities = await queryBuilder.getMany();

      return entities.map((entity) => InventoryEntity.toDomain(entity));
    } catch (error) {
      this.handleDatabaseError(error, "findLowStockItems");
      throw error;
    }
  }

  /**
   * 품절 상품들 조회
   */
  async findOutOfStockItems(location?: string): Promise<Inventory[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("inventory");

      // 품절 조건
      queryBuilder.where("inventory.availableQuantity <= 0");

      // 위치 필터
      if (location) {
        queryBuilder.andWhere("inventory.location = :location", { location });
      }

      // 정렬 (최근 업데이트 순)
      queryBuilder.orderBy("inventory.updatedAt", "DESC");

      const entities = await queryBuilder.getMany();

      return entities.map((entity) => InventoryEntity.toDomain(entity));
    } catch (error) {
      this.handleDatabaseError(error, "findOutOfStockItems");
      throw error;
    }
  }

  /**
   * 위치별 재고 조회
   */
  async findByLocation(location: string): Promise<Inventory[]> {
    try {
      const entities = await this.repository.find({
        where: { location },
        order: {
          availableQuantity: "ASC",
        },
      });

      return entities.map((entity) => InventoryEntity.toDomain(entity));
    } catch (error) {
      this.handleDatabaseError(error, "findByLocation");
      throw error;
    }
  }

  // ========================================
  // 배치 처리 및 대량 업데이트
  // ========================================

  /**
   * 여러 재고를 한 번에 업데이트 (배치 처리)
   */
  async updateBatch(inventories: Inventory[]): Promise<void> {
    try {
      const entities = inventories.map((inventory) => {
        const entity = InventoryEntity.fromDomain(inventory);
        this.updateInventoryStatus(entity);
        return entity;
      });

      // 배치 저장
      await this.repository.save(entities);
    } catch (error) {
      this.handleDatabaseError(error, "updateBatch");
      throw error;
    }
  }

  /**
   * 특정 조건의 재고 임계값 일괄 업데이트
   */
  async updateLowStockThresholdBatch(
    location: string,
    newThreshold: number
  ): Promise<number> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(InventoryEntity)
        .set({
          lowStockThreshold: newThreshold,
          updatedAt: () => "CURRENT_TIMESTAMP",
        })
        .where("location = :location", { location })
        .execute();

      return result.affected || 0;
    } catch (error) {
      this.handleDatabaseError(error, "updateLowStockThresholdBatch");
      throw error;
    }
  }

  // ========================================
  // 집계 및 통계
  // ========================================

  /**
   * 위치별 재고 통계
   */
  async getInventoryStatsByLocation(): Promise<
    Array<{
      location: string;
      totalItems: number;
      lowStockItems: number;
      outOfStockItems: number;
      totalQuantity: number;
      totalAvailable: number;
      totalReserved: number;
    }>
  > {
    try {
      const query = `
        SELECT 
          location,
          COUNT(*) as total_items,
          SUM(CASE WHEN available_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_items,
          SUM(CASE WHEN available_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_items,
          SUM(quantity) as total_quantity,
          SUM(available_quantity) as total_available,
          SUM(reserved_quantity) as total_reserved
        FROM inventories 
        GROUP BY location
        ORDER BY location
      `;

      const results = await this.repository.query(query);

      return results.map((row: any) => ({
        location: row.location,
        totalItems: parseInt(row.total_items),
        lowStockItems: parseInt(row.low_stock_items),
        outOfStockItems: parseInt(row.out_of_stock_items),
        totalQuantity: parseInt(row.total_quantity),
        totalAvailable: parseInt(row.total_available),
        totalReserved: parseInt(row.total_reserved),
      }));
    } catch (error) {
      this.handleDatabaseError(error, "getInventoryStatsByLocation");
      throw error;
    }
  }

  /**
   * 재고 상태별 개수 조회
   */
  async getStatusCounts(): Promise<{
    sufficient: number;
    lowStock: number;
    outOfStock: number;
  }> {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM inventories 
        GROUP BY status
      `;

      const results = await this.repository.query(query);

      const counts = {
        sufficient: 0,
        lowStock: 0,
        outOfStock: 0,
      };

      results.forEach((row: any) => {
        switch (row.status) {
          case "sufficient":
            counts.sufficient = parseInt(row.count);
            break;
          case "low_stock":
            counts.lowStock = parseInt(row.count);
            break;
          case "out_of_stock":
            counts.outOfStock = parseInt(row.count);
            break;
        }
      });

      return counts;
    } catch (error) {
      this.handleDatabaseError(error, "getStatusCounts");
      throw error;
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 재고 상태 자동 업데이트 (단순화됨)
   */
  private updateInventoryStatus(entity: InventoryEntity): void {
    // 단순화된 스키마에서는 availableQuantity가 직접 저장됨
    // status와 reservedQuantity는 계산된 값으로만 사용
  }

  /**
   * 데이터베이스 에러 처리 및 도메인 에러로 변환
   */
  private handleDatabaseError(error: any, operation: string): void {
    console.error(`[InventoryRepository] ${operation} 오류:`, error);

    // PostgreSQL 에러 코드에 따른 도메인 에러 변환
    if (error.code === "23505") {
      // Unique violation
      if (error.constraint?.includes("product_id")) {
        throw new Error("해당 상품의 재고가 이미 존재합니다");
      }
      throw new Error("중복된 재고 데이터입니다");
    }

    if (error.code === "23503") {
      // Foreign key violation
      throw new Error("존재하지 않는 상품입니다");
    }

    if (error.code === "23514") {
      // Check constraint violation
      throw new Error("재고 데이터 제약 조건을 위반했습니다");
    }

    // 동시성 제어 관련 에러
    if (error.message?.includes("could not serialize access")) {
      throw new Error(
        "재고 업데이트 중 동시성 충돌이 발생했습니다. 다시 시도해주세요."
      );
    }

    // 기타 데이터베이스 에러
    throw new Error(`재고 데이터베이스 오류가 발생했습니다: ${operation}`);
  }

  // ========================================
  // 재고 히스토리 관련 (향후 확장)
  // ========================================

  /**
   * 재고 변동 히스토리 조회 (향후 구현 예정)
   */
  async findInventoryHistory(
    productId: string,
    limit: number = 50
  ): Promise<any[]> {
    // TODO: 별도 InventoryHistory 테이블 구현 시 활용
    return [];
  }
}
