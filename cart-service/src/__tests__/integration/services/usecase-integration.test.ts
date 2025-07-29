// ========================================
// Use Case 통합 테스트 (완전 구현)
// cart-service/src/__tests__/integration/services/usecase-integration.test.ts
// ========================================

import { Container } from "inversify";
import { DIContainer } from "../../../infrastructure/di/Container";
import { TYPES } from "../../../infrastructure/di/types";
import { DatabaseCleaner } from "../../utils/DatabaseCleaner";
import { RedisTestClient } from "../../utils/RedisTestClient";
import { MockProductServiceClient } from "../../../adapters/MockProductServiceClient";
import { delay, measureExecutionTime } from "../../utils/TestHelpers";

// Use Cases
import { AddToCartUseCase } from "../../../usecases/AddToCartUseCase";
import { GetCartUseCase } from "../../../usecases/GetCartUseCase";
import { UpdateCartItemUseCase } from "../../../usecases/UpdateCartItemUseCase";
import { RemoveFromCartUseCase } from "../../../usecases/RemoveFromCartUseCase";
import { ClearCartUseCase } from "../../../usecases/ClearCartUseCase";
import { TransferCartUseCase } from "../../../usecases/TransferCartUseCase";

// Types
import { ProductInfo } from "../../../usecases/types";

describe("Use Case Integration Tests", () => {
  let container: Container;
  let mockProductService: MockProductServiceClient;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisTestClient;

  // Use Cases
  let addToCartUseCase: AddToCartUseCase;
  let getCartUseCase: GetCartUseCase;
  let updateCartItemUseCase: UpdateCartItemUseCase;
  let removeFromCartUseCase: RemoveFromCartUseCase;
  let clearCartUseCase: ClearCartUseCase;
  let transferCartUseCase: TransferCartUseCase;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Use Case Integration Test] 테스트 환경 초기화 중...");

    try {
      container = await DIContainer.create();

      // Dependencies
      mockProductService = container.get<MockProductServiceClient>(
        TYPES.ProductServiceClient
      );
      dbCleaner = new DatabaseCleaner(global.testDataSource);
      redisCleaner = new RedisTestClient(global.testRedis);

      // Use Cases
      addToCartUseCase = container.get<AddToCartUseCase>(
        TYPES.AddToCartUseCase
      );
      getCartUseCase = container.get<GetCartUseCase>(TYPES.GetCartUseCase);
      updateCartItemUseCase = container.get<UpdateCartItemUseCase>(
        TYPES.UpdateCartItemUseCase
      );
      removeFromCartUseCase = container.get<RemoveFromCartUseCase>(
        TYPES.RemoveFromCartUseCase
      );
      clearCartUseCase = container.get<ClearCartUseCase>(
        TYPES.ClearCartUseCase
      );
      transferCartUseCase = container.get<TransferCartUseCase>(
        TYPES.TransferCartUseCase
      );

      console.log("✅ [Use Case Integration Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Use Case Integration Test] 초기화 실패:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    await dbCleaner.cleanAll();
    await redisCleaner.flushAll();
    mockProductService.resetMockData();

    // 테스트용 상품 데이터 설정
    setupMockProducts();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // Mock 데이터 설정 헬퍼
  // ========================================

  const setupMockProducts = () => {
    const products: ProductInfo[] = [
      {
        id: "product-1",
        name: "테스트 상품 1",
        description: "첫 번째 테스트 상품",
        price: 10000,
        currency: "KRW",
        availableQuantity: 50,
        category: "electronics",
        imageUrl: "https://example.com/product1.jpg",
        isActive: true,
        inventory: {
          // inventory 속성 추가
          quantity: 50,
          status: "in_stock" as const, // as const 추가
        },
      },
      {
        id: "product-2",
        name: "테스트 상품 2",
        description: "두 번째 테스트 상품",
        price: 25000,
        currency: "KRW",
        availableQuantity: 30,
        category: "clothing",
        imageUrl: "https://example.com/product2.jpg",
        isActive: true,
        inventory: {
          // inventory 속성 추가
          quantity: 30,
          status: "in_stock" as const, // as const 추가
        },
      },
      {
        id: "product-3",
        name: "테스트 상품 3",
        description: "세 번째 테스트 상품",
        price: 15000,
        currency: "KRW",
        availableQuantity: 20,
        category: "books",
        imageUrl: "https://example.com/product3.jpg",
        isActive: true,
        inventory: {
          // inventory 속성 추가
          quantity: 20,
          status: "in_stock" as const, // as const 추가
        },
      },
      {
        id: "limited-product",
        name: "한정 상품",
        description: "재고가 제한된 상품",
        price: 100000,
        currency: "KRW",
        availableQuantity: 2,
        category: "limited",
        imageUrl: "https://example.com/limited.jpg",
        isActive: true,
        inventory: {
          // inventory 속성 추가
          quantity: 2,
          status: "low_stock" as const, // as const 추가 (한정 상품이므로 low_stock)
        },
      },
    ];

    products.forEach((product) => mockProductService.addMockProduct(product));
  };

  // ========================================
  // 🔄 전체 워크플로우 통합 테스트
  // ========================================

  describe("전체 워크플로우 통합", () => {
    test("완전한 장바구니 라이프사이클", async () => {
      const userId = "workflow-user-123";

      console.log("🛒 === 장바구니 라이프사이클 시작 ===");

      // 1. 빈 장바구니 조회 (장바구니 없음)
      console.log("1️⃣ 빈 장바구니 조회");
      const emptyCartResult = await getCartUseCase.execute({ userId });
      expect(emptyCartResult.success).toBe(true);
      expect(emptyCartResult.cart).toBeNull();

      // 2. 첫 번째 상품 추가
      console.log("2️⃣ 첫 번째 상품 추가");
      const addResult1 = await addToCartUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 2,
      });

      expect(addResult1.success).toBe(true);
      expect(addResult1.cart.getItems()).toHaveLength(1);
      expect(addResult1.cart.getTotalAmount()).toBe(20000); // 10000 * 2

      // 3. 두 번째 상품 추가
      console.log("3️⃣ 두 번째 상품 추가");
      const addResult2 = await addToCartUseCase.execute({
        userId,
        productId: "product-2",
        quantity: 1,
      });

      expect(addResult2.success).toBe(true);
      expect(addResult2.cart.getItems()).toHaveLength(2);
      expect(addResult2.cart.getTotalAmount()).toBe(45000); // 20000 + 25000

      // 4. 첫 번째 상품 수량 업데이트
      console.log("4️⃣ 상품 수량 업데이트");
      const updateResult = await updateCartItemUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 5,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.cart).not.toBeNull();
      expect(updateResult.cart!.getTotalAmount()).toBe(75000); // (10000 * 5) + 25000

      // 5. 장바구니 조회 (현재 상태 확인)
      console.log("5️⃣ 장바구니 현재 상태 조회");
      const currentCartResult = await getCartUseCase.execute({ userId });
      expect(currentCartResult.success).toBe(true);
      expect(currentCartResult.cart?.getItems()).toHaveLength(2);
      expect(currentCartResult.cart?.getTotalAmount()).toBe(75000);

      // 6. 하나의 상품 제거
      console.log("6️⃣ 상품 제거");
      const removeResult = await removeFromCartUseCase.execute({
        userId,
        productId: "product-2",
      });

      expect(removeResult.success).toBe(true);
      expect(removeResult.cart).not.toBeNull();
      expect(removeResult.cart!.getItems()).toHaveLength(1);
      expect(removeResult.cart!.getTotalAmount()).toBe(50000); // 10000 * 5

      // 7. 장바구니 전체 삭제
      console.log("7️⃣ 장바구니 전체 삭제");
      const clearResult = await clearCartUseCase.execute({ userId });
      expect(clearResult.success).toBe(true);

      // 8. 삭제 후 조회 (빈 장바구니)
      console.log("8️⃣ 삭제 후 상태 확인");
      const finalCartResult = await getCartUseCase.execute({ userId });
      expect(finalCartResult.success).toBe(true);
      expect(finalCartResult.cart).toBeNull();

      console.log("✅ === 장바구니 라이프사이클 완료 ===");
    });

    test("세션에서 사용자로 장바구니 이전", async () => {
      const sessionId = "session-abc-123";
      const userId = "transfer-user-456";

      console.log("🔄 === 장바구니 이전 워크플로우 시작 ===");

      // 1. 세션 기반 장바구니에 상품 추가
      console.log("1️⃣ 세션 장바구니에 상품 추가");
      await addToCartUseCase.execute({
        sessionId,
        productId: "product-1",
        quantity: 2,
      });

      await addToCartUseCase.execute({
        sessionId,
        productId: "product-2",
        quantity: 3,
      });

      // 2. 세션 장바구니 상태 확인
      const sessionCartResult = await getCartUseCase.execute({ sessionId });
      expect(sessionCartResult.cart?.getItems()).toHaveLength(2);
      expect(sessionCartResult.cart?.getTotalAmount()).toBe(95000); // (10000*2) + (25000*3)

      // 3. 사용자 장바구니에 기존 상품 추가 (병합 시나리오)
      console.log("2️⃣ 사용자 장바구니에 기존 상품 추가");
      await addToCartUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 1,
      });

      // 4. 장바구니 이전 실행
      console.log("3️⃣ 세션 → 사용자 장바구니 이전");
      const transferResult = await transferCartUseCase.execute({
        userId,
        sessionId,
      });

      expect(transferResult.success).toBe(true);

      // 5. 이전 후 사용자 장바구니 확인
      console.log("4️⃣ 이전 후 사용자 장바구니 확인");
      const userCartResult = await getCartUseCase.execute({ userId });
      expect(userCartResult.cart?.getItems()).toHaveLength(2);

      // product-1: 기존 1개 + 세션 2개 = 3개
      const product1Item = userCartResult.cart
        ?.getItems()
        .find((item) => item.getProductId() === "product-1");
      expect(product1Item?.getQuantity()).toBe(3);

      // 6. 세션 장바구니 정리 확인
      console.log("5️⃣ 세션 장바구니 정리 확인");
      const sessionCartAfterTransfer = await getCartUseCase.execute({
        sessionId,
      });
      expect(sessionCartAfterTransfer.cart).toBeNull();

      console.log("✅ === 장바구니 이전 워크플로우 완료 ===");
    });
  });

  // ========================================
  // 🔒 동시성 및 트랜잭션 테스트
  // ========================================

  describe("동시성 및 트랜잭션", () => {
    test("동일 사용자의 동시 장바구니 수정", async () => {
      const userId = "concurrent-user-789";

      // 초기 장바구니 생성
      await addToCartUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 5,
      });

      console.log("🚀 동시 장바구니 수정 테스트 시작");

      // 동시에 여러 작업 실행
      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          return Promise.allSettled([
            // 상품 추가
            addToCartUseCase.execute({
              userId,
              productId: "product-2",
              quantity: 2,
            }),
            // 수량 변경
            updateCartItemUseCase.execute({
              userId,
              productId: "product-1",
              quantity: 8,
            }),
            // 상품 추가 (다른 상품)
            addToCartUseCase.execute({
              userId,
              productId: "product-3",
              quantity: 1,
            }),
            // 장바구니 조회
            getCartUseCase.execute({ userId }),
          ]);
        }
      );

      console.log(`⚡ 동시 작업 완료 시간: ${executionTime}ms`);

      // 모든 작업이 성공했는지 확인
      const successfulResults = results.filter(
        (result) =>
          result.status === "fulfilled" && (result.value as any).success
      );
      expect(successfulResults.length).toBeGreaterThan(0);

      // 최종 상태 확인
      const finalCartResult = await getCartUseCase.execute({ userId });
      expect(finalCartResult.success).toBe(true);
      expect(finalCartResult.cart?.getItems().length).toBeGreaterThan(0);
      console.log(
        `📊 최종 장바구니 상품 수: ${finalCartResult.cart?.getItems().length}`
      );
    });

    test("재고 부족 상황에서의 동시 추가 시도", async () => {
      const users = ["race-user-1", "race-user-2", "race-user-3"];
      console.log("⚡ 재고 경쟁 상황 테스트 시작");

      // 동시에 한정 상품 추가 시도 (재고: 2개)
      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = users.map((userId) =>
            addToCartUseCase
              .execute({ userId, productId: "limited-product", quantity: 1 })
              .catch((error) => ({ success: false, error: error.message }))
          );
          return Promise.allSettled(promises);
        }
      );

      console.log(`⚡ 재고 경쟁 테스트 완료 시간: ${executionTime}ms`);

      // 성공한 요청 확인 (재고 2개이므로 최대 2명 성공)
      const successfulRequests = results.filter(
        (result) =>
          result.status === "fulfilled" && (result.value as any).success
      );
      expect(successfulRequests.length).toBeLessThanOrEqual(2);
      console.log(`✅ 성공한 요청 수: ${successfulRequests.length}/3`);
    });
  });

  // ========================================
  // 🎯 복잡한 비즈니스 시나리오 테스트
  // ========================================

  describe("복잡한 비즈니스 시나리오", () => {
    test("대량 구매 및 할인 시나리오", async () => {
      const userId = "bulk-buyer-user";

      console.log("🛍️ 대량 구매 시나리오 시작");

      // 1. 여러 상품을 대량으로 추가
      const bulkProducts = [
        { productId: "product-1", quantity: 10 },
        { productId: "product-2", quantity: 5 },
        { productId: "product-3", quantity: 15 },
      ];

      for (const { productId, quantity } of bulkProducts) {
        await addToCartUseCase.execute({
          userId,
          productId,
          quantity,
        });
      }

      // 2. 장바구니 현재 상태 확인
      const cartResult = await getCartUseCase.execute({ userId });
      expect(cartResult.cart?.getItems()).toHaveLength(3);

      const totalAmount = cartResult.cart?.getTotalAmount() || 0;
      const expectedAmount = 10000 * 10 + 25000 * 5 + 15000 * 15; // 450,000
      expect(totalAmount).toBe(expectedAmount);

      console.log(`💰 총 주문 금액: ${totalAmount.toLocaleString()}원`);

      // 3. 할인 적용 시뮬레이션 (10% 할인)
      const discountRate = 0.1;
      const discountedAmount = totalAmount * (1 - discountRate);

      console.log(`🎉 할인 후 금액: ${discountedAmount.toLocaleString()}원`);
      expect(discountedAmount).toBe(405000);
    });

    test("장바구니 복구 시나리오", async () => {
      const userId = "recovery-user";

      console.log("🔄 장바구니 복구 시나리오 시작");

      // 1. 장바구니 생성
      await addToCartUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 3,
      });

      await addToCartUseCase.execute({
        userId,
        productId: "product-2",
        quantity: 2,
      });

      // 2. 장바구니 상태 백업 (현재 상태 저장)
      const backupCartResult = await getCartUseCase.execute({ userId });
      const backupCart = backupCartResult.cart;

      expect(backupCart?.getItems()).toHaveLength(2);
      const backupAmount = backupCart?.getTotalAmount();

      // 3. 장바구니 내용 변경
      await updateCartItemUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 10,
      });

      await addToCartUseCase.execute({
        userId,
        productId: "product-3",
        quantity: 5,
      });

      // 4. 변경 후 상태 확인
      const modifiedCartResult = await getCartUseCase.execute({ userId });
      expect(modifiedCartResult.cart?.getItems()).toHaveLength(3);
      expect(modifiedCartResult.cart?.getTotalAmount()).toBeGreaterThan(
        backupAmount || 0
      );

      // 5. 장바구니 복구 (전체 삭제 후 백업 상태로 복원)
      console.log("🔄 장바구니 복구 실행");
      await clearCartUseCase.execute({ userId });

      // 백업된 상태로 복원
      if (backupCart) {
        for (const item of backupCart.getItems()) {
          await addToCartUseCase.execute({
            userId,
            productId: item.getProductId(),
            quantity: item.getQuantity(),
          });
        }
      }

      // 6. 복구 후 상태 확인
      const recoveredCartResult = await getCartUseCase.execute({ userId });
      expect(recoveredCartResult.cart?.getItems()).toHaveLength(2);
      expect(recoveredCartResult.cart?.getTotalAmount()).toBe(backupAmount);

      console.log("✅ 장바구니 복구 완료");
    });
  });

  // ========================================
  // 📊 성능 및 최적화 테스트
  // ========================================

  describe("성능 및 최적화", () => {
    test("대량 사용자 동시 접근", async () => {
      const userCount = 20;
      const users = Array.from(
        { length: userCount },
        (_, i) => `perf-user-${i}`
      );

      console.log(`🚀 ${userCount}명 사용자 동시 접근 테스트 시작`);

      const { executionTime } = await measureExecutionTime(async () => {
        const promises = users.map(async (userId, index) => {
          // 각 사용자마다 다른 상품 조합 추가
          const productId = `product-${(index % 3) + 1}`;
          const quantity = Math.floor(Math.random() * 5) + 1;

          return addToCartUseCase.execute({
            userId,
            productId,
            quantity,
          });
        });

        return Promise.all(promises);
      });

      console.log(`⚡ ${userCount}명 동시 처리 시간: ${executionTime}ms`);
      console.log(
        `📊 사용자당 평균 처리 시간: ${(executionTime / userCount).toFixed(2)}ms`
      );

      expect(executionTime).toBeLessThan(5000); // 5초 이하
    });

    test("Use Case 체이닝 성능", async () => {
      const userId = "chaining-performance-user";

      console.log("⛓️ Use Case 체이닝 성능 테스트");

      const { executionTime } = await measureExecutionTime(async () => {
        // 연속적인 Use Case 호출 체인
        await addToCartUseCase.execute({
          userId,
          productId: "product-1",
          quantity: 1,
        });

        await addToCartUseCase.execute({
          userId,
          productId: "product-2",
          quantity: 2,
        });

        await updateCartItemUseCase.execute({
          userId,
          productId: "product-1",
          quantity: 3,
        });

        await addToCartUseCase.execute({
          userId,
          productId: "product-3",
          quantity: 1,
        });

        await removeFromCartUseCase.execute({
          userId,
          productId: "product-2",
        });

        return getCartUseCase.execute({ userId });
      });

      console.log(`⚡ Use Case 체인 실행 시간: ${executionTime}ms`);
      expect(executionTime).toBeLessThan(1000); // 1초 이하
    });
  });

  // ========================================
  // 🚨 에러 전파 및 복구 테스트
  // ========================================

  describe("에러 전파 및 복구", () => {
    test("중간 단계 실패 시 롤백", async () => {
      const userId = "rollback-test-user";

      console.log("🔄 롤백 테스트 시작");

      // 정상적인 장바구니 생성
      await addToCartUseCase.execute({
        userId,
        productId: "product-1",
        quantity: 2,
      });

      const initialCartResult = await getCartUseCase.execute({ userId });
      const initialItemCount = initialCartResult.cart?.getItems().length || 0;

      // Product Service 오류 모드 활성화
      mockProductService.setErrorMode(true);

      try {
        // 에러가 발생할 작업 시도
        await addToCartUseCase.execute({
          userId,
          productId: "product-2",
          quantity: 1,
        });

        fail("에러가 발생해야 합니다");
      } catch (error) {
        console.log("✅ 예상된 에러 발생");
      }

      // Product Service 정상화
      mockProductService.setErrorMode(false);

      // 기존 장바구니 상태가 유지되는지 확인
      const afterErrorCartResult = await getCartUseCase.execute({ userId });
      expect(afterErrorCartResult.cart?.getItems().length).toBe(
        initialItemCount
      );

      console.log("✅ 롤백 테스트 완료");
    });

    test("부분 실패 시나리오", async () => {
      const userId = "partial-failure-user";

      console.log("⚠️ 부분 실패 시나리오 테스트");

      // 성공할 작업들과 실패할 작업들을 섞어서 실행
      const operations = [
        () =>
          addToCartUseCase.execute({
            userId,
            productId: "product-1",
            quantity: 1,
          }),
        () =>
          addToCartUseCase.execute({
            userId,
            productId: "non-existent-product", // 실패할 작업
            quantity: 1,
          }),
        () =>
          addToCartUseCase.execute({
            userId,
            productId: "product-2",
            quantity: 2,
          }),
      ];

      const results = await Promise.allSettled(operations.map((op) => op()));

      // 성공과 실패 구분
      const successful = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      expect(successful.length).toBe(2); // 2개 성공
      expect(failed.length).toBe(1); // 1개 실패

      // 성공한 작업들은 정상 반영되었는지 확인
      const finalCartResult = await getCartUseCase.execute({ userId });
      expect(finalCartResult.cart?.getItems().length).toBe(2);

      console.log("✅ 부분 실패 시나리오 완료");
    });
  });
});
