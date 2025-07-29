// ========================================
// DI Container Types - cart-service
// cart-service/src/infrastructure/di/types.ts
// ========================================

/**
 * 의존성 주입 심볼 정의
 *
 * 순환 의존성을 방지하기 위해 별도 파일로 분리
 * Container.ts와 UseCase들이 모두 이 파일을 참조
 */
export const TYPES = {
  // ========================================
  // Repositories
  // ========================================
  CartRepository: Symbol.for("CartRepository"),
  ProductServiceClient: Symbol.for("ProductServiceClient"),

  // ========================================
  // Services (새로운 Redis 아키텍처)
  // ========================================
  CacheService: Symbol.for("CacheService"),

  // ========================================
  // Use Cases
  // ========================================
  AddToCartUseCase: Symbol.for("AddToCartUseCase"),
  GetCartUseCase: Symbol.for("GetCartUseCase"),
  RemoveFromCartUseCase: Symbol.for("RemoveFromCartUseCase"),
  UpdateCartItemUseCase: Symbol.for("UpdateCartItemUseCase"),
  TransferCartUseCase: Symbol.for("TransferCartUseCase"),
  ClearCartUseCase: Symbol.for("ClearCartUseCase"),
  DeleteCartUseCase: Symbol.for("DeleteCartUseCase"),
  CleanupSessionCartUseCase: Symbol.for("CleanupSessionCartUseCase"),

  // ========================================
  // Controllers
  // ========================================
  CartController: Symbol.for("CartController"),

  // ========================================
  // Infrastructure (새로운 Redis 아키텍처)
  // ========================================
  DataSource: Symbol.for("DataSource"),
  RedisConfig: Symbol.for("RedisConfig"),
};
