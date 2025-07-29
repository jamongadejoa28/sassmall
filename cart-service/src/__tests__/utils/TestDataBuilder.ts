// ========================================
// 테스트 데이터 빌더 (수정됨)
// cart-service/src/__tests__/utils/TestDataBuilder.ts
// ========================================

import { Cart } from "../../entities/Cart";
import { CartItem } from "../../entities/CartItem";
import { ProductInfo } from "../../usecases/types"; // 🔧 추가: 타입 명시
import { randomUUID } from "crypto";

export class TestDataBuilder {
  // ========================================
  // 상품 테스트 데이터 (수정됨)
  // ========================================

  static createProductData(overrides: Partial<ProductInfo> = {}): ProductInfo {
    return {
      id: "660e8400-e29b-41d4-a716-446655440001",
      name: "MacBook Pro 16인치 M3 Pro",
      description: "Apple M3 Pro 칩, 18GB 메모리, 512GB SSD 탑재", // 🔧 추가
      price: 3299000,
      currency: "KRW", // 🔧 추가
      availableQuantity: 10, // 🔧 추가
      category: "electronics", // 🔧 추가
      imageUrl: "https://example.com/macbook-pro-16.jpg", // 🔧 추가
      inventory: {
        quantity: 10,
        status: "in_stock" as const,
      },
      isActive: true,
      ...overrides,
    };
  }

  static createLowStockProduct(): ProductInfo {
    return this.createProductData({
      id: "660e8400-e29b-41d4-a716-446655440002",
      name: "LG 그램 17인치 2024",
      description: "초경량 노트북, Intel 13세대 프로세서", // 🔧 추가
      price: 1899000,
      availableQuantity: 2, // 🔧 수정: 낮은 재고
      category: "electronics", // 🔧 추가
      imageUrl: "https://example.com/lg-gram-17.jpg", // 🔧 추가
      inventory: {
        quantity: 2,
        status: "low_stock" as const,
      },
    });
  }

  static createOutOfStockProduct(): ProductInfo {
    return this.createProductData({
      id: "660e8400-e29b-41d4-a716-446655440003",
      name: "iPhone 15 Pro Max",
      description: "티타늄 디자인, A17 Pro 칩, ProRAW 지원", // 🔧 추가
      price: 1690000,
      availableQuantity: 0, // 🔧 수정: 재고 없음
      category: "smartphones", // 🔧 추가
      imageUrl: "https://example.com/iphone-15-pro-max.jpg", // 🔧 추가
      inventory: {
        quantity: 0,
        status: "out_of_stock" as const,
      },
    });
  }

  // 🔧 추가: 다양한 테스트 상품들
  static createTestProduct(overrides: Partial<ProductInfo> = {}): ProductInfo {
    return this.createProductData({
      id: `test-product-${Date.now()}`,
      name: "테스트 상품",
      description: "테스트용 기본 상품",
      price: 50000,
      availableQuantity: 100,
      category: "test",
      imageUrl: "https://example.com/test-product.jpg",
      ...overrides,
    });
  }

  static createExpensiveProduct(): ProductInfo {
    return this.createProductData({
      id: "expensive-product-001",
      name: "고급 상품",
      description: "프리미엄 고급 상품",
      price: 5000000,
      availableQuantity: 5,
      category: "luxury",
      imageUrl: "https://example.com/expensive-product.jpg",
    });
  }

  static createBulkProducts(count: number): ProductInfo[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `bulk-product-${index}`,
      name: `대량 테스트 상품 ${index + 1}`,
      description: `대량 생성된 테스트 상품 ${index + 1}`,
      price: 10000 + index * 1000,
      currency: "KRW",
      availableQuantity: 50 + index,
      category: `category-${index % 5}`,
      imageUrl: `https://example.com/bulk-product-${index}.jpg`,
      inventory: {
        quantity: 50 + index,
        status: "in_stock" as const,
      },
      isActive: true,
    }));
  }

  // ========================================
  // 장바구니 테스트 데이터
  // ========================================

  static createUserCart(userId: string, withItems: boolean = false): Cart {
    const cart = Cart.createForUser(userId);

    if (withItems) {
      cart.addItem("product-1", 2, 25000);
      cart.addItem("product-2", 1, 15000);
    }

    return cart;
  }

  static createSessionCart(
    sessionId: string,
    withItems: boolean = false
  ): Cart {
    const cart = Cart.createForSession(sessionId);

    if (withItems) {
      cart.addItem("product-3", 1, 35000);
    }

    return cart;
  }

  // ========================================
  // API 요청 데이터
  // ========================================

  static createAddToCartRequest(overrides: Partial<any> = {}) {
    return {
      userId: "user-123",
      productId: "660e8400-e29b-41d4-a716-446655440001",
      quantity: 1,
      ...overrides,
    };
  }

  static createUpdateCartRequest(overrides: Partial<any> = {}) {
    return {
      userId: "user-123",
      productId: "660e8400-e29b-41d4-a716-446655440001",
      quantity: 3,
      ...overrides,
    };
  }


  // ========================================
  // ID 생성 헬퍼 메서드들
  // ========================================

  /**
   * UUID 형식의 사용자 ID 생성
   */
  static generateUserId(): string {
    // UUID v4 형식으로 생성
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 세션 ID 생성
   */
  static generateSessionId(): string {
    // 세션 ID는 미들웨어에서 요구하는 sess_UUID 형식으로 생성
    const uuid = randomUUID();
    return `sess_${uuid}`;
  }

  /**
   * UUID 형식의 상품 ID 생성
   */
  static generateProductId(): string {
    return this.generateUserId(); // UUID 형식으로 통일
  }

  // ========================================
  // 🔧 추가: 다양한 시나리오별 데이터
  // ========================================

  /**
   * 재고 부족 시나리오용 상품
   */
  static createLimitedStockProduct(stock: number): ProductInfo {
    return this.createProductData({
      id: `limited-stock-${stock}`,
      name: `제한 재고 상품 (${stock}개)`,
      description: `재고가 ${stock}개만 있는 상품`,
      availableQuantity: stock,
      inventory: {
        quantity: stock,
        status:
          stock === 0
            ? ("out_of_stock" as const)
            : stock <= 5
              ? ("low_stock" as const)
              : ("in_stock" as const),
      },
    });
  }

  /**
   * 동시성 테스트용 상품 (충분한 재고)
   */
  static createConcurrentTestProduct(): ProductInfo {
    return this.createProductData({
      id: "concurrent-test-product",
      name: "동시성 테스트 상품",
      description: "동시 접근 테스트용 상품",
      availableQuantity: 1000,
      inventory: {
        quantity: 1000,
        status: "in_stock" as const,
      },
    });
  }

  /**
   * 성능 테스트용 대용량 상품 리스트
   */
  static createPerformanceTestProducts(count: number): ProductInfo[] {
    return Array.from({ length: count }, (_, i) =>
      this.createTestProduct({
        id: `perf-product-${i}`,
        name: `성능테스트 상품 ${i}`,
        description: `성능 테스트용 상품 ${i}`,
        price: 10000 + i * 100,
        availableQuantity: 100 + i,
      })
    );
  }

  /**
   * 다양한 카테고리의 상품들
   */
  static createCategoryProducts(): { [category: string]: ProductInfo[] } {
    return {
      electronics: [
        this.createTestProduct({
          id: "electronics-1",
          name: "노트북",
          category: "electronics",
          price: 1500000,
        }),
        this.createTestProduct({
          id: "electronics-2",
          name: "스마트폰",
          category: "electronics",
          price: 800000,
        }),
      ],
      clothing: [
        this.createTestProduct({
          id: "clothing-1",
          name: "티셔츠",
          category: "clothing",
          price: 30000,
        }),
        this.createTestProduct({
          id: "clothing-2",
          name: "청바지",
          category: "clothing",
          price: 80000,
        }),
      ],
      books: [
        this.createTestProduct({
          id: "books-1",
          name: "프로그래밍 책",
          category: "books",
          price: 25000,
        }),
      ],
    };
  }
}
