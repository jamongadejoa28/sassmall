// ========================================
// CreateProductUseCase - Use Case 계층
// src/usecases/CreateProductUseCase.ts
// ========================================
import { injectable, inject } from "inversify";
import { Product } from "../entities/Product";
import { Inventory } from "../entities/Inventory";
import { TYPES } from "../infrastructure/di/types";
import {
  ProductRepository,
  CategoryRepository,
  InventoryRepository,
  EventPublisher,
  CacheService,
  CreateProductRequest,
  CreateProductResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
  ProductCreatedEvent,
  InventoryCreatedEvent,
} from "./types";

/**
 * CreateProductUseCase - 상품 생성 Use Case
 *
 * 책임:
 * 1. 입력 데이터 유효성 검증
 * 2. 비즈니스 규칙 검증 (카테고리 존재, SKU 중복)
 * 3. Product Entity 생성 및 저장
 * 4. Inventory Entity 생성 및 저장
 * 5. 도메인 이벤트 발행
 * 6. 트랜잭션 무결성 보장
 * 7. 적절한 에러 처리
 */
@injectable()
export class CreateProductUseCase
  implements UseCase<CreateProductRequest, CreateProductResponse>
{
  constructor(
    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
    @inject(TYPES.InventoryRepository)
    private readonly inventoryRepository: InventoryRepository,
    @inject(TYPES.EventPublisher)
    private readonly eventPublisher: EventPublisher,
    @inject(TYPES.CacheService)
    private readonly cacheService: CacheService
  ) {}

  async execute(
    request: CreateProductRequest
  ): Promise<Result<CreateProductResponse>> {
    try {
      // 1. 입력 데이터 기본 검증 (Entity 검증 포함)
      await this.validateRequest(request);

      // 2. 비즈니스 규칙 검증
      await this.validateBusinessRules(request);

      // 3. Product Entity 생성 및 저장
      const product = await this.createAndSaveProduct(request);

      // 4. Inventory Entity 생성 및 저장
      const inventory = await this.createAndSaveInventory(
        product.getId(),
        request.initialStock
      );

      // 5. 도메인 이벤트 발행
      await this.publishDomainEvents(product, inventory);

      // 6. 관련 캐시 무효화
      await this.invalidateRelatedCaches();

      // 7. 성공 응답 반환
      return Result.ok(this.buildResponse(product, inventory));
    } catch (error) {
      // 7. 에러 처리
      return this.handleError(error);
    }
  }

  // ========================================
  // 입력 데이터 검증
  // ========================================

  private async validateRequest(request: CreateProductRequest): Promise<void> {
    // 1. Product Entity 도메인 검증 (이름, 가격, SKU, 브랜드 등)
    this.validateProductData(request);

    // 2. 초기 재고 검증
    this.validateInitialStock(request.initialStock);
  }

  private validateProductData(request: CreateProductRequest): void {
    try {
      // Product Entity 생성을 통한 도메인 검증 (실제 저장하지 않음)
      const productData: any = {
        name: request.name,
        description: request.description,
        originalPrice: request.price, // 원가로 설정
        discountPercentage: request.discountPercent, // 할인율 추가
        categoryId: request.categoryId,
        brand: request.brand,
        sku: request.sku,
        tags: request.tags || [],
        imageUrls: request.imageUrls || [],
        thumbnailUrl: request.thumbnailUrl,
      };

      // 선택적 속성 조건부 추가
      if (request.weight !== undefined) {
        productData.weight = request.weight;
      }

      if (request.dimensions !== undefined) {
        productData.dimensions = request.dimensions;
      }

      // Entity 검증 (도메인 규칙 적용)
      Product.create(productData);
    } catch (error) {
      // Entity 검증 오류를 DomainError로 변환
      if (error instanceof Error) {
        throw new DomainError(error.message, "VALIDATION_ERROR");
      }
      throw error;
    }
  }

  private validateInitialStock(
    initialStock: CreateProductRequest["initialStock"]
  ): void {
    if (!initialStock) {
      throw new DomainError(
        "초기 재고 정보는 필수입니다",
        "INITIAL_STOCK_REQUIRED"
      );
    }

    // quantity가 null, undefined, 빈 문자열인 경우 0으로 처리
    const quantity = initialStock.quantity ?? 0;
    if (quantity < 0) {
      throw new DomainError(
        "재고 수량은 0 이상이어야 합니다",
        "INVALID_STOCK_QUANTITY"
      );
    }

    // lowStockThreshold가 없으면 기본값 10 사용
    const lowStockThreshold = initialStock.lowStockThreshold ?? 10;
    if (lowStockThreshold < 0) {
      throw new DomainError(
        "부족 임계값은 0 이상이어야 합니다",
        "INVALID_LOW_STOCK_THRESHOLD"
      );
    }

    // location이 없으면 기본값 사용
    const location = initialStock.location || "MAIN_WAREHOUSE";
    if (!location.trim().length) {
      throw new DomainError("저장 위치는 필수입니다", "LOCATION_REQUIRED");
    }
  }

  // ========================================
  // 비즈니스 규칙 검증
  // ========================================

  private async validateBusinessRules(
    request: CreateProductRequest
  ): Promise<void> {
    // 병렬로 검증 수행 (성능 최적화)
    const [category, existingProduct] = await Promise.all([
      this.validateCategory(request.categoryId),
      this.validateSKU(request.sku),
    ]);

    // 카테고리 활성 상태 확인
    if (!category.isActive()) {
      throw new DomainError(
        "비활성화된 카테고리에는 상품을 등록할 수 없습니다",
        "INACTIVE_CATEGORY",
        400
      );
    }
  }

  private async validateCategory(categoryId: string): Promise<any> {
    try {
      const category = await this.categoryRepository.findById(categoryId);

      if (!category) {
        throw new DomainError(
          "카테고리를 찾을 수 없습니다",
          "CATEGORY_NOT_FOUND",
          404
        );
      }

      return category;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError(
        "카테고리 조회 중 오류가 발생했습니다",
        error as Error
      );
    }
  }

  private async validateSKU(sku: string): Promise<void> {
    try {
      const existingProduct = await this.productRepository.findBySku(sku);

      if (existingProduct) {
        throw new DomainError("이미 존재하는 SKU입니다", "DUPLICATE_SKU", 409);
      }
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError(
        "SKU 중복 확인 중 오류가 발생했습니다",
        error as Error
      );
    }
  }

  // ========================================
  // Entity 생성 및 저장
  // ========================================

  private async createAndSaveProduct(
    request: CreateProductRequest
  ): Promise<Product> {
    try {
      // Product Entity 생성 데이터 준비 (조건부 할당)
      const productData: any = {
        name: request.name,
        description: request.description,
        originalPrice: request.price, // 원가로 설정
        discountPercentage: request.discountPercent, // 할인율 추가
        categoryId: request.categoryId,
        brand: request.brand,
        sku: request.sku,
        tags: request.tags || [],
        imageUrls: request.imageUrls || [],
        thumbnailUrl: request.thumbnailUrl,
      };

      // 선택적 속성 조건부 추가
      if (request.weight !== undefined) {
        productData.weight = request.weight;
      }

      if (request.dimensions !== undefined) {
        productData.dimensions = request.dimensions;
      }

      // Product Entity 생성 (도메인 검증 포함)
      const product = Product.create(productData);

      // Product 저장
      const savedProduct = await this.productRepository.save(product);
      return savedProduct;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError("상품 저장에 실패했습니다", error as Error);
    }
  }

  private async createAndSaveInventory(
    productId: string,
    initialStock: CreateProductRequest["initialStock"]
  ): Promise<Inventory> {
    try {
      // Inventory Entity 생성 (도메인 검증 포함)
      const inventory = Inventory.create({
        productId,
        quantity: initialStock.quantity,
        reservedQuantity: 0, // 초기 예약량은 0
        lowStockThreshold: initialStock.lowStockThreshold,
        location: initialStock.location,
      });

      // Inventory 저장
      const savedInventory = await this.inventoryRepository.save(inventory);
      return savedInventory;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError("재고 생성에 실패했습니다", error as Error);
    }
  }

  // ========================================
  // 도메인 이벤트 발행
  // ========================================

  private async publishDomainEvents(
    product: Product,
    inventory: Inventory
  ): Promise<void> {
    try {
      // Product 생성 이벤트 발행
      const productCreatedEvent: ProductCreatedEvent = {
        type: "ProductCreated",
        productId: product.getId(),
        productName: product.getName(),
        categoryId: product.getCategoryId(),
        price: product.getPrice(),
        brand: product.getBrand(),
        createdAt: product.getCreatedAt(),
      };

      // Inventory 생성 이벤트 발행
      const inventoryCreatedEvent: InventoryCreatedEvent = {
        type: "InventoryCreated",
        productId: inventory.getProductId(),
        quantity: inventory.getQuantity(),
        location: inventory.getLocation(),
        createdAt: inventory.getCreatedAt(),
      };

      // 병렬로 이벤트 발행
      await Promise.all([
        this.eventPublisher.publish(productCreatedEvent),
        this.eventPublisher.publish(inventoryCreatedEvent),
      ]);
    } catch (error) {
      // 이벤트 발행 실패는 로그만 남기고 무시 (비즈니스 로직에 영향 X)
      console.error("도메인 이벤트 발행 실패:", error);
    }
  }

  // ========================================
  // 응답 생성
  // ========================================

  private buildResponse(
    product: Product,
    inventory: Inventory
  ): CreateProductResponse {
    const response: any = {
      product: {
        id: product.getId(),
        name: product.getName(),
        description: product.getDescription(),
        price: product.getPrice(),
        categoryId: product.getCategoryId(),
        brand: product.getBrand(),
        sku: product.getSku(),
        tags: product.getTags(),
        isActive: product.isActive(),
        createdAt: product.getCreatedAt(),
      },
      inventory: {
        id: inventory.getId(),
        productId: inventory.getProductId(),
        quantity: inventory.getQuantity(),
        availableQuantity: inventory.getAvailableQuantity(),
        location: inventory.getLocation(),
        lowStockThreshold: inventory.getLowStockThreshold(),
        status: inventory.getStatus(),
      },
    };

    // 선택적 속성 조건부 추가
    if (product.getWeight() !== undefined) {
      response.product.weight = product.getWeight();
    }

    if (product.getDimensions() !== undefined) {
      response.product.dimensions = product.getDimensions();
    }

    return response;
  }

  // ========================================
  // 캐시 무효화
  // ========================================

  private async invalidateRelatedCaches(): Promise<void> {
    try {
      // 모든 product_list 관련 캐시를 패턴으로 무효화
      await this.cacheService.invalidatePattern('product_list:*');
      console.log('[CreateProductUseCase] 상품 목록 캐시 패턴 무효화 완료');
    } catch (error) {
      // 캐시 무효화 실패는 로그만 남기고 무시 (비즈니스 로직에 영향 X)
      console.error('[CreateProductUseCase] 캐시 무효화 실패:', error);
      
      // 패턴 무효화가 실패하면 개별 키들을 삭제 시도
      try {
        const commonCacheKeys = [
          'product_list:page:1:limit:20:sort:created_desc',
          'product_list:page:1:limit:10:sort:created_desc', 
          'product_list:page:1:limit:50:sort:created_desc',
          'product_list:page:1:limit:20:sort:name_asc',
          'product_list:page:1:limit:20:sort:price_asc',
          'product_list:page:1:limit:20:sort:price_desc',
        ];

        await Promise.all(
          commonCacheKeys.map(key => 
            this.cacheService.delete(key).catch((err: any) => {
              console.warn(`캐시 삭제 실패 (${key}):`, err);
            })
          )
        );
        console.log('[CreateProductUseCase] 개별 캐시 키 삭제 완료');
      } catch (fallbackError) {
        console.error('[CreateProductUseCase] 개별 캐시 삭제도 실패:', fallbackError);
      }
    }
  }

  // ========================================
  // 에러 처리
  // ========================================

  private handleError(error: unknown): Result<CreateProductResponse> {
    if (error instanceof DomainError) {
      return Result.fail(error);
    }

    if (error instanceof RepositoryError) {
      return Result.fail(error);
    }

    if (error instanceof Error) {
      return Result.fail(error);
    }

    // 예상하지 못한 에러
    console.error("CreateProductUseCase 예상하지 못한 에러:", error);
    return Result.fail(new Error("상품 생성 중 알 수 없는 오류가 발생했습니다"));
  }
}
