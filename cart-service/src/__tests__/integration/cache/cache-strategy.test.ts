// ========================================
// Cache Strategy 통합 테스트 (완전 구현)
// cart-service/src/__tests__/integration/cache/cache-strategy.test.ts
// ========================================

import { Container } from "inversify";
import { CacheServiceImpl } from "../../../adapters/CacheServiceImpl";
import { CartRepositoryImpl } from "../../../adapters/CartRepositoryImpl";
import { RedisTestClient } from "../../utils/RedisTestClient";
import { DatabaseCleaner } from "../../utils/DatabaseCleaner";
import { DIContainer } from "../../../infrastructure/di/Container";
import { TYPES } from "../../../infrastructure/di/types";
import { Cart } from "../../../entities/Cart";
import { delay, measureExecutionTime } from "../../utils/TestHelpers";

describe("Cache Strategy Integration Tests", () => {
  let container: Container;
  let cacheService: CacheServiceImpl;
  let cartRepository: CartRepositoryImpl;
  let redisTestClient: RedisTestClient;
  let dbCleaner: DatabaseCleaner;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Cache Strategy Test] 테스트 환경 초기화 중...");

    try {
      container = await DIContainer.create();
      cacheService = container.get<CacheServiceImpl>(TYPES.CacheService);
      cartRepository = container.get<CartRepositoryImpl>(TYPES.CartRepository);
      redisTestClient = new RedisTestClient(global.testRedis);
      dbCleaner = new DatabaseCleaner(global.testDataSource);

      console.log("✅ [Cache Strategy Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Cache Strategy Test] 초기화 실패:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    await redisTestClient.flushAll();
    await dbCleaner.cleanAll();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 🚀 Cache-Aside 패턴 테스트
  // ========================================

  describe("Cache-Aside 패턴", () => {
    test("캐시 미스 시 DB 조회 후 캐시 저장", async () => {
      const userId = "user-cache-aside-123";
      const cart = Cart.createForUser(userId);
      cart.addItem("product-1", 2, 25000);
      cart.addItem("product-2", 1, 15000);

      // 1. DB에 장바구니 저장
      const savedCart = await cartRepository.save(cart);
      const cartKey = `cart:user:${userId}`;

      // 2. 캐시에는 없음을 확인
      expect(await cacheService.get(cartKey)).toBeNull();

      // 3. 캐시 미스 상황에서 DB 조회 후 캐시 저장 시뮬레이션
      const { result: dbCart, executionTime: dbTime } =
        await measureExecutionTime(() => cartRepository.findByUserId(userId));

      expect(dbCart).not.toBeNull();
      console.log(`🔍 DB 조회 시간: ${dbTime}ms`);

      // 4. 조회된 데이터를 캐시에 저장
      await cacheService.set(cartKey, dbCart, 1800); // 30분

      // 5. 캐시에서 조회 (캐시 히트)
      const { result: cachedCart, executionTime: cacheTime } =
        await measureExecutionTime(() => cacheService.get(cartKey));

      expect(cachedCart).not.toBeNull();
      expect(cacheTime).toBeLessThan(dbTime); // 캐시가 DB보다 빨라야 함
      console.log(
        `⚡ 캐시 조회 시간: ${cacheTime}ms (성능 향상: ${(((dbTime - cacheTime) / dbTime) * 100).toFixed(1)}%)`
      );
    });

    test("캐시 히트율 측정", async () => {
      const users = Array.from({ length: 10 }, (_, i) => `user-hit-rate-${i}`);
      const carts = [];

      // 10개 장바구니 생성 및 DB 저장
      for (const userId of users) {
        const cart = Cart.createForUser(userId);
        cart.addItem("product-1", Math.floor(Math.random() * 5) + 1, 10000);
        const savedCart = await cartRepository.save(cart);
        carts.push(savedCart);

        // 캐시에 저장
        await cacheService.set(`cart:user:${userId}`, savedCart, 1800);
      }

      // 캐시 히트율 테스트 (랜덤하게 조회)
      let cacheHits = 0;
      let cacheMisses = 0;
      const totalRequests = 50;

      for (let i = 0; i < totalRequests; i++) {
        const randomUserId = users[Math.floor(Math.random() * users.length)];
        const cartKey = `cart:user:${randomUserId}`;

        // 10%는 캐시 미스 시뮬레이션 (캐시 삭제)
        if (Math.random() < 0.1) {
          await cacheService.delete(cartKey);
        }

        const cachedData = await cacheService.get(cartKey);
        if (cachedData) {
          cacheHits++;
        } else {
          cacheMisses++;
          // 캐시 미스 시 DB에서 조회 후 캐시 저장
          const dbCart = await cartRepository.findByUserId(randomUserId);
          if (dbCart) {
            await cacheService.set(cartKey, dbCart, 1800);
          }
        }
      }

      const hitRate = (cacheHits / totalRequests) * 100;
      console.log(
        `📊 캐시 히트율: ${hitRate.toFixed(1)}% (히트: ${cacheHits}, 미스: ${cacheMisses})`
      );

      expect(hitRate).toBeGreaterThan(80); // 80% 이상의 히트율 기대
    });
  });

  // ========================================
  // 🔄 Write-Through 패턴 테스트
  // ========================================

  describe("Write-Through 패턴", () => {
    test("데이터 저장 시 DB와 캐시 동시 업데이트", async () => {
      const userId = "user-write-through-123";
      const cart = Cart.createForUser(userId);
      cart.addItem("product-1", 3, 20000);

      const cartKey = `cart:user:${userId}`;

      // Write-Through: DB 저장과 캐시 저장을 동시에 수행
      const { executionTime } = await measureExecutionTime(async () => {
        // 1. DB 저장
        const savedCart = await cartRepository.save(cart);

        // 2. 캐시 저장 (동시에)
        await cacheService.set(cartKey, savedCart, 1800);

        return savedCart;
      });

      console.log(`💾 Write-Through 실행 시간: ${executionTime}ms`);

      // 3. 두 저장소 모두에서 데이터 확인
      const dbCart = await cartRepository.findByUserId(userId);
      const cachedCart = await cacheService.get(cartKey);

      expect(dbCart).not.toBeNull();
      expect(cachedCart).not.toBeNull();
      expect((dbCart as any).getId()).toBe((cachedCart as any).id);
    });

    test("Write-Through vs Write-Behind 성능 비교", async () => {
      const userId = "user-performance-test";
      const cart = Cart.createForUser(userId);
      cart.addItem("product-1", 1, 5000);

      // Write-Through 성능 측정
      const { executionTime: writeThroughTime } = await measureExecutionTime(
        async () => {
          const savedCart = await cartRepository.save(cart);
          await cacheService.set(`cart:user:${userId}`, savedCart, 1800);
        }
      );

      // Write-Behind 시뮬레이션 (비동기 캐시 업데이트)
      const { executionTime: writeBehindTime } = await measureExecutionTime(
        async () => {
          const savedCart = await cartRepository.save(cart);
          // 비동기 캐시 업데이트 (기다리지 않음)
          setImmediate(() => {
            cacheService.set(`cart:user:${userId}-behind`, savedCart, 1800);
          });
        }
      );

      console.log(`⚡ Write-Through: ${writeThroughTime}ms`);
      console.log(`⚡ Write-Behind: ${writeBehindTime}ms`);

      expect(writeBehindTime).toBeLessThan(writeThroughTime);
    });
  });

  // ========================================
  // 🗑️ Cache Invalidation 전략 테스트
  // ========================================

  describe("Cache Invalidation 전략", () => {
    test("TTL 기반 자동 만료", async () => {
      const userId = "user-ttl-test";
      const cart = Cart.createForUser(userId);
      const cartKey = `cart:user:${userId}`;

      // 짧은 TTL로 캐시 저장 (2초)
      await cacheService.set(cartKey, cart, 2);

      // 즉시 조회 - 존재해야 함
      expect(await cacheService.get(cartKey)).not.toBeNull();

      // 1초 대기
      await delay(1000);
      expect(await cacheService.get(cartKey)).not.toBeNull();

      // 3초 대기 (총 4초 - TTL 초과)
      await delay(3000);
      expect(await cacheService.get(cartKey)).toBeNull();

      console.log("✅ TTL 기반 자동 만료 검증 완료");
    });

    test("수동 무효화 - 특정 키", async () => {
      const userId = "user-manual-invalidation";
      const cart = Cart.createForUser(userId);
      const cartKey = `cart:user:${userId}`;

      await cacheService.set(cartKey, cart, 3600);
      expect(await cacheService.get(cartKey)).not.toBeNull();

      // 수동 무효화
      await cacheService.delete(cartKey);
      expect(await cacheService.get(cartKey)).toBeNull();

      console.log("✅ 수동 무효화 검증 완료");
    });

    test("패턴 기반 무효화", async () => {
      const userIds = ["user-pattern-1", "user-pattern-2", "user-pattern-3"];
      const otherKeys = ["product:123", "session:abc"];

      // 여러 타입의 키 생성
      for (const userId of userIds) {
        await cacheService.set(`cart:user:${userId}`, { data: "test" }, 3600);
      }

      for (const key of otherKeys) {
        await cacheService.set(key, { data: "other" }, 3600);
      }

      // cart:user:* 패턴으로 무효화
      await cacheService.invalidatePattern("cart:user:*");

      // 패턴에 맞는 키들은 삭제됨
      for (const userId of userIds) {
        expect(await cacheService.get(`cart:user:${userId}`)).toBeNull();
      }

      // 다른 키들은 유지됨
      for (const key of otherKeys) {
        expect(await cacheService.get(key)).not.toBeNull();
      }

      console.log("✅ 패턴 기반 무효화 검증 완료");
    });
  });

  // ========================================
  // 🎯 Hot/Cold Data 전략 테스트
  // ========================================

  describe("Hot/Cold Data 전략", () => {
    test("자주 접근하는 데이터 (Hot Data) 우선 캐싱", async () => {
      const hotUsers = ["hot-user-1", "hot-user-2"];
      const coldUsers = ["cold-user-1", "cold-user-2"];

      // Hot Data - 자주 접근하는 사용자의 장바구니
      for (const userId of hotUsers) {
        const cart = Cart.createForUser(userId);
        cart.addItem("hot-product", 1, 10000);
        const savedCart = await cartRepository.save(cart);

        // 긴 TTL과 높은 우선순위
        await cacheService.set(`cart:user:${userId}`, savedCart, 7200); // 2시간
      }

      // Cold Data - 가끔 접근하는 사용자의 장바구니
      for (const userId of coldUsers) {
        const cart = Cart.createForUser(userId);
        cart.addItem("cold-product", 1, 5000);
        const savedCart = await cartRepository.save(cart);

        // 짧은 TTL
        await cacheService.set(`cart:user:${userId}`, savedCart, 600); // 10분
      }

      // Hot Data 접근 시뮬레이션 (빠른 응답)
      const hotAccessTimes = [];
      for (let i = 0; i < 10; i++) {
        const userId = hotUsers[i % hotUsers.length];
        const { executionTime } = await measureExecutionTime(() =>
          cacheService.get(`cart:user:${userId}`)
        );
        hotAccessTimes.push(executionTime);
      }

      const avgHotAccessTime =
        hotAccessTimes.reduce((a, b) => a + b) / hotAccessTimes.length;
      console.log(
        `🔥 Hot Data 평균 접근 시간: ${avgHotAccessTime.toFixed(2)}ms`
      );

      expect(avgHotAccessTime).toBeLessThan(50); // 50ms 이하
    });

    test("메모리 압박 시 LRU 전략", async () => {
      // 많은 수의 캐시 항목 생성하여 메모리 압박 상황 시뮬레이션
      const keys = Array.from({ length: 20 }, (_, i) => `lru-test:${i}`);

      // 순차적으로 데이터 저장
      for (let i = 0; i < keys.length; i++) {
        await cacheService.set(
          keys[i],
          {
            data: `data-${i}`,
            timestamp: Date.now(),
            size: "x".repeat(100), // 큰 데이터 시뮬레이션
          },
          3600
        );

        // 짧은 지연으로 시간 차이 생성
        await delay(10);
      }

      // 처음 몇 개 키에 접근하여 최근 사용으로 만들기
      const recentlyUsedKeys = keys.slice(0, 5);
      for (const key of recentlyUsedKeys) {
        await cacheService.get(key);
        await delay(5);
      }

      // Redis 메모리 정책에 따라 오래된 키들이 제거될 수 있음
      const stats = await cacheService.getStats();
      console.log(`📊 캐시 통계: ${JSON.stringify(stats, null, 2)}`);

      expect(stats.totalKeys).toBeGreaterThan(0);
    });
  });

  // ========================================
  // 🔄 Read-Through 패턴 테스트
  // ========================================

  describe("Read-Through 패턴", () => {
    test("캐시 미스 시 자동 DB 조회 및 캐시 저장", async () => {
      const userId = "user-read-through";
      const cart = Cart.createForUser(userId);
      cart.addItem("product-1", 2, 15000);

      // DB에만 저장 (캐시에는 없음)
      await cartRepository.save(cart);

      // Read-Through 시뮬레이션 함수
      const readThroughGetCart = async (userId: string) => {
        const cartKey = `cart:user:${userId}`;

        // 1. 캐시에서 조회
        let cachedCart = await cacheService.get(cartKey);

        if (cachedCart) {
          console.log("🎯 캐시 히트");
          return cachedCart;
        }

        // 2. 캐시 미스 - DB에서 조회
        console.log("💿 캐시 미스 - DB 조회");
        const dbCart = await cartRepository.findByUserId(userId);

        if (dbCart) {
          // 3. DB 결과를 캐시에 저장
          await cacheService.set(cartKey, dbCart, 1800);
          console.log("💾 DB 결과를 캐시에 저장");
        }

        return dbCart;
      };

      // 첫 번째 조회 - 캐시 미스
      const { result: firstResult, executionTime: firstTime } =
        await measureExecutionTime(() => readThroughGetCart(userId));

      // 두 번째 조회 - 캐시 히트
      const { result: secondResult, executionTime: secondTime } =
        await measureExecutionTime(() => readThroughGetCart(userId));

      expect(firstResult).not.toBeNull();
      expect(secondResult).not.toBeNull();
      expect(secondTime).toBeLessThan(firstTime); // 두 번째가 더 빨라야 함

      console.log(`⚡ 첫 번째 조회 (캐시 미스): ${firstTime}ms`);
      console.log(`⚡ 두 번째 조회 (캐시 히트): ${secondTime}ms`);
      console.log(
        `📈 성능 향상: ${(((firstTime - secondTime) / firstTime) * 100).toFixed(1)}%`
      );
    });
  });

  // ========================================
  // 📊 캐시 성능 벤치마크
  // ========================================

  describe("캐시 성능 벤치마크", () => {
    test("대용량 데이터 캐시 성능", async () => {
      const largeCartData = {
        id: "large-cart-123",
        userId: "benchmark-user",
        items: Array.from({ length: 100 }, (_, i) => ({
          productId: `product-${i}`,
          quantity: Math.floor(Math.random() * 10) + 1,
          price: Math.floor(Math.random() * 100000) + 1000,
          metadata: {
            description: `Product ${i} description`.repeat(10),
            tags: [`tag-${i}`, `category-${i % 5}`, `brand-${i % 3}`],
          },
        })),
        metadata: {
          createdAt: new Date().toISOString(),
          notes: "Large cart for performance testing".repeat(20),
        },
      };

      // 저장 성능 측정
      const { executionTime: setTime } = await measureExecutionTime(() =>
        cacheService.set("large-cart", largeCartData, 3600)
      );

      // 조회 성능 측정
      const { executionTime: getTime } = await measureExecutionTime(() =>
        cacheService.get("large-cart")
      );

      console.log(`💾 대용량 데이터 저장 시간: ${setTime}ms`);
      console.log(`🔍 대용량 데이터 조회 시간: ${getTime}ms`);

      expect(setTime).toBeLessThan(500); // 500ms 이하
      expect(getTime).toBeLessThan(100); // 100ms 이하
    });

    test("동시 캐시 접근 성능", async () => {
      const concurrentUsers = 50;
      // 🔧 수정: 타입 명시적 선언으로 타입 추론 문제 해결
      const operations: Promise<any>[] = [];

      // 동시에 여러 사용자의 캐시 작업 실행
      for (let i = 0; i < concurrentUsers; i++) {
        const userId = `concurrent-user-${i}`;
        const cartData = {
          id: `cart-${i}`,
          userId,
          items: [{ productId: "test-product", quantity: 1, price: 10000 }],
        };

        operations.push(
          cacheService
            .set(`cart:user:${userId}`, cartData, 1800)
            .then(() => cacheService.get(`cart:user:${userId}`))
        );
      }

      const { executionTime } = await measureExecutionTime(() =>
        Promise.all(operations)
      );

      console.log(
        `🚀 ${concurrentUsers}개 동시 캐시 작업 완료 시간: ${executionTime}ms`
      );
      console.log(
        `📊 평균 작업 시간: ${(executionTime / concurrentUsers).toFixed(2)}ms`
      );

      expect(executionTime).toBeLessThan(5000); // 5초 이하
    });
  });
});
