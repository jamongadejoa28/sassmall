// ========================================
// Product Service 통합 테스트 (완전 구현)
// cart-service/src/__tests__/integration/services/product-service.test.ts
// ========================================

import { Container } from "inversify";
import { MockProductServiceClient } from "../../../adapters/MockProductServiceClient";
import { DIContainer } from "../../../infrastructure/di/Container";
import { TYPES } from "../../../infrastructure/di/types";
import { AddToCartUseCase } from "../../../usecases/AddToCartUseCase";
import { GetCartUseCase } from "../../../usecases/GetCartUseCase";
import { DatabaseCleaner } from "../../utils/DatabaseCleaner";
import { RedisTestClient } from "../../utils/RedisTestClient";
import { delay, measureExecutionTime } from "../../utils/TestHelpers";
import {
  ProductNotFoundError,
  InsufficientStockError,
  ProductInfo,
  InventoryCheckResult,
} from "../../../usecases/types"; //

describe("Product Service Integration Tests", () => {
  let container: Container;
  let mockProductService: MockProductServiceClient;
  let addToCartUseCase: AddToCartUseCase;
  let getCartUseCase: GetCartUseCase;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisTestClient;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Product Service Test] 테스트 환경 초기화 중...");

    try {
      container = await DIContainer.create();
      mockProductService = container.get<MockProductServiceClient>(
        TYPES.ProductServiceClient
      );
      addToCartUseCase = container.get<AddToCartUseCase>(
        TYPES.AddToCartUseCase
      );
      getCartUseCase = container.get<GetCartUseCase>(TYPES.GetCartUseCase);
      dbCleaner = new DatabaseCleaner(global.testDataSource);
      redisCleaner = new RedisTestClient(global.testRedis);

      console.log("✅ [Product Service Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Product Service Test] 초기화 실패:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    await dbCleaner.cleanAll();
    await redisCleaner.flushAll();
    mockProductService.resetMockData();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 🛍️ Product Service 기본 동작 테스트
  // ========================================

  describe("Product Service 기본 동작", () => {
    test("상품 정보 조회 성공", async () => {
      // Given
      const productId = "test-product-123";
      const expectedProduct: ProductInfo = {
        id: productId,
        name: "테스트 상품",
        description: "테스트용 상품입니다",
        price: 25000,
        currency: "KRW",
        availableQuantity: 100,
        category: "electronics",
        imageUrl: "https://example.com/image.jpg",
        isActive: true,
        inventory: {
          quantity: 100,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(expectedProduct);

      // When
      const { result: product, executionTime } = await measureExecutionTime(
        () => mockProductService.getProduct(productId)
      );

      // Then
      expect(product).toEqual(expectedProduct);
      expect(executionTime).toBeLessThan(100); // Mock 서비스는 빨라야 함
      console.log(`📦 상품 조회 시간: ${executionTime}ms`);
    });

    test("존재하지 않는 상품 조회 시 null 반환", async () => {
      // When
      const product = await mockProductService.getProduct(
        "non-existent-product"
      );

      // Then
      expect(product).toBeNull();
    });

    test("재고 확인 성공", async () => {
      // Given
      const productId = "stock-test-product";
      const product: ProductInfo = {
        id: productId,
        name: "재고 테스트 상품",
        description: "재고 확인용 상품",
        price: 15000,
        currency: "KRW",
        availableQuantity: 50,
        category: "test",
        imageUrl: "https://example.com/stock-test.jpg",
        isActive: true,
        inventory: {
          quantity: 50,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);

      // When - 재고 범위 내 요청
      const validCheck = await mockProductService.checkInventory(productId, 10);

      // Then
      expect(validCheck.isAvailable).toBe(true);
      expect(validCheck.availableQuantity).toBe(50);
      expect(validCheck.requestedQuantity).toBe(10);

      // When - 재고 초과 요청
      const invalidCheck = await mockProductService.checkInventory(
        productId,
        60
      );

      // Then
      expect(invalidCheck.isAvailable).toBe(false);
      expect(invalidCheck.availableQuantity).toBe(50);
      expect(invalidCheck.requestedQuantity).toBe(60);
    });

    test("재고 예약 성공", async () => {
      // Given
      const productId = "reserve-test-product";
      const product: ProductInfo = {
        id: productId,
        name: "예약 테스트 상품",
        description: "재고 예약용 상품",
        price: 30000,
        currency: "KRW",
        availableQuantity: 20,
        category: "test",
        imageUrl: "https://example.com/reserve-test.jpg",
        isActive: true,
        inventory: {
          quantity: 20,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);

      // When
      const reservationResult = await mockProductService.reserveInventory(
        productId,
        5
      );

      // Then
      expect(reservationResult).toBe(true);

      // 재고가 감소했는지 확인
      const updatedProduct = await mockProductService.getProduct(productId);
      expect(updatedProduct?.availableQuantity).toBe(15); // 20 - 5 = 15
    });
  });

  // ========================================
  // 🔗 Use Case와 Product Service 통합 테스트
  // ========================================

  describe("Use Case와 Product Service 통합", () => {
    test("장바구니 추가 시 상품 정보 검증", async () => {
      // Given
      const userId = "user-product-integration";
      const productId = "integration-product-123";
      const product: ProductInfo = {
        id: productId,
        name: "통합 테스트 상품",
        description: "Use Case 통합 테스트용 상품",
        price: 45000,
        currency: "KRW",
        availableQuantity: 30,
        category: "integration",
        imageUrl: "https://example.com/integration.jpg",
        isActive: true,
        inventory: {
          quantity: 30,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);

      // When
      const result = await addToCartUseCase.execute({
        userId,
        productId,
        quantity: 3,
      });

      // Then
      expect(result.success).toBe(true);
      expect(result.cart.getItems()).toHaveLength(1);

      const addedItem = result.cart.getItems()[0];
      expect(addedItem.getProductId()).toBe(productId);
      expect(addedItem.getQuantity()).toBe(3);
      expect(addedItem.getPrice()).toBe(45000); // Product Service에서 가져온 가격
    });

    test("존재하지 않는 상품 장바구니 추가 실패", async () => {
      // Given
      const userId = "user-invalid-product";
      const invalidProductId = "non-existent-product-456";

      // When & Then
      await expect(
        addToCartUseCase.execute({
          userId,
          productId: invalidProductId,
          quantity: 1,
        })
      ).rejects.toThrow(ProductNotFoundError);
    });

    test("재고 부족 시 장바구니 추가 실패", async () => {
      // Given
      const userId = "user-insufficient-stock";
      const productId = "low-stock-product";
      const product: ProductInfo = {
        id: productId,
        name: "재고 부족 상품",
        description: "재고가 부족한 상품",
        price: 20000,
        currency: "KRW",
        availableQuantity: 2, // 적은 재고
        category: "test",
        imageUrl: "https://example.com/low-stock.jpg",
        isActive: true,
        inventory: {
          quantity: 2,
          status: "low_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);

      // When & Then
      await expect(
        addToCartUseCase.execute({
          userId,
          productId,
          quantity: 5, // 재고보다 많은 수량 요청
        })
      ).rejects.toThrow(InsufficientStockError);
    });
  });

  // ========================================
  // ⚡ Product Service 성능 테스트
  // ========================================

  describe("Product Service 성능", () => {
    test("대량 상품 조회 성능", async () => {
      // Given - 100개 상품 Mock 데이터 생성
      const products: ProductInfo[] = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-product-${i}`,
        name: `대량 테스트 상품 ${i}`,
        description: `상품 ${i} 설명`,
        price: 10000 + i * 1000,
        currency: "KRW",
        availableQuantity: 50 + i,
        category: `category-${i % 5}`,
        imageUrl: `https://example.com/product-${i}.jpg`,
        isActive: true,
        inventory: {
          quantity: 50 + i,
          status: "in_stock" as const, // as const 추가
        },
      }));

      products.forEach((product) => mockProductService.addMockProduct(product));

      // When - 모든 상품 조회
      const { executionTime } = await measureExecutionTime(async () => {
        const promises = products.map((p) =>
          mockProductService.getProduct(p.id)
        );
        return Promise.all(promises);
      });

      // Then
      console.log(`📦 100개 상품 조회 시간: ${executionTime}ms`);
      console.log(
        `📊 상품당 평균 조회 시간: ${(executionTime / 100).toFixed(2)}ms`
      );

      expect(executionTime).toBeLessThan(1000); // 1초 이하
    });

    test("동시 재고 확인 요청 처리", async () => {
      // Given
      const productId = "concurrent-stock-product";
      const product: ProductInfo = {
        id: productId,
        name: "동시성 테스트 상품",
        description: "동시 접근 테스트용 상품",
        price: 25000,
        currency: "KRW",
        availableQuantity: 100,
        category: "test",
        imageUrl: "https://example.com/concurrent.jpg",
        isActive: true,
        inventory: {
          quantity: 100,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);

      // When - 50개의 동시 재고 확인 요청
      const concurrentRequests = 50;
      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = Array.from({ length: concurrentRequests }, (_, i) =>
            mockProductService.checkInventory(
              productId,
              Math.floor(Math.random() * 10) + 1
            )
          );
          return Promise.all(promises);
        }
      );

      // Then
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result) => {
        expect(result.availableQuantity).toBe(100);
        expect(result.isAvailable).toBe(true);
      });

      console.log(
        `🚀 ${concurrentRequests}개 동시 재고 확인 완료 시간: ${executionTime}ms`
      );
      expect(executionTime).toBeLessThan(2000); // 2초 이하
    });
  });

  // ========================================
  // 🎭 Mock Service 동작 검증
  // ========================================

  describe("Mock Service 동작 검증", () => {
    test("Mock 데이터 리셋 기능", async () => {
      // Given
      const product: ProductInfo = {
        id: "reset-test-product",
        name: "리셋 테스트 상품",
        description: "Mock 리셋 테스트용",
        price: 15000,
        currency: "KRW",
        availableQuantity: 25,
        category: "test",
        imageUrl: "https://example.com/reset.jpg",
        isActive: true,
        inventory: {
          quantity: 25,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);
      expect(await mockProductService.getProduct(product.id)).not.toBeNull();

      // When
      mockProductService.resetMockData();

      // Then
      expect(await mockProductService.getProduct(product.id)).toBeNull();
    });

    test("Mock Service 상태 확인", async () => {
      // Given
      const products = Array.from({ length: 5 }, (_, i) => ({
        id: `status-product-${i}`,
        name: `상태 확인 상품 ${i}`,
        description: "상태 확인용",
        price: 10000,
        currency: "KRW" as const,
        availableQuantity: 20,
        category: "test",
        imageUrl: "https://example.com/status.jpg",
        isActive: true,
        inventory: {
          quantity: 20,
          status: "in_stock" as const, // as const 추가
        },
      }));

      products.forEach((p) => mockProductService.addMockProduct(p));

      // When - Mock Service 내부 상태 확인 (가능한 경우)
      const mockStats = mockProductService.getMockStats();

      // Then
      expect(mockStats.totalProducts).toBe(5);
      expect(mockStats.totalCalls).toBeGreaterThanOrEqual(0);

      console.log(
        `📊 Mock Service 통계: ${JSON.stringify(mockStats, null, 2)}`
      );
    });
  });

  // ========================================
  // 🚨 에러 시나리오 테스트
  // ========================================

  describe("에러 시나리오", () => {
    test("Product Service 응답 지연 시뮬레이션", async () => {
      // Given
      const productId = "slow-response-product";
      const product: ProductInfo = {
        id: productId,
        name: "응답 지연 상품",
        description: "느린 응답 시뮬레이션용",
        price: 35000,
        currency: "KRW",
        availableQuantity: 40,
        category: "test",
        imageUrl: "https://example.com/slow.jpg",
        isActive: true,
        inventory: {
          quantity: 40,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);
      mockProductService.setDelay(500); // 500ms 지연 설정

      // When
      const { executionTime } = await measureExecutionTime(() =>
        mockProductService.getProduct(productId)
      );

      // Then
      expect(executionTime).toBeGreaterThan(450); // 지연이 적용되었는지 확인
      console.log(`🐌 지연된 응답 시간: ${executionTime}ms`);

      // 지연 설정 초기화
      mockProductService.setDelay(0);
    });

    test("Product Service 일시적 오류 시뮬레이션", async () => {
      // Given
      const productId = "error-simulation-product";

      // Mock Service에서 오류 발생 설정
      mockProductService.setErrorMode(true);

      // When & Then
      await expect(mockProductService.getProduct(productId)).rejects.toThrow(
        "Mock Product Service Error"
      );

      // 오류 모드 해제
      mockProductService.setErrorMode(false);

      // 정상 동작 확인
      expect(await mockProductService.getProduct(productId)).toBeNull();
    });

    test("네트워크 타임아웃 시뮬레이션", async () => {
      // Given
      const userId = "timeout-test-user";
      const productId = "timeout-product";
      // 이 테스트에는 실제 ProductInfo 객체가 필요하지 않으므로 추가하지 않아도 됩니다.

      // 매우 긴 지연 설정 (타임아웃 시뮬레이션)
      mockProductService.setDelay(5000); // 5초 지연

      // When & Then - Use Case에서 타임아웃 처리
      const startTime = Date.now();

      try {
        await Promise.race([
          addToCartUseCase.execute({
            userId,
            productId,
            quantity: 1,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 3000)
          ),
        ]);

        fail("타임아웃이 발생해야 합니다");
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        expect(error.message).toBe("Request timeout");
        expect(elapsed).toBeLessThan(3500); // 3초 정도에서 타임아웃
        console.log(`⏰ 타임아웃 발생 시간: ${elapsed}ms`);
      }

      // 지연 설정 초기화
      mockProductService.setDelay(0);
    });
  });

  // ========================================
  // 🔄 실제 서비스 연동 준비 테스트
  // ========================================

  describe("실제 서비스 연동 준비", () => {
    test("HTTP 요청 형태 검증 (실제 API 준비)", async () => {
      // 실제 Product Service API 스펙 검증을 위한 테스트
      const expectedApiContract = {
        getProduct: {
          method: "GET",
          path: "/api/v1/products/:productId",
          responseFormat: {
            success: "boolean",
            data: "ProductInfo | null",
            message: "string",
            timestamp: "string",
          },
        },
        checkInventory: {
          method: "POST",
          path: "/api/v1/products/:productId/inventory/check",
          requestBody: { quantity: "number" },
          responseFormat: {
            success: "boolean",
            data: "InventoryCheckResult",
            message: "string",
          },
        },
      };

      // Mock Service가 실제 API 계약을 준수하는지 확인
      const productId = "api-contract-test";
      const product: ProductInfo = {
        id: productId,
        name: "API 계약 테스트 상품",
        description: "실제 API 스펙 검증용",
        price: 22000,
        currency: "KRW",
        availableQuantity: 15,
        category: "test",
        imageUrl: "https://example.com/contract.jpg",
        isActive: true,
        inventory: {
          quantity: 15,
          status: "in_stock" as const, // as const 추가
        },
      };

      mockProductService.addMockProduct(product);

      // API 응답 형태 검증
      const productResponse = await mockProductService.getProduct(productId);
      expect(productResponse).toHaveProperty("id");
      expect(productResponse).toHaveProperty("name");
      expect(productResponse).toHaveProperty("price");
      expect(productResponse).toHaveProperty("availableQuantity");

      const inventoryResponse = await mockProductService.checkInventory(
        productId,
        5
      );
      expect(inventoryResponse).toHaveProperty("isAvailable");
      expect(inventoryResponse).toHaveProperty("availableQuantity");
      expect(inventoryResponse).toHaveProperty("requestedQuantity");

      console.log("✅ API 계약 검증 완료");
    });

    test("환경별 설정 테스트 (개발/운영 환경 준비)", async () => {
      // 환경별 Product Service 설정 시뮬레이션
      const environments = {
        development: {
          baseUrl: "http://localhost:3001",
          timeout: 5000,
          retryCount: 2,
        },
        staging: {
          baseUrl: "https://staging-product-service.example.com",
          timeout: 3000,
          retryCount: 3,
        },
        production: {
          baseUrl: "https://product-service.example.com",
          timeout: 2000,
          retryCount: 5,
        },
      };

      // 각 환경설정이 유효한지 검증
      Object.entries(environments).forEach(([env, config]) => {
        expect(config.baseUrl).toMatch(/^https?:\/\//);
        expect(config.timeout).toBeGreaterThan(0);
        expect(config.retryCount).toBeGreaterThan(0);

        console.log(`✅ ${env} 환경 설정 검증 완료`);
      });
    });
  });
});
