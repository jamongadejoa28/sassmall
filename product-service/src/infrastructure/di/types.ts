// ========================================
// DI Container Types (순환 의존성 해결용)
// src/infrastructure/di/types.ts
// ========================================

/**
 * 의존성 주입 심볼 정의
 *
 * 순환 의존성을 방지하기 위해 별도 파일로 분리
 * Container.ts와 UseCase들이 모두 이 파일을 참조
 */
export const TYPES = {
  // Repositories
  ProductRepository: Symbol.for("ProductRepository"),
  CategoryRepository: Symbol.for("CategoryRepository"),
  InventoryRepository: Symbol.for("InventoryRepository"),
  ProductReviewRepository: Symbol.for("ProductReviewRepository"),
  ProductQnARepository: Symbol.for("ProductQnARepository"),

  // Services
  CacheService: Symbol.for("CacheService"),
  EventPublisher: Symbol.for("EventPublisher"),

  // Use Cases - Product
  CreateProductUseCase: Symbol.for("CreateProductUseCase"),
  GetProductDetailUseCase: Symbol.for("GetProductDetailUseCase"),
  GetProductListUseCase: Symbol.for("GetProductListUseCase"),
  UpdateProductUseCase: Symbol.for("UpdateProductUseCase"),
  DeleteProductUseCase: Symbol.for("DeleteProductUseCase"),
  ToggleProductStatusUseCase: Symbol.for("ToggleProductStatusUseCase"),
  GetProductStatsUseCase: Symbol.for("GetProductStatsUseCase"),
  GetProductReviewsUseCase: Symbol.for("GetProductReviewsUseCase"),
  CreateProductReviewUseCase: Symbol.for("CreateProductReviewUseCase"),
  GetProductQnAUseCase: Symbol.for("GetProductQnAUseCase"),
  CreateProductQnAUseCase: Symbol.for("CreateProductQnAUseCase"),
  AnswerProductQnAUseCase: Symbol.for("AnswerProductQnAUseCase"),
  UpdateInventoryUseCase: Symbol.for("UpdateInventoryUseCase"),

  // Use Cases - Category
  GetCategoryListUseCase: Symbol.for("GetCategoryListUseCase"),
  GetCategoryDetailUseCase: Symbol.for("GetCategoryDetailUseCase"),
  CreateCategoryUseCase: Symbol.for("CreateCategoryUseCase"),
  UpdateCategoryUseCase: Symbol.for("UpdateCategoryUseCase"),
  DeleteCategoryUseCase: Symbol.for("DeleteCategoryUseCase"),

  // Infrastructure
  DataSource: Symbol.for("DataSource"),
  RedisConfig: Symbol.for("RedisConfig"),
  CacheKeyBuilder: Symbol.for("CacheKeyBuilder"),
  CacheStrategyManager: Symbol.for("CacheStrategyManager"),
  
  // Controllers
  ProductController: Symbol.for("ProductController"),
  CategoryController: Symbol.for("CategoryController"),
};
