// ========================================
// CategoryRepositoryImpl - Infrastructure 계층
// src/adapters/CategoryRepositoryImpl.ts
// ========================================

import { injectable, inject } from "inversify";
import { Repository, DataSource } from "typeorm";
import { Category } from "../entities/Category";
import { CategoryEntity } from "./entities/CategoryEntity";
import { CategoryRepository } from "../usecases/types";
import { TYPES } from "../infrastructure/di/types";

/**
 * CategoryRepositoryImpl - PostgreSQL 기반 Category Repository 구현체
 * 단순화된 플랫 구조로 변경
 */
@injectable()
export class CategoryRepositoryImpl implements CategoryRepository {
  private repository: Repository<CategoryEntity>;

  constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
    this.repository = dataSource.getRepository(CategoryEntity);
  }

  /**
   * 카테고리 저장
   */
  async save(category: Category): Promise<Category> {
    try {
      const entity = CategoryEntity.fromDomain(category);
      const savedEntity = await this.repository.save(entity);
      return CategoryEntity.toDomain(savedEntity);
    } catch (error) {
      console.error("카테고리 저장 실패:", error);
      throw new Error(`카테고리 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 카테고리 생성 (save와 동일)
   */
  async create(category: Category): Promise<Category> {
    return this.save(category);
  }

  /**
   * ID로 카테고리 조회
   */
  async findById(id: string): Promise<Category | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id }
      });

      return entity ? CategoryEntity.toDomain(entity) : null;
    } catch (error) {
      console.error(`카테고리 ID 조회 실패 (${id}):`, error);
      throw new Error(`카테고리 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 슬러그로 카테고리 조회
   */
  async findBySlug(slug: string): Promise<Category | null> {
    try {
      const entity = await this.repository.findOne({
        where: { slug }
      });

      return entity ? CategoryEntity.toDomain(entity) : null;
    } catch (error) {
      console.error(`카테고리 슬러그 조회 실패 (${slug}):`, error);
      throw new Error(`카테고리 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 이름으로 카테고리 조회
   */
  async findByName(name: string): Promise<Category | null> {
    try {
      const entity = await this.repository.findOne({
        where: { name }
      });

      return entity ? CategoryEntity.toDomain(entity) : null;
    } catch (error) {
      console.error(`카테고리 이름 조회 실패 (${name}):`, error);
      throw new Error(`카테고리 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 모든 카테고리 조회
   */
  async findAll(options?: { isActive?: boolean }): Promise<Category[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("category");

      if (options?.isActive !== undefined) {
        queryBuilder.where("category.isActive = :isActive", { isActive: options.isActive });
      }

      queryBuilder.orderBy("category.sortOrder", "ASC");

      const entities = await queryBuilder.getMany();
      return entities.map(entity => CategoryEntity.toDomain(entity));
    } catch (error) {
      console.error("카테고리 목록 조회 실패:", error);
      throw new Error(`카테고리 목록 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 카테고리 조회 (정렬 옵션 포함)
   */
  async findMany(options?: {
    isActive?: boolean;
    sortBy?: 'sort_order' | 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Category[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("category");

      if (options?.isActive !== undefined) {
        queryBuilder.where("category.isActive = :isActive", { isActive: options.isActive });
      }

      // 정렬 옵션 적용
      const sortBy = options?.sortBy || 'sort_order';
      const sortOrder = options?.sortOrder?.toUpperCase() || 'ASC';
      
      switch (sortBy) {
        case 'sort_order':
          queryBuilder.orderBy("category.sortOrder", sortOrder as 'ASC' | 'DESC');
          break;
        case 'name':
          queryBuilder.orderBy("category.name", sortOrder as 'ASC' | 'DESC');
          break;
        case 'createdAt':
          queryBuilder.orderBy("category.createdAt", sortOrder as 'ASC' | 'DESC');
          break;
        default:
          queryBuilder.orderBy("category.sortOrder", "ASC");
      }

      const entities = await queryBuilder.getMany();
      return entities.map(entity => CategoryEntity.toDomain(entity));
    } catch (error) {
      console.error("카테고리 목록 조회 실패:", error);
      throw new Error(`카테고리 목록 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 카테고리 업데이트
   */
  async update(category: Category): Promise<Category> {
    try {
      const entity = CategoryEntity.fromDomain(category);
      const updatedEntity = await this.repository.save(entity);
      return CategoryEntity.toDomain(updatedEntity);
    } catch (error) {
      console.error("카테고리 업데이트 실패:", error);
      throw new Error(`카테고리 업데이트 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 카테고리 삭제
   */
  async delete(id: string): Promise<void> {
    try {
      const result = await this.repository.delete({ id });
      
      if (result.affected === 0) {
        throw new Error("삭제할 카테고리를 찾을 수 없습니다");
      }
    } catch (error) {
      console.error(`카테고리 삭제 실패 (${id}):`, error);
      throw new Error(`카테고리 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}