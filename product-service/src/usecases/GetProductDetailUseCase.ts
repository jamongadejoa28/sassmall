// src/usecases/GetProductDetailUseCase.ts
import { injectable, inject } from "inversify";
import { Product } from "../entities/Product";
import { Category } from "../entities/Category";
import { Inventory } from "../entities/Inventory";
import { ProductRepository, CategoryRepository, InventoryRepository, CacheService } from "./types";
import { DomainError } from "../shared/errors/DomainError";
import { Result } from "../shared/types/Result";
import { TYPES } from "../infrastructure/di/types";

// 응답 DTO 타입 정의
export interface ProductDetailResponse {
  id: string;
  name: string;
  description: string;
  price: number; // 실제 판매가 (할인가)
  originalPrice?: number; // 원가 (할인이 있는 경우에만)
  discountPercentage?: number; // 할인율
  sku: string;
  brand: string;
  tags: string[];
  isActive: boolean;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
    lowStockThreshold: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class GetProductDetailUseCase {
  private readonly CACHE_TTL = 300; // 5분
  private readonly CACHE_KEY_PREFIX = "product_detail:";

  constructor(
    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
    @inject(TYPES.InventoryRepository)
    private readonly inventoryRepository: InventoryRepository,
    @inject(TYPES.CacheService) private readonly cacheService: CacheService
  ) {}

  async execute(productId: string): Promise<Result<ProductDetailResponse>> {
    try {
      // 1. 입력값 유효성 검증
      const validationError = this.validateInput(productId);
      if (validationError) {
        return Result.fail(validationError);
      }

      // 2. 캐시에서 먼저 조회
      const cacheKey = `${this.CACHE_KEY_PREFIX}${productId}`;
      const cachedData =
        await this.cacheService.get<ProductDetailResponse>(cacheKey);

      if (cachedData) {
        return Result.ok(cachedData);
      }

      // 3. Repository에서 데이터 조회
      const product = await this.productRepository.findById(productId);
      if (!product) {
        return Result.fail(DomainError.productNotFound());
      }

      // 4. 비즈니스 규칙 검증
      const businessError = this.validateBusinessRules(product);
      if (businessError) {
        return Result.fail(businessError);
      }

      // 5. 카테고리 정보 조회 및 검증
      const category = await this.categoryRepository.findById(
        product.getCategoryId()
      );
      if (!category) {
        return Result.fail(DomainError.categoryNotFound());
      }

      if (!category.isActive()) {
        return Result.fail(DomainError.categoryInactive());
      }

      // 6. 재고 정보 조회 (없어도 진행)
      const inventory =
        await this.inventoryRepository.findByProductId(productId);

      // 7. 응답 데이터 구성
      const responseData = this.buildResponse(product, category, inventory);

      // 8. 캐시에 저장
      await this.cacheService.set(cacheKey, responseData, this.CACHE_TTL);

      return Result.ok(responseData);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(error);
      }
      return Result.fail(
        new Error("상품 상세 조회 중 예상치 못한 오류가 발생했습니다")
      );
    }
  }

  private validateInput(productId: string): DomainError | null {
    if (!productId || productId.trim() === "") {
      return DomainError.invalidInput("상품 ID는 필수입니다");
    }
    return null;
  }

  private validateBusinessRules(product: Product): DomainError | null {
    if (!product.isActive()) {
      return DomainError.productInactive();
    }
    return null;
  }

  private buildResponse(
    product: Product,
    category: Category,
    inventory: Inventory | null
  ): ProductDetailResponse {
    // 재고 정보 처리
    const availableQuantity = inventory?.getAvailableQuantity() || 0;
    const inventoryInfo = inventory
      ? {
          availableQuantity: availableQuantity,
          reservedQuantity: inventory.getReservedQuantity(),
          status: this.determineInventoryStatus(availableQuantity),
          lowStockThreshold: inventory.getLowStockThreshold(),
        }
      : {
          availableQuantity: 0,
          reservedQuantity: 0,
          status: this.determineInventoryStatus(0),
          lowStockThreshold: 0,
        };

    // SEO 정보 생성 (기본값으로 처리)
    const seoInfo = {
      title: `${product.getName()} - ${product.getBrand()}`,
      description: product.getDescription(),
      keywords: product.getTags(),
    };

    // discountPrice 처리 - undefined인 경우 제외
    const response: ProductDetailResponse = {
      id: product.getId(),
      name: product.getName(),
      description: product.getDescription(),
      price: product.getPrice(),
      sku: product.getSku(),
      brand: product.getBrand(),
      tags: product.getTags(),
      isActive: product.isActive(),
      slug: product.generateSlug(),
      category: {
        id: category.getId(),
        name: category.getName(),
        slug: category.getSlug(),
        description: category.getDescription(),
        isActive: category.isActive(),
      },
      inventory: inventoryInfo,
      seo: seoInfo,
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };

    // 할인 로직: 할인이 있는 경우 originalPrice와 discountPercentage 필드 추가
    if (product.hasDiscount()) {
      response.originalPrice = product.getOriginalPrice(); // 원가
      response.discountPercentage = product.getDiscountPercentage(); // 할인율
      // response.price는 이미 할인된 가격 (DB에서 자동 계산됨)
    }

    return response;
  }

  /**
   * 재고 수량에 따른 상태 결정
   * 요구사항: 1-20: 거의 품절, 0: 품절, >20: 재고 충분
   */
  private determineInventoryStatus(availableQuantity: number): string {
    if (availableQuantity === 0) {
      return "out_of_stock"; // 품절
    } else if (availableQuantity <= 20) {
      return "low_stock"; // 거의 품절
    } else {
      return "sufficient"; // 재고 충분
    }
  }
}
