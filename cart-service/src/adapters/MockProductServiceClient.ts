// ========================================
// Mock ProductServiceClient (수정됨)
// cart-service/src/adapters/MockProductServiceClient.ts
// ========================================

import { injectable } from "inversify";
import {
  ProductServiceClient,
  ProductInfo,
  InventoryCheckResult,
} from "../usecases/types";

/**
 * Mock 통계 인터페이스
 */
interface MockStats {
  totalProducts: number;
  totalCalls: number;
  getProductCalls: number;
  checkInventoryCalls: number;
  reserveInventoryCalls: number;
}

@injectable()
export class MockProductServiceClient implements ProductServiceClient {
  // 🔧 추가: 테스트용 상품 데이터 저장소
  private mockProducts: Map<string, ProductInfo> = new Map();

  // 🔧 추가: Mock 설정
  private delay: number = 0;
  private errorMode: boolean = false;

  // 🔧 추가: 통계 추적
  private stats: MockStats = {
    totalProducts: 0,
    totalCalls: 0,
    getProductCalls: 0,
    checkInventoryCalls: 0,
    reserveInventoryCalls: 0,
  };

  constructor() {
    // 기본 테스트 데이터 초기화
    this.initializeDefaultProducts();
  }

  // ========================================
  // ProductServiceClient 인터페이스 구현
  // ========================================

  async getProduct(productId: string): Promise<ProductInfo | null> {
    this.stats.totalCalls++;
    this.stats.getProductCalls++;

    await this.simulateDelay();

    if (this.errorMode) {
      throw new Error("Mock Product Service Error");
    }

    return this.mockProducts.get(productId) || null;
  }

  async checkInventory(
    productId: string,
    quantity: number
  ): Promise<InventoryCheckResult> {
    this.stats.totalCalls++;
    this.stats.checkInventoryCalls++;

    await this.simulateDelay();

    if (this.errorMode) {
      throw new Error("Mock Product Service Error");
    }

    const product = await this.getProduct(productId);

    if (!product) {
      return {
        productId,
        requestedQuantity: quantity,
        availableQuantity: 0,
        isAvailable: false,
        message: "상품을 찾을 수 없습니다",
      };
    }

    const isAvailable = product.availableQuantity >= quantity;

    return {
      productId,
      requestedQuantity: quantity,
      availableQuantity: product.availableQuantity,
      isAvailable,
      message: isAvailable
        ? "재고가 충분합니다"
        : `재고가 부족합니다. 요청: ${quantity}, 가용: ${product.availableQuantity}`,
    };
  }

  async reserveInventory(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    this.stats.totalCalls++;
    this.stats.reserveInventoryCalls++;

    await this.simulateDelay();

    if (this.errorMode) {
      throw new Error("Mock Product Service Error");
    }

    const product = this.mockProducts.get(productId);
    if (!product) {
      return false;
    }

    if (product.availableQuantity >= quantity) {
      // 재고 감소 시뮬레이션
      const updatedProduct = {
        ...product,
        availableQuantity: product.availableQuantity - quantity,
        inventory: {
          ...product.inventory,
          quantity: product.inventory.quantity - quantity,
          status:
            product.availableQuantity - quantity === 0
              ? ("out_of_stock" as const)
              : product.availableQuantity - quantity <= 5
                ? ("low_stock" as const)
                : ("in_stock" as const),
        },
      };

      this.mockProducts.set(productId, updatedProduct);
      return true;
    }

    return false;
  }

  // ========================================
  // 🔧 추가: 테스트 헬퍼 메서드들
  // ========================================

  /**
   * Mock 상품 추가
   */
  addMockProduct(product: ProductInfo): void {
    this.mockProducts.set(product.id, product);
    this.stats.totalProducts = this.mockProducts.size;
  }

  /**
   * 🔧 추가: setMockProduct (addMockProduct의 별칭)
   * 기존 테스트 코드와의 호환성을 위해 추가
   */
  setMockProduct(productId: string, product: ProductInfo): void {
    this.addMockProduct(product);
  }

  /**
   * Mock 상품 제거
   */
  removeMockProduct(productId: string): void {
    this.mockProducts.delete(productId);
    this.stats.totalProducts = this.mockProducts.size;
  }

  /**
   * 모든 Mock 데이터 리셋
   */
  resetMockData(): void {
    this.mockProducts.clear();
    this.stats = {
      totalProducts: 0,
      totalCalls: 0,
      getProductCalls: 0,
      checkInventoryCalls: 0,
      reserveInventoryCalls: 0,
    };
    this.delay = 0;
    this.errorMode = false;

    // 기본 테스트 데이터 다시 로드
    this.initializeDefaultProducts();
  }

  /**
   * 응답 지연 설정
   */
  setDelay(delayMs: number): void {
    this.delay = Math.max(0, delayMs);
  }

  /**
   * 에러 모드 설정
   */
  setErrorMode(enabled: boolean): void {
    this.errorMode = enabled;
  }

  /**
   * Mock 통계 조회
   */
  getMockStats(): MockStats {
    return { ...this.stats };
  }

  /**
   * 특정 상품의 재고 직접 설정 (테스트용)
   */
  setProductStock(productId: string, availableQuantity: number): boolean {
    const product = this.mockProducts.get(productId);
    if (!product) {
      return false;
    }

    const updatedProduct = {
      ...product,
      availableQuantity,
      inventory: {
        ...product.inventory,
        quantity: availableQuantity,
        status:
          availableQuantity === 0
            ? ("out_of_stock" as const)
            : availableQuantity <= 5
              ? ("low_stock" as const)
              : ("in_stock" as const),
      },
    };

    this.mockProducts.set(productId, updatedProduct);
    return true;
  }

  /**
   * 모든 Mock 상품 목록 조회
   */
  getAllMockProducts(): ProductInfo[] {
    return Array.from(this.mockProducts.values());
  }

  /**
   * Mock 상품 존재 여부 확인
   */
  hasMockProduct(productId: string): boolean {
    return this.mockProducts.has(productId);
  }

  // ========================================
  // Private 헬퍼 메서드들
  // ========================================

  /**
   * 기본 테스트 상품 데이터 초기화
   */
  private initializeDefaultProducts(): void {
    const defaultProducts: ProductInfo[] = [
      {
        id: "default-product-1",
        name: "기본 테스트 상품 1",
        description: "테스트용 기본 상품 1",
        price: 10000,
        currency: "KRW",
        availableQuantity: 100,
        category: "electronics",
        imageUrl: "https://example.com/product1.jpg",
        inventory: {
          quantity: 100,
          status: "in_stock",
        },
        isActive: true,
      },
      {
        id: "default-product-2",
        name: "기본 테스트 상품 2",
        description: "테스트용 기본 상품 2",
        price: 25000,
        currency: "KRW",
        availableQuantity: 50,
        category: "clothing",
        imageUrl: "https://example.com/product2.jpg",
        inventory: {
          quantity: 50,
          status: "in_stock",
        },
        isActive: true,
      },
    ];

    defaultProducts.forEach((product) => this.addMockProduct(product));
  }

  /**
   * 지연 시뮬레이션
   */
  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }
  }
}
