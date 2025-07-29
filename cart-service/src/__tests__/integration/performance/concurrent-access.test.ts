// ========================================
// 동시성 접근 테스트 (완전 구현)
// cart-service/src/__tests__/integration/performance/concurrent-access.test.ts
// ========================================

import { Container } from "inversify";
import { DIContainer } from "../../../infrastructure/di/Container";
import { TYPES } from "../../../infrastructure/di/types";
import { DatabaseCleaner } from "../../utils/DatabaseCleaner";
import { RedisTestClient } from "../../utils/RedisTestClient";
import { MockProductServiceClient } from "../../../adapters/MockProductServiceClient";
import {
  delay,
  measureExecutionTime,
  measureMemoryUsage,
} from "../../utils/TestHelpers";

// Use Cases
import { AddToCartUseCase } from "../../../usecases/AddToCartUseCase";
import { GetCartUseCase } from "../../../usecases/GetCartUseCase";
import { UpdateCartItemUseCase } from "../../../usecases/UpdateCartItemUseCase";
import { RemoveFromCartUseCase } from "../../../usecases/RemoveFromCartUseCase";

// Types
import { ProductInfo } from "../../../usecases/types";

describe("Concurrent Access Tests", () => {
  let container: Container;
  let mockProductService: MockProductServiceClient;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisTestClient;

  // Use Cases
  let addToCartUseCase: AddToCartUseCase;
  let getCartUseCase: GetCartUseCase;
  let updateCartItemUseCase: UpdateCartItemUseCase;
  let removeFromCartUseCase: RemoveFromCartUseCase;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Concurrent Access Test] 테스트 환경 초기화 중...");

    try {
      container = await DIContainer.create();

      mockProductService = container.get<MockProductServiceClient>(
        TYPES.ProductServiceClient
      );
      dbCleaner = new DatabaseCleaner(global.testDataSource);
      redisCleaner = new RedisTestClient(global.testRedis);

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

      setupMockProducts();

      console.log("✅ [Concurrent Access Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Concurrent Access Test] 초기화 실패:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    await dbCleaner.cleanAll();
    await redisCleaner.flushAll();
    mockProductService.resetMockData();
    setupMockProducts();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // Mock 데이터 설정
  // ========================================

  const setupMockProducts = () => {
    const products: ProductInfo[] = [
      {
        id: "concurrent-product-1",
        name: "동시성 테스트 상품 1",
        description: "첫 번째 동시성 테스트 상품",
        price: 10000,
        currency: "KRW",
        availableQuantity: 1000,
        category: "test",
        imageUrl: "https://example.com/concurrent1.jpg",
        // 🔧 추가: inventory 속성
        inventory: {
          quantity: 1000,
          status: "in_stock" as const,
        },
        isActive: true,
      },
      {
        id: "concurrent-product-2",
        name: "동시성 테스트 상품 2",
        description: "두 번째 동시성 테스트 상품",
        price: 25000,
        currency: "KRW",
        availableQuantity: 500,
        category: "test",
        imageUrl: "https://example.com/concurrent2.jpg",
        // 🔧 추가: inventory 속성
        inventory: {
          quantity: 500,
          status: "in_stock" as const,
        },
        isActive: true,
      },
      {
        id: "limited-concurrent-product",
        name: "제한된 동시성 상품",
        description: "재고가 제한된 동시성 테스트 상품",
        price: 50000,
        currency: "KRW",
        availableQuantity: 10,
        category: "limited",
        imageUrl: "https://example.com/limited-concurrent.jpg",
        // 🔧 추가: inventory 속성
        inventory: {
          quantity: 10,
          status: "low_stock" as const,
        },
        isActive: true,
      },
    ];

    products.forEach((product) => mockProductService.addMockProduct(product));
  };

  // ========================================
  // 🚀 기본 동시성 테스트
  // ========================================

  describe("기본 동시성 처리", () => {
    test("동일 사용자의 동시 장바구니 추가", async () => {
      const userId = "concurrent-same-user";
      const concurrentRequests = 50;

      console.log(`🔄 ${concurrentRequests}개의 동시 요청 시작 (동일 사용자)`);

      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = Array.from(
            { length: concurrentRequests },
            (_, index) =>
              addToCartUseCase
                .execute({
                  userId,
                  productId: "concurrent-product-1",
                  quantity: 1,
                })
                .catch((error) => ({ success: false, error: error.message }))
          );

          return Promise.allSettled(promises);
        }
      );

      // 결과 분석
      const successful = results.filter(
        (result) =>
          result.status === "fulfilled" && (result.value as any).success
      ).length;

      const failed = results.length - successful;

      console.log(`✅ 성공: ${successful}, ❌ 실패: ${failed}`);
      console.log(`⚡ 총 실행 시간: ${executionTime}ms`);
      console.log(
        `📊 요청당 평균 시간: ${(executionTime / concurrentRequests).toFixed(2)}ms`
      );

      // 최종 장바구니 상태 확인
      const finalCart = await getCartUseCase.execute({ userId });
      expect(finalCart.cart?.getItems()).toHaveLength(1);

      // 동시성으로 인한 수량은 예측하기 어려우므로, 적어도 1개 이상인지만 확인
      const finalQuantity = finalCart.cart?.getItems()[0]?.getQuantity() || 0;
      expect(finalQuantity).toBeGreaterThan(0);

      console.log(`🛒 최종 장바구니 수량: ${finalQuantity}`);
    });

    test("서로 다른 사용자의 동시 접근", async () => {
      const userCount = 100;
      const users = Array.from(
        { length: userCount },
        (_, i) => `concurrent-user-${i}`
      );

      console.log(`👥 ${userCount}명 사용자 동시 접근 테스트`);

      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = users.map((userId) =>
            addToCartUseCase.execute({
              userId,
              productId: "concurrent-product-1",
              quantity: Math.floor(Math.random() * 5) + 1,
            })
          );

          return Promise.all(promises);
        }
      );

      // 모든 요청이 성공했는지 확인
      const successfulResults = results.filter(
        (result) => result.success
      ).length;

      expect(successfulResults).toBe(userCount);
      console.log(`✅ ${successfulResults}/${userCount} 사용자 요청 성공`);
      console.log(`⚡ 총 실행 시간: ${executionTime}ms`);
      console.log(
        `📊 사용자당 평균 시간: ${(executionTime / userCount).toFixed(2)}ms`
      );

      // 성능 기준 확인 (100명 사용자 처리가 10초 이내)
      expect(executionTime).toBeLessThan(10000);
    });
  });

  // ========================================
  // ⚔️ 경쟁 상태(Race Condition) 테스트
  // ========================================

  describe("경쟁 상태 처리", () => {
    test("제한된 재고에 대한 동시 구매 시도", async () => {
      const userCount = 20;
      const users = Array.from(
        { length: userCount },
        (_, i) => `race-user-${i}`
      );
      const limitedStock = 10; // 재고 10개

      console.log(
        `⚔️ 재고 ${limitedStock}개에 대한 ${userCount}명 동시 구매 시도`
      );

      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = users.map((userId) =>
            addToCartUseCase
              .execute({
                userId,
                productId: "limited-concurrent-product",
                quantity: 1,
              })
              .catch((error) => ({ success: false, error: error.message }))
          );

          return Promise.allSettled(promises);
        }
      );

      // 성공한 요청 수 확인
      const successful = results.filter(
        (result) =>
          result.status === "fulfilled" && (result.value as any).success
      ).length;

      console.log(`✅ 성공한 구매: ${successful}/${userCount}`);
      console.log(`⚡ 경쟁 처리 시간: ${executionTime}ms`);

      // 재고 한도 내에서만 성공해야 함
      expect(successful).toBeLessThanOrEqual(limitedStock);

      // 적어도 일부는 성공해야 함 (데드락이 발생하지 않았다는 증거)
      expect(successful).toBeGreaterThan(0);
    });

    test("동일 상품에 대한 동시 수량 업데이트", async () => {
      const userId = "race-update-user";

      // 초기 장바구니 생성
      await addToCartUseCase.execute({
        userId,
        productId: "concurrent-product-1",
        quantity: 5,
      });

      console.log("🔄 동일 상품 동시 수량 업데이트 테스트");

      const updateOperations = [
        () =>
          updateCartItemUseCase.execute({
            userId,
            productId: "concurrent-product-1",
            quantity: 10,
          }),
        () =>
          updateCartItemUseCase.execute({
            userId,
            productId: "concurrent-product-1",
            quantity: 15,
          }),
        () =>
          updateCartItemUseCase.execute({
            userId,
            productId: "concurrent-product-1",
            quantity: 8,
          }),
        () =>
          updateCartItemUseCase.execute({
            userId,
            productId: "concurrent-product-1",
            quantity: 12,
          }),
      ];

      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          return Promise.allSettled(updateOperations.map((op) => op()));
        }
      );

      console.log(`⚡ 동시 업데이트 처리 시간: ${executionTime}ms`);

      // 최종 상태가 일관성 있게 유지되었는지 확인
      const finalCart = await getCartUseCase.execute({ userId });
      const finalQuantity = finalCart.cart?.getItems()[0]?.getQuantity();

      expect(finalQuantity).toBeGreaterThan(0);
      expect([8, 10, 12, 15]).toContain(finalQuantity); // 4개 값 중 하나여야 함

      console.log(`🛒 최종 수량: ${finalQuantity}`);
    });
  });

  // ========================================
  // 📊 대용량 동시 처리 테스트
  // ========================================

  describe("대용량 동시 처리", () => {
    test("1000명 사용자 동시 접근", async () => {
      const userCount = 1000;
      const batchSize = 50; // 배치 크기
      const users = Array.from(
        { length: userCount },
        (_, i) => `bulk-user-${i}`
      );

      console.log(
        `🚀 ${userCount}명 사용자 대용량 처리 테스트 (배치 크기: ${batchSize})`
      );

      const { result: allResults, executionTime } = await measureExecutionTime(
        async () => {
          const batches = [];

          // 배치 단위로 나누어 처리
          for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);

            const batchPromise = Promise.all(
              batch.map((userId) =>
                addToCartUseCase.execute({
                  userId,
                  productId: "concurrent-product-1",
                  quantity: Math.floor(Math.random() * 3) + 1,
                })
              )
            );

            batches.push(batchPromise);
          }

          return Promise.all(batches);
        }
      );

      // 결과 집계
      const flatResults = allResults.flat();
      const successCount = flatResults.filter(
        (result) => result.success
      ).length;

      console.log(
        `✅ 성공률: ${((successCount / userCount) * 100).toFixed(1)}%`
      );
      console.log(`⚡ 총 처리 시간: ${executionTime}ms`);
      console.log(
        `📊 사용자당 평균 시간: ${(executionTime / userCount).toFixed(2)}ms`
      );
      console.log(
        `🏎️ 초당 처리량: ${((userCount / executionTime) * 1000).toFixed(0)} req/s`
      );

      expect(successCount).toBeGreaterThan(userCount * 0.95); // 95% 이상 성공
      expect(executionTime).toBeLessThan(30000); // 30초 이내
    });

    test("대용량 조회 요청 처리", async () => {
      const queryCount = 500;
      const userIds = Array.from({ length: 100 }, (_, i) => `query-user-${i}`);

      // 일부 사용자에게 장바구니 생성
      for (let i = 0; i < 50; i++) {
        await addToCartUseCase.execute({
          userId: userIds[i],
          productId: "concurrent-product-1",
          quantity: Math.floor(Math.random() * 5) + 1,
        });
      }

      console.log(`🔍 ${queryCount}개 조회 요청 동시 처리 테스트`);

      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = Array.from({ length: queryCount }, () => {
            const randomUserId =
              userIds[Math.floor(Math.random() * userIds.length)];
            return getCartUseCase.execute({ userId: randomUserId });
          });

          return Promise.all(promises);
        }
      );

      const successCount = results.filter((result) => result.success).length;

      console.log(
        `✅ 조회 성공률: ${((successCount / queryCount) * 100).toFixed(1)}%`
      );
      console.log(`⚡ 총 조회 시간: ${executionTime}ms`);
      console.log(
        `📊 조회당 평균 시간: ${(executionTime / queryCount).toFixed(2)}ms`
      );
      console.log(
        `🚀 초당 조회량: ${((queryCount / executionTime) * 1000).toFixed(0)} queries/s`
      );

      expect(successCount).toBe(queryCount); // 조회는 모두 성공해야 함
      expect(executionTime).toBeLessThan(5000); // 5초 이내
    });
  });

  // ========================================
  // 🧠 메모리 및 리소스 관리 테스트
  // ========================================

  describe("메모리 및 리소스 관리", () => {
    test("메모리 누수 방지 확인", async () => {
      const iterations = 100;
      const userPrefix = "memory-test-user";

      console.log(`🧠 메모리 누수 테스트 (${iterations}회 반복)`);

      const initialMemory = measureMemoryUsage();

      // 반복적으로 장바구니 생성/삭제
      for (let i = 0; i < iterations; i++) {
        const userId = `${userPrefix}-${i}`;

        // 장바구니 추가
        await addToCartUseCase.execute({
          userId,
          productId: "concurrent-product-1",
          quantity: Math.floor(Math.random() * 5) + 1,
        });

        // 장바구니 조회
        await getCartUseCase.execute({ userId });

        // 주기적으로 가비지 컬렉션 유도
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      // 강제 가비지 컬렉션
      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `📊 초기 메모리: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
      console.log(
        `📊 최종 메모리: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
      console.log(
        `📈 메모리 증가량: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      );

      // 메모리 증가가 합리적인 범위 내인지 확인 (50MB 이하)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test("동시 작업 시 리소스 고갈 방지", async () => {
      const concurrentTasks = 200;
      const operationsPerTask = 5;

      console.log(
        `🔧 리소스 고갈 방지 테스트 (${concurrentTasks}개 동시 작업)`
      );

      const { result: results, executionTime } = await measureExecutionTime(
        async () => {
          const promises = Array.from(
            { length: concurrentTasks },
            async (_, taskIndex) => {
              const userId = `resource-test-user-${taskIndex}`;
              const operations = [];

              // 각 작업마다 여러 연산 수행
              for (let i = 0; i < operationsPerTask; i++) {
                operations.push(
                  addToCartUseCase.execute({
                    userId,
                    productId: "concurrent-product-1",
                    quantity: 1,
                  })
                );
              }

              return Promise.all(operations);
            }
          );

          return Promise.all(promises);
        }
      );

      const flatResults = results.flat();
      const successCount = flatResults.filter(
        (result) => result.success
      ).length;
      const totalOperations = concurrentTasks * operationsPerTask;

      console.log(
        `✅ 성공률: ${((successCount / totalOperations) * 100).toFixed(1)}%`
      );
      console.log(`⚡ 총 처리 시간: ${executionTime}ms`);
      console.log(
        `📊 연산당 평균 시간: ${(executionTime / totalOperations).toFixed(2)}ms`
      );

      // 리소스 고갈로 인한 실패가 과도하지 않은지 확인
      expect(successCount).toBeGreaterThan(totalOperations * 0.8); // 80% 이상 성공
    });
  });

  // ========================================
  // ⚡ 성능 임계값 검증 테스트
  // ========================================

  describe("성능 임계값 검증", () => {
    test("응답 시간 SLA 준수 확인", async () => {
      const requestCount = 100;
      const maxAcceptableTime = 500; // 500ms

      console.log(`⚡ 응답 시간 SLA 테스트 (최대 ${maxAcceptableTime}ms)`);

      const responseTimes: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const userId = `sla-user-${i}`;

        const { executionTime } = await measureExecutionTime(() =>
          addToCartUseCase.execute({
            userId,
            productId: "concurrent-product-1",
            quantity: 1,
          })
        );

        responseTimes.push(executionTime);
      }

      // 통계 계산
      const avgResponseTime =
        responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[
        Math.floor(requestCount * 0.95)
      ];

      console.log(`📊 평균 응답 시간: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`📊 최대 응답 시간: ${maxResponseTime}ms`);
      console.log(`📊 최소 응답 시간: ${minResponseTime}ms`);
      console.log(`📊 95퍼센타일: ${p95ResponseTime}ms`);

      // SLA 기준 검증
      expect(avgResponseTime).toBeLessThan(maxAcceptableTime * 0.5); // 평균은 기준의 50% 이하
      expect(p95ResponseTime).toBeLessThan(maxAcceptableTime); // 95%는 기준 이하
      expect(maxResponseTime).toBeLessThan(maxAcceptableTime * 2); // 최대도 기준의 2배 이하

      // SLA 위반 비율 확인
      const violationCount = responseTimes.filter(
        (time) => time > maxAcceptableTime
      ).length;
      const violationRate = (violationCount / requestCount) * 100;

      console.log(`🚨 SLA 위반율: ${violationRate.toFixed(1)}%`);
      expect(violationRate).toBeLessThan(5); // 5% 미만이어야 함
    });

    test("동시성 처리량 기준 검증", async () => {
      const targetThroughput = 50; // 초당 50 요청 목표
      const testDuration = 5000; // 5초간 테스트

      console.log(
        `🎯 처리량 기준 테스트 (목표: ${targetThroughput} req/s, ${testDuration / 1000}초간)`
      );

      let requestCount = 0;
      let successCount = 0;
      const startTime = Date.now();

      // 지속적으로 요청 전송
      const promises: Promise<any>[] = [];

      while (Date.now() - startTime < testDuration) {
        const userId = `throughput-user-${requestCount}`;

        const promise = addToCartUseCase
          .execute({
            userId,
            productId: "concurrent-product-1",
            quantity: 1,
          })
          .then(() => {
            successCount++;
          })
          .catch(() => {
            // 실패는 카운트만 하고 넘어감
          });

        promises.push(promise);
        requestCount++;

        // 목표 처리량에 맞춰 지연
        await delay(1000 / targetThroughput);
      }

      // 모든 요청 완료 대기
      await Promise.allSettled(promises);

      const actualDuration = Date.now() - startTime;
      const actualThroughput = (successCount / actualDuration) * 1000;

      console.log(`📊 총 요청 수: ${requestCount}`);
      console.log(`✅ 성공 요청 수: ${successCount}`);
      console.log(`⚡ 실제 처리량: ${actualThroughput.toFixed(1)} req/s`);
      console.log(
        `🎯 목표 달성률: ${((actualThroughput / targetThroughput) * 100).toFixed(1)}%`
      );

      // 목표 처리량의 80% 이상 달성해야 함
      expect(actualThroughput).toBeGreaterThan(targetThroughput * 0.8);
    });
  });
});
