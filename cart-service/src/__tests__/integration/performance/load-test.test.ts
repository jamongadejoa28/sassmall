// ========================================
// 부하 테스트 (완전 구현)
// cart-service/src/__tests__/integration/performance/load-test.test.ts
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
import { ClearCartUseCase } from "../../../usecases/ClearCartUseCase";

// Types
import { ProductInfo } from "../../../usecases/types";

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    increase: number;
  };
}

describe("Load Tests", () => {
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

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Load Test] 테스트 환경 초기화 중...");

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
      clearCartUseCase = container.get<ClearCartUseCase>(
        TYPES.ClearCartUseCase
      );

      setupLoadTestProducts();

      console.log("✅ [Load Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Load Test] 초기화 실패:", error);
      throw error;
    }
  }, 60000); // 1분 타임아웃

  beforeEach(async () => {
    await dbCleaner.cleanAll();
    await redisCleaner.flushAll();
    mockProductService.resetMockData();
    setupLoadTestProducts();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 부하 테스트용 상품 데이터 설정
  // ========================================

  const setupLoadTestProducts = () => {
    const products: ProductInfo[] = Array.from({ length: 50 }, (_, i) => ({
      id: `load-test-product-${i}`,
      name: `부하 테스트 상품 ${i}`,
      description: `부하 테스트용 상품 ${i} 설명`,
      price: 10000 + i * 1000,
      currency: "KRW",
      availableQuantity: 1000 + i * 10,
      category: `category-${i % 5}`,
      imageUrl: `https://example.com/load-product-${i}.jpg`,
      isActive: true,
      // 누락된 inventory 속성 추가
      inventory: {
        quantity: 1000 + i * 10, // availableQuantity를 inventory quantity로 사용
        status: "in_stock", // 모든 부하 테스트 상품은 재고가 있다고 가정
      },
    }));

    products.forEach((product) => mockProductService.addMockProduct(product));
  };

  // ========================================
  // 부하 테스트 유틸리티 함수
  // ========================================

  const runLoadTest = async (
    testName: string,
    testFunction: () => Promise<any>,
    config: {
      duration: number; // milliseconds
      maxConcurrency?: number;
      targetRPS?: number; // requests per second
    }
  ): Promise<LoadTestResult> => {
    console.log(`🚀 === ${testName} 부하 테스트 시작 ===`);
    console.log(`⏱️ 지속 시간: ${config.duration / 1000}초`);
    console.log(`🎯 목표 RPS: ${config.targetRPS || "unlimited"}`);
    console.log(`🔢 최대 동시성: ${config.maxConcurrency || "unlimited"}`);

    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const responseTimes: number[] = [];
    const errors: string[] = [];

    let requestCount = 0;
    let successCount = 0;
    let activeRequests = 0;

    const initialMemory = measureMemoryUsage();
    let peakMemory = initialMemory;

    const promises: Promise<any>[] = [];

    // 부하 테스트 실행
    while (Date.now() < endTime) {
      // 동시성 제한 확인
      if (config.maxConcurrency && activeRequests >= config.maxConcurrency) {
        await delay(1);
        continue;
      }

      // RPS 제한 확인
      if (config.targetRPS) {
        const expectedRequestCount =
          ((Date.now() - startTime) / 1000) * config.targetRPS;
        if (requestCount >= expectedRequestCount) {
          await delay(1);
          continue;
        }
      }

      activeRequests++;
      requestCount++;

      const requestStartTime = Date.now();

      const promise = testFunction()
        .then(() => {
          const responseTime = Date.now() - requestStartTime;
          responseTimes.push(responseTime);
          successCount++;
        })
        .catch((error) => {
          const responseTime = Date.now() - requestStartTime;
          responseTimes.push(responseTime);
          errors.push(error.message || error.toString());
        })
        .finally(() => {
          activeRequests--;
        });

      promises.push(promise);

      // 메모리 모니터링
      const currentMemory = measureMemoryUsage();
      if (currentMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = currentMemory;
      }

      // 작은 지연 (CPU 과부하 방지)
      await delay(1);
    }

    // 모든 요청 완료 대기
    console.log("⏳ 진행 중인 요청 완료 대기...");
    await Promise.allSettled(promises);

    const finalMemory = measureMemoryUsage();
    const totalDuration = Date.now() - startTime;

    // 통계 계산
    responseTimes.sort((a, b) => a - b);
    const averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const p95ResponseTime =
      responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99ResponseTime =
      responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    const throughput = (successCount / totalDuration) * 1000;
    const errorRate = ((requestCount - successCount) / requestCount) * 100;

    const result: LoadTestResult = {
      totalRequests: requestCount,
      successfulRequests: successCount,
      failedRequests: requestCount - successCount,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      memoryUsage: {
        initial: initialMemory.heapUsed,
        peak: peakMemory.heapUsed,
        final: finalMemory.heapUsed,
        increase: finalMemory.heapUsed - initialMemory.heapUsed,
      },
    };

    // 결과 출력
    console.log(`📊 === ${testName} 부하 테스트 결과 ===`);
    console.log(`📈 총 요청 수: ${result.totalRequests.toLocaleString()}`);
    console.log(`✅ 성공 요청: ${result.successfulRequests.toLocaleString()}`);
    console.log(`❌ 실패 요청: ${result.failedRequests.toLocaleString()}`);
    console.log(`📊 성공률: ${(100 - result.errorRate).toFixed(2)}%`);
    console.log(`⚡ 처리량: ${result.throughput.toFixed(1)} req/s`);
    console.log(`⏱️ 평균 응답시간: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`📊 95퍼센타일: ${result.p95ResponseTime}ms`);
    console.log(`📊 99퍼센타일: ${result.p99ResponseTime}ms`);
    console.log(
      `🧠 메모리 증가: ${(result.memoryUsage.increase / 1024 / 1024).toFixed(2)}MB`
    );

    // 에러 분석
    if (errors.length > 0) {
      const errorCounts = errors.reduce(
        (acc, error) => {
          acc[error] = (acc[error] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(`🚨 에러 분석:`);
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`   ${error}: ${count}회`);
      });
    }

    return result;
  };

  // ========================================
  // 🎯 기본 부하 테스트
  // ========================================

  describe("기본 부하 테스트", () => {
    test("장바구니 추가 부하 테스트", async () => {
      let userCounter = 0;

      const result = await runLoadTest(
        "장바구니 추가",
        async () => {
          const userId = `load-user-${userCounter++}`;
          const productId = `load-test-product-${Math.floor(Math.random() * 50)}`;
          const quantity = Math.floor(Math.random() * 5) + 1;

          return addToCartUseCase.execute({
            userId,
            productId,
            quantity,
          });
        },
        {
          duration: 10000, // 10초
          targetRPS: 50,
        }
      );

      // 성능 기준 검증
      expect(result.errorRate).toBeLessThan(5); // 5% 미만 에러율
      expect(result.averageResponseTime).toBeLessThan(500); // 평균 500ms 이하
      expect(result.p95ResponseTime).toBeLessThan(1000); // 95% 1초 이하
      expect(result.throughput).toBeGreaterThan(30); // 초당 30건 이상 처리
    }, 30000);

    test("장바구니 조회 부하 테스트", async () => {
      // 테스트용 장바구니 미리 생성
      const preloadUsers = 100;
      for (let i = 0; i < preloadUsers; i++) {
        await addToCartUseCase.execute({
          userId: `preload-user-${i}`,
          productId: `load-test-product-${i % 10}`,
          quantity: Math.floor(Math.random() * 3) + 1,
        });
      }

      const result = await runLoadTest(
        "장바구니 조회",
        async () => {
          const userId = `preload-user-${Math.floor(Math.random() * preloadUsers)}`;
          return getCartUseCase.execute({ userId });
        },
        {
          duration: 15000, // 15초
          targetRPS: 100,
        }
      );

      // 조회는 더 엄격한 기준 적용
      expect(result.errorRate).toBeLessThan(1); // 1% 미만 에러율
      expect(result.averageResponseTime).toBeLessThan(200); // 평균 200ms 이하
      expect(result.p95ResponseTime).toBeLessThan(500); // 95% 500ms 이하
      expect(result.throughput).toBeGreaterThan(80); // 초당 80건 이상 처리
    }, 30000);
  });

  // ========================================
  // 🔥 고강도 부하 테스트
  // ========================================

  describe("고강도 부하 테스트", () => {
    test("최대 처리량 테스트", async () => {
      let userCounter = 0;

      const result = await runLoadTest(
        "최대 처리량",
        async () => {
          const operations = [
            // 70% 장바구니 추가
            () => {
              const userId = `max-load-user-${userCounter++}`;
              const productId = `load-test-product-${Math.floor(Math.random() * 20)}`;
              return addToCartUseCase.execute({
                userId,
                productId,
                quantity: Math.floor(Math.random() * 3) + 1,
              });
            },
            // 20% 장바구니 조회
            () => {
              const userId = `max-load-user-${Math.floor(Math.random() * userCounter)}`;
              return getCartUseCase.execute({ userId });
            },
            // 10% 수량 업데이트
            () => {
              const userId = `max-load-user-${Math.floor(Math.random() * userCounter)}`;
              const productId = `load-test-product-${Math.floor(Math.random() * 20)}`;
              return updateCartItemUseCase.execute({
                userId,
                productId,
                quantity: Math.floor(Math.random() * 5) + 1,
              });
            },
          ];

          const random = Math.random();
          if (random < 0.7) return operations[0]();
          if (random < 0.9) return operations[1]();
          return operations[2]();
        },
        {
          duration: 20000, // 20초
          maxConcurrency: 200,
        }
      );

      console.log(`🏆 최대 달성 처리량: ${result.throughput.toFixed(1)} req/s`);

      // 고강도 테스트 기준
      expect(result.errorRate).toBeLessThan(10); // 10% 미만 에러율
      expect(result.throughput).toBeGreaterThan(50); // 초당 50건 이상
      expect(result.memoryUsage.increase).toBeLessThan(100 * 1024 * 1024); // 메모리 증가 100MB 이하
    }, 45000);

    test("지속 부하 테스트 (메모리 누수 확인)", async () => {
      let userCounter = 0;

      const result = await runLoadTest(
        "지속 부하 (메모리 누수 확인)",
        async () => {
          const userId = `sustained-user-${userCounter++}`;
          const productId = `load-test-product-${Math.floor(Math.random() * 10)}`;

          return addToCartUseCase.execute({
            userId,
            productId,
            quantity: 1,
          });
        },
        {
          duration: 30000, // 30초
          targetRPS: 30,
        }
      );

      // 지속 부하 기준
      expect(result.errorRate).toBeLessThan(5);
      expect(result.memoryUsage.increase).toBeLessThan(150 * 1024 * 1024); // 메모리 증가 150MB 이하

      // 메모리 누수 검사 (증가량이 처리한 요청 수에 비해 합리적인지)
      const memoryPerRequest =
        result.memoryUsage.increase / result.totalRequests;
      console.log(
        `🧠 요청당 메모리 사용량: ${(memoryPerRequest / 1024).toFixed(2)}KB`
      );
      expect(memoryPerRequest).toBeLessThan(50 * 1024); // 요청당 50KB 이하
    }, 60000);
  });

  // ========================================
  // 🌊 트래픽 패턴 시뮬레이션
  // ========================================

  describe("트래픽 패턴 시뮬레이션", () => {
    test("점진적 부하 증가 테스트", async () => {
      console.log("📈 점진적 부하 증가 테스트 시작");

      const phases = [
        { name: "웜업", duration: 5000, targetRPS: 10 },
        { name: "증가", duration: 5000, targetRPS: 30 },
        { name: "피크", duration: 5000, targetRPS: 50 },
        { name: "감소", duration: 5000, targetRPS: 20 },
      ];

      let userCounter = 0;
      const phaseResults: LoadTestResult[] = [];

      for (const phase of phases) {
        console.log(`🔄 ${phase.name} 단계 (${phase.targetRPS} RPS)`);

        const result = await runLoadTest(
          phase.name,
          async () => {
            const userId = `ramp-user-${userCounter++}`;
            const productId = `load-test-product-${Math.floor(Math.random() * 20)}`;

            return addToCartUseCase.execute({
              userId,
              productId,
              quantity: Math.floor(Math.random() * 3) + 1,
            });
          },
          {
            duration: phase.duration,
            targetRPS: phase.targetRPS,
          }
        );

        phaseResults.push(result);
      }

      // 각 단계별 성능 검증
      phaseResults.forEach((result, index) => {
        const phase = phases[index];
        console.log(
          `✅ ${phase.name} 단계 검증: ${result.throughput.toFixed(1)} RPS`
        );

        // 목표 RPS의 80% 이상 달성
        expect(result.throughput).toBeGreaterThan(phase.targetRPS * 0.8);

        // 에러율은 단계별로 차등 적용
        const maxErrorRate = phase.name === "피크" ? 10 : 5;
        expect(result.errorRate).toBeLessThan(maxErrorRate);
      });
    }, 45000);

    test("스파이크 트래픽 테스트", async () => {
      console.log("⚡ 스파이크 트래픽 테스트 시작");

      let userCounter = 0;

      // 정상 트래픽
      console.log("📊 정상 트래픽 (베이스라인)");
      const baselineResult = await runLoadTest(
        "베이스라인",
        async () => {
          const userId = `baseline-user-${userCounter++}`;
          const productId = `load-test-product-${Math.floor(Math.random() * 10)}`;

          return addToCartUseCase.execute({
            userId,
            productId,
            quantity: 1,
          });
        },
        {
          duration: 5000,
          targetRPS: 20,
        }
      );

      // 스파이크 트래픽 (갑작스런 증가)
      console.log("⚡ 스파이크 트래픽 (10배 증가)");
      const spikeResult = await runLoadTest(
        "스파이크",
        async () => {
          const userId = `spike-user-${userCounter++}`;
          const productId = `load-test-product-${Math.floor(Math.random() * 10)}`;

          return addToCartUseCase.execute({
            userId,
            productId,
            quantity: 1,
          });
        },
        {
          duration: 3000, // 짧은 시간 동안 고강도
          maxConcurrency: 500, // 높은 동시성
        }
      );

      // 복구 트래픽
      console.log("🔄 복구 트래픽");
      const recoveryResult = await runLoadTest(
        "복구",
        async () => {
          const userId = `recovery-user-${userCounter++}`;
          const productId = `load-test-product-${Math.floor(Math.random() * 10)}`;

          return addToCartUseCase.execute({
            userId,
            productId,
            quantity: 1,
          });
        },
        {
          duration: 5000,
          targetRPS: 20,
        }
      );

      // 시스템 탄력성 검증
      console.log("🔍 시스템 탄력성 분석");
      console.log(
        `📊 베이스라인 처리량: ${baselineResult.throughput.toFixed(1)} RPS`
      );
      console.log(
        `⚡ 스파이크 처리량: ${spikeResult.throughput.toFixed(1)} RPS`
      );
      console.log(
        `🔄 복구 처리량: ${recoveryResult.throughput.toFixed(1)} RPS`
      );

      // 스파이크 시에도 완전히 중단되지 않아야 함
      expect(spikeResult.throughput).toBeGreaterThan(10); // 최소 처리량 유지
      expect(spikeResult.errorRate).toBeLessThan(50); // 50% 미만 에러율

      // 복구 후 성능이 베이스라인 수준으로 돌아와야 함
      const recoveryRatio =
        recoveryResult.throughput / baselineResult.throughput;
      expect(recoveryRatio).toBeGreaterThan(0.8); // 베이스라인의 80% 이상 복구

      console.log(`🎯 복구율: ${(recoveryRatio * 100).toFixed(1)}%`);
    }, 60000);
  });

  // ========================================
  // 📊 실제 운영 시나리오 시뮬레이션
  // ========================================

  describe("실제 운영 시나리오", () => {
    test("블랙 프라이데이 시나리오", async () => {
      console.log("🛍️ 블랙 프라이데이 시나리오 시뮬레이션");

      let userCounter = 0;
      const cartUsers = new Set<string>();

      const result = await runLoadTest(
        "블랙 프라이데이",
        async () => {
          const random = Math.random();

          if (random < 0.5) {
            // 50% - 새로운 사용자가 장바구니에 상품 추가
            const userId = `bf-user-${userCounter++}`;
            cartUsers.add(userId);
            const productId = `load-test-product-${Math.floor(Math.random() * 20)}`;

            return addToCartUseCase.execute({
              userId,
              productId,
              quantity: Math.floor(Math.random() * 5) + 1,
            });
          } else if (random < 0.7) {
            // 20% - 기존 사용자가 장바구니 조회
            const existingUsers = Array.from(cartUsers);
            if (existingUsers.length === 0)
              return Promise.resolve({ success: true });

            const userId =
              existingUsers[Math.floor(Math.random() * existingUsers.length)];
            return getCartUseCase.execute({ userId });
          } else if (random < 0.85) {
            // 15% - 기존 사용자가 수량 변경
            const existingUsers = Array.from(cartUsers);
            if (existingUsers.length === 0)
              return Promise.resolve({ success: true });

            const userId =
              existingUsers[Math.floor(Math.random() * existingUsers.length)];
            const productId = `load-test-product-${Math.floor(Math.random() * 20)}`;

            return updateCartItemUseCase.execute({
              userId,
              productId,
              quantity: Math.floor(Math.random() * 8) + 1,
            });
          } else {
            // 15% - 기존 사용자가 상품 제거
            const existingUsers = Array.from(cartUsers);
            if (existingUsers.length === 0)
              return Promise.resolve({ success: true });

            const userId =
              existingUsers[Math.floor(Math.random() * existingUsers.length)];
            const productId = `load-test-product-${Math.floor(Math.random() * 20)}`;

            return removeFromCartUseCase.execute({
              userId,
              productId,
            });
          }
        },
        {
          duration: 25000, // 25초
          maxConcurrency: 300,
        }
      );

      // 블랙 프라이데이 시나리오 기준
      expect(result.errorRate).toBeLessThan(15); // 15% 미만 에러율 (높은 부하 고려)
      expect(result.throughput).toBeGreaterThan(40); // 초당 40건 이상
      expect(result.p99ResponseTime).toBeLessThan(5000); // 99% 5초 이하

      console.log(
        `🛍️ 블랙 프라이데이 시뮬레이션 완료: ${cartUsers.size}명 고객 처리`
      );
    }, 60000);

    test("일반적인 트래픽 패턴", async () => {
      console.log("📊 일반적인 일일 트래픽 패턴 시뮬레이션");

      let userCounter = 0;
      const activeUsers = new Set<string>();

      const result = await runLoadTest(
        "일반 트래픽",
        async () => {
          const random = Math.random();

          if (random < 0.4) {
            // 40% - 장바구니 조회 (가장 빈번한 액션)
            if (activeUsers.size === 0) {
              // 사용자가 없으면 새로 생성
              const userId = `daily-user-${userCounter++}`;
              activeUsers.add(userId);
              return addToCartUseCase.execute({
                userId,
                productId: `load-test-product-${Math.floor(Math.random() * 10)}`,
                quantity: 1,
              });
            }

            const users = Array.from(activeUsers);
            const userId = users[Math.floor(Math.random() * users.length)];
            return getCartUseCase.execute({ userId });
          } else if (random < 0.7) {
            // 30% - 상품 추가
            const userId =
              Math.random() < 0.3
                ? `daily-user-${userCounter++}` // 30% 신규 사용자
                : Array.from(activeUsers)[
                    Math.floor(Math.random() * Math.max(1, activeUsers.size))
                  ]; // 기존 사용자

            activeUsers.add(userId);
            const productId = `load-test-product-${Math.floor(Math.random() * 30)}`;

            return addToCartUseCase.execute({
              userId,
              productId,
              quantity: Math.floor(Math.random() * 3) + 1,
            });
          } else if (random < 0.9) {
            // 20% - 수량 변경
            if (activeUsers.size === 0)
              return Promise.resolve({ success: true });

            const users = Array.from(activeUsers);
            const userId = users[Math.floor(Math.random() * users.length)];
            const productId = `load-test-product-${Math.floor(Math.random() * 30)}`;

            return updateCartItemUseCase.execute({
              userId,
              productId,
              quantity: Math.floor(Math.random() * 4) + 1,
            });
          } else {
            // 10% - 상품 제거 또는 장바구니 비우기
            if (activeUsers.size === 0)
              return Promise.resolve({ success: true });

            const users = Array.from(activeUsers);
            const userId = users[Math.floor(Math.random() * users.length)];

            if (Math.random() < 0.7) {
              // 개별 상품 제거
              const productId = `load-test-product-${Math.floor(Math.random() * 30)}`;
              return removeFromCartUseCase.execute({ userId, productId });
            } else {
              // 장바구니 전체 비우기
              return clearCartUseCase.execute({ userId });
            }
          }
        },
        {
          duration: 20000, // 20초
          targetRPS: 25, // 일반적인 부하
        }
      );

      // 일반 트래픽 기준 (더 엄격함)
      expect(result.errorRate).toBeLessThan(3); // 3% 미만 에러율
      expect(result.averageResponseTime).toBeLessThan(300); // 평균 300ms 이하
      expect(result.p95ResponseTime).toBeLessThan(800); // 95% 800ms 이하
      expect(result.throughput).toBeGreaterThan(20); // 초당 20건 이상

      console.log(
        `👥 일반 트래픽 시뮬레이션 완료: ${activeUsers.size}명 활성 사용자`
      );
    }, 45000);
  });
});
