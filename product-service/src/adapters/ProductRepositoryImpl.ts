// ========================================
// ProductRepositoryImpl - Infrastructure 계층
// src/adapters/ProductRepositoryImpl.ts
// ========================================
import { injectable, inject } from "inversify";
import { Repository, DataSource, SelectQueryBuilder } from "typeorm";
import { Product } from "../entities/Product";
import { ProductEntity } from "./entities/ProductEntity";
import { InventoryEntity } from "./entities/InventoryEntity";
import { ProductRepository } from "../usecases/types";
import { TYPES } from "../infrastructure/di/types";

/**
 * ProductRepositoryImpl - PostgreSQL 기반 Product Repository 구현체
 *
 * 책임:
 * 1. Product Domain 객체와 ProductEntity 간 변환
 * 2. TypeORM을 활용한 데이터베이스 연산
 * 3. 복잡한 검색 및 필터링 쿼리 구현
 * 4. 페이징 및 정렬 지원
 * 5. 트랜잭션 지원
 * 6. 성능 최적화 (인덱스, 쿼리 최적화)
 *
 * Clean Architecture 원칙:
 * - Repository 인터페이스 구현 (의존성 역전)
 * - 도메인 로직 없음 (순수 데이터 접근)
 * - 에러 변환 (infrastructure → domain)
 */
@injectable()
export class ProductRepositoryImpl implements ProductRepository {
  private repository: Repository<ProductEntity>;

  constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductEntity);
  }

  // ========================================
  // 기본 CRUD 연산
  // ========================================

  /**
   * 상품 저장 (생성/수정)
   */
  async save(product: Product): Promise<Product> {
    try {
      // Domain → Entity 변환
      const entity = ProductEntity.fromDomain(product);

      // 데이터베이스 저장
      const savedEntity = await this.repository.save(entity);

      // Entity → Domain 변환 후 반환
      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, "save");
      throw error; // TypeScript를 위한 unreachable
    }
  }

  /**
   * 상품 삭제 (실제 DB에서 제거)
   */
  async delete(id: string): Promise<boolean> {
    try {
      if (!id) {
        return false;
      }

      const result = await this.repository.delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDatabaseError(error, "delete");
      throw error; // TypeScript를 위한 unreachable
    }
  }

  /**
   * ID로 상품 조회
   */
  async findById(id: string): Promise<Product | null> {
    try {
      if (!id) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { id },
      });

      return entity ? entity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, "findById");
      throw error;
    }
  }

  /**
   * SKU로 상품 조회
   */
  async findBySku(sku: string): Promise<Product | null> {
    try {
      if (!sku) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { sku: sku.toUpperCase() },
      });

      return entity ? entity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, "findBySku");
      throw error;
    }
  }


  /**
   * 상품 업데이트
   */
  async update(product: Product): Promise<Product> {
    try {
      // Domain 객체를 직접 저장 (save 메서드와 동일한 로직)
      return await this.save(product);
    } catch (error) {
      this.handleDatabaseError(error, "update");
      throw error;
    }
  }

  /**
   * 모든 상품 조회 (통계용)
   */
  async findAll(): Promise<Product[]> {
    try {
      const entities = await this.repository.find();
      return entities.map(entity => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findAll");
      throw error;
    }
  }

  /**
   * 카테고리별 상품 수 카운트
   */
  async countByCategory(categoryId: string): Promise<number> {
    try {
      return await this.repository.count({
        where: { 
          categoryId,
          isActive: true 
        }
      });
    } catch (error) {
      this.handleDatabaseError(error, "countByCategory");
      throw error;
    }
  }

  // ========================================
  // 검색 및 필터링
  // ========================================

  /**
   * 카테고리별 상품 조회
   */
  async findByCategory(
    categoryId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<{ products: Product[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const queryBuilder = this.repository.createQueryBuilder("product");

      // 기본 필터
      queryBuilder
        .where("product.categoryId = :categoryId", { categoryId })
        .andWhere("product.is_active = :isActive", { isActive: true });

      // 정렬
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Domain 객체로 변환
      const products = entities.map((entity) => entity.toDomain());

      return { products, total };
    } catch (error) {
      this.handleDatabaseError(error, "findByCategory");
      throw error;
    }
  }

  /**
   * 복합 검색 (이름, 설명, 브랜드, 태그)
   */
  async search(options: {
    search?: string;
    categoryId?: string;
    categoryName?: string;
    categoryNames?: string[];
    brand?: string | string[];
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    isActive?: boolean;
    stockStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ products: Product[]; total: number }> {
    console.log(`[CRITICAL] ProductRepositoryImpl.search() CALLED with sortBy: ${options.sortBy}, sortOrder: ${options.sortOrder}`);
    console.log(`[DEBUG] Repository search called with options:`, JSON.stringify(options, null, 2));
    try {
      const {
        search,
        categoryId,
        categoryName,
        categoryNames,
        brand,
        minPrice,
        maxPrice,
        tags,
        isActive, // 기본값 제거 - undefined이면 모든 상품 조회
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      console.log('[DEBUG] Search options:', { categoryId, categoryName, categoryNames });
      console.log('[DEBUG] isActive handling - hasOwnProperty:', options.hasOwnProperty('isActive'), 'isActive value:', isActive);

      const queryBuilder = this.repository.createQueryBuilder("product");
      const conditions: string[] = [];
      const parameters: any = {};

      // isActive 필터링
      if (isActive !== undefined) {
        conditions.push("product.is_active = :isActive");
        parameters.isActive = isActive;
      }

      // 텍스트 검색
      if (search) {
        conditions.push("(COALESCE(LOWER(product.name), '') LIKE LOWER(:search) OR COALESCE(LOWER(product.description), '') LIKE LOWER(:search) OR COALESCE(LOWER(product.brand), '') LIKE LOWER(:search))");
        parameters.search = `%${search}%`;
      }

      // 카테고리 필터
      if (categoryId) {
        queryBuilder.leftJoin("categories", "category", "product.category_id = category.id");
        conditions.push("product.category_id = :categoryId");
        parameters.categoryId = categoryId;
      } else if (categoryName) {
        queryBuilder.leftJoin("categories", "category", "product.category_id = category.id");
        conditions.push("LOWER(category.name) = LOWER(:categoryName)");
        parameters.categoryName = categoryName;
      } else if (categoryNames && categoryNames.length > 0) {
        queryBuilder.leftJoin("categories", "category", "product.category_id = category.id");
        const categoryConditions = categoryNames.map((_, index) => `LOWER(category.name) = LOWER(:categoryName${index})`).join(' OR ');
        const categoryParams: { [key: string]: string } = {};
        categoryNames.forEach((name, index) => {
          parameters[`categoryName${index}`] = name;
        });
        conditions.push(`(${categoryConditions})`);
      }

      // 재고 상태 필터
      if (options.stockStatus) {
        const subQuery = this.dataSource.createQueryBuilder()
          .select("inventory.productId")
          .from(InventoryEntity, "inventory");

        switch (options.stockStatus) {
          case 'inStock':
            subQuery.where("inventory.quantity > 10");
            break;
          case 'lowStock':
            subQuery.where("inventory.quantity > 0 AND inventory.quantity <= 10");
            break;
          case 'outOfStock':
            subQuery.where("inventory.quantity <= 0");
            break;
        }
        conditions.push("product.id IN (" + subQuery.getQuery() + ")");
        Object.assign(parameters, subQuery.getParameters());
      }

      // 브랜드 필터
      if (brand) {
        if (Array.isArray(brand) && brand.length > 0) {
          const brandConditions = brand.map((_, index) => `COALESCE(LOWER(product.brand), '') = LOWER(:brand${index})`).join(" OR ");
          brand.forEach((brandName, index) => { parameters[`brand${index}`] = brandName; });
          conditions.push(`(${brandConditions})`);
        } else if (typeof brand === 'string') {
          conditions.push("COALESCE(LOWER(product.brand), '') = LOWER(:brand)");
          parameters.brand = brand;
        }
      }

      // 가격 범위 필터
      if (minPrice !== undefined) {
        conditions.push("product.price >= :minPrice");
        parameters.minPrice = minPrice;
      }
      if (maxPrice !== undefined) {
        conditions.push("product.price <= :maxPrice");
        parameters.maxPrice = maxPrice;
      }

      // 태그 필터
      if (tags && tags.length > 0) {
        const tagConditions = tags.map((_, index) => `product.tags::jsonb ? :tag${index}`).join(" AND ");
        tags.forEach((tag, index) => { parameters[`tag${index}`] = tag; });
        conditions.push(`(${tagConditions})`);
      }

      // 모든 조건을 AND로 결합
      if (conditions.length > 0) {
        queryBuilder.where(conditions.join(" AND "), parameters);
      }

      // 정렬
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행 전 SQL 로깅
      const sqlQuery = queryBuilder.getSql();
      console.log(`[DEBUG] Generated SQL Query: ${sqlQuery}`);
      console.log(`[DEBUG] Query Parameters:`, queryBuilder.getParameters());

      // 실행
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Domain 객체로 변환
      const products = entities.map((entity) => entity.toDomain());

      return { products, total };
    } catch (error) {
      this.handleDatabaseError(error, "search");
      throw error;
    }
  }

  /**
   * 브랜드별 상품 조회
   */
  async findByBrand(brand: string): Promise<Product[]> {
    try {
      const entities = await this.repository.find({
        where: {
          brand: brand,
          isActive: true,
        },
        order: { createdAt: "DESC" },
      });

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findByBrand");
      throw error;
    }
  }

  // ========================================
  // 집계 및 통계
  // ========================================


  /**
   * 브랜드 목록 조회 (활성 상품 기준)
   */
  async getActiveBrands(): Promise<string[]> {
    try {
      const result = await this.repository
        .createQueryBuilder("product")
        .select("DISTINCT COALESCE(product.brand, '')", "brand")
        .where("product.is_active = :isActive", { isActive: true })
        .andWhere("product.brand IS NOT NULL")
        .orderBy("product.brand", "ASC")
        .getRawMany();

      return result.map((row) => row.brand).filter(Boolean);
    } catch (error) {
      this.handleDatabaseError(error, "getActiveBrands");
      throw error;
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 정렬 조건 적용
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<ProductEntity>,
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): void {
    console.log(`[DEBUG] applySorting called with sortBy: "${sortBy}", sortOrder: "${sortOrder}"`);
    
    const validSortFields = [
      "name",
      "price", 
      "brand",
      "createdAt",
      "updatedAt",
    ];

    console.log(`[DEBUG] Valid sort fields: ${validSortFields.join(', ')}`);
    console.log(`[DEBUG] Is "${sortBy}" in valid fields? ${validSortFields.includes(sortBy)}`);

    if (validSortFields.includes(sortBy)) {
      console.log(`[DEBUG] Valid sort field detected: ${sortBy}`);
      if (sortBy === "price") {
        // 가격으로 정렬 (price 컬럼만 사용)
        console.log(`[DEBUG] Applying price sort: product.price ${sortOrder.toUpperCase()}`);
        queryBuilder.orderBy(
          "product.price",
          sortOrder.toUpperCase() as "ASC" | "DESC"
        );
      } else {
        console.log(`[DEBUG] Applying ${sortBy} sort: product.${sortBy} ${sortOrder.toUpperCase()}`);
        queryBuilder.orderBy(
          `product.${sortBy}`,
          sortOrder.toUpperCase() as "ASC" | "DESC"
        );
      }
    } else {
      // 기본 정렬
      console.log(`[DEBUG] Invalid sort field "${sortBy}", applying default sort: product.createdAt DESC`);
      queryBuilder.orderBy("product.createdAt", "DESC");
    }
  }

  /**
   * 데이터베이스 에러 처리 및 도메인 에러로 변환
   */
  private handleDatabaseError(error: any, operation: string): void {
    console.error(`[ProductRepository] ${operation} 오류:`, error);
    console.error(`[ProductRepository] 에러 코드:`, error.code);
    console.error(`[ProductRepository] 에러 메시지:`, error.message);
    console.error(`[ProductRepository] 에러 상세:`, error.detail);
    console.error(`[ProductRepository] 에러 위치:`, error.position);

    // PostgreSQL 에러 코드에 따른 도메인 에러 변환
    if (error.code === "23505") {
      // Unique violation
      if (error.constraint?.includes("sku")) {
        throw new Error("이미 존재하는 SKU입니다");
      }
      throw new Error("중복된 데이터입니다");
    }

    if (error.code === "23503") {
      // Foreign key violation
      throw new Error("참조 데이터가 존재하지 않습니다");
    }

    if (error.code === "23514") {
      // Check constraint violation
      throw new Error("데이터 제약 조건을 위반했습니다");
    }

    // 기타 데이터베이스 에러
    throw new Error(`데이터베이스 오류가 발생했습니다: ${operation} - ${error.message || 'Unknown error'}`);
  }

  // ========================================
  // 트랜잭션 지원 메서드
  // ========================================

  /**
   * 트랜잭션 내에서 상품 저장
   */
  async saveInTransaction(
    product: Product,
    queryRunner?: any
  ): Promise<Product> {
    try {
      const repository = queryRunner
        ? queryRunner.manager.getRepository(ProductEntity)
        : this.repository;

      const entity = ProductEntity.fromDomain(product);
      const savedEntity = await repository.save(entity);

      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, "saveInTransaction");
      throw error;
    }
  }
}
