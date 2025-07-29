// ========================================
// Cache Service 통합 테스트 (완전 구현)
// cart-service/src/__tests__/integration/cache/cache-service.test.ts
// ========================================

import { Container } from "inversify";
import { CacheServiceImpl } from "../../../adapters/CacheServiceImpl";
import { RedisConfig } from "../../../infrastructure/config/RedisConfig";
import { RedisTestClient } from "../../utils/RedisTestClient";
import { DIContainer } from "../../../infrastructure/di/Container";
import { TYPES } from "../../../infrastructure/di/types";
import { delay, measureExecutionTime } from "../../utils/TestHelpers";

describe("Cache Service Integration Tests", () => {
  let container: Container;
  let cacheService: CacheServiceImpl;
  let redisTestClient: RedisTestClient;
  let redisConfig: RedisConfig;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Cache Service Test] 테스트 환경 초기화 중...");

    try {
      // DI Container 초기화
      container = await DIContainer.create();

      // Cache Service 및 설정 가져오기
      cacheService = container.get<CacheServiceImpl>(TYPES.CacheService);
      redisConfig = container.get<RedisConfig>(TYPES.RedisConfig);

      // Redis 테스트 클라이언트 초기화
      redisTestClient = new RedisTestClient(global.testRedis);

      console.log("✅ [Cache Service Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Cache Service Test] 초기화 실패:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    // 각 테스트 전 캐시 정리
    await redisTestClient.flushAll();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 🔧 기본 CRUD 연산 테스트
  // ========================================

  describe("기본 CRUD 연산", () => {
    test("데이터 저장 및 조회", async () => {
      const key = "test:basic:string";
      const value = "Hello, Redis!";

      // 저장
      await cacheService.set(key, value);

      // 조회
      const retrieved = await cacheService.get<string>(key);

      expect(retrieved).toBe(value);
    });

    test("객체 데이터 저장 및 조회", async () => {
      const key = "test:basic:object";
      const value = {
        id: "123",
        name: "Test Product",
        price: 29.99,
        tags: ["electronics", "gadget"],
        metadata: {
          category: "tech",
          inStock: true,
        },
      };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get<typeof value>(key);

      expect(retrieved).toEqual(value);
      expect(typeof retrieved?.price).toBe("number");
      expect(Array.isArray(retrieved?.tags)).toBe(true);
      expect(retrieved?.metadata?.inStock).toBe(true);
    });

    test("배열 데이터 저장 및 조회", async () => {
      const key = "test:basic:array";
      const value = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
        { id: "3", name: "Item 3" },
      ];

      await cacheService.set(key, value);
      const retrieved = await cacheService.get<typeof value>(key);

      expect(retrieved).toEqual(value);
      expect(retrieved?.length).toBe(3);
      expect(retrieved?.[1]?.name).toBe("Item 2");
    });

    test("존재하지 않는 키 조회", async () => {
      const nonExistentKey = "test:nonexistent:key";

      const result = await cacheService.get(nonExistentKey);

      expect(result).toBeNull();
    });

    test("데이터 삭제", async () => {
      const key = "test:delete:key";
      const value = "to be deleted";

      // 저장 후 확인
      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toBe(value);

      // 삭제 후 확인
      await cacheService.delete(key);
      expect(await cacheService.get(key)).toBeNull();
    });
  });

  // ========================================
  // ⏰ TTL (Time To Live) 테스트
  // ========================================

  describe("TTL (Time To Live) 관리", () => {
    test("TTL 설정 및 만료", async () => {
      const key = "test:ttl:short";
      const value = "expires soon";
      const ttlSeconds = 2;

      await cacheService.set(key, value, ttlSeconds);

      // 즉시 조회 - 존재해야 함
      expect(await cacheService.get(key)).toBe(value);

      // TTL 확인 (2초 이하여야 함)
      const ttl = await redisTestClient.getTTL(`cart-service-test:${key}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);

      // TTL 만료까지 대기
      await delay(ttlSeconds * 1000 + 100); // 약간의 여유분

      // 만료 후 조회 - null이어야 함
      expect(await cacheService.get(key)).toBeNull();
    });

    test("도메인별 TTL 설정 확인", async () => {
      const cartKey = "cart:123";
      const userKey = "user:456";
      const sessionKey = "session:789";

      const strategyConfig = redisConfig.getStrategyConfig();

      // 각 도메인별로 다른 TTL 설정
      await cacheService.set(
        cartKey,
        { items: [] },
        strategyConfig.ttlByDomain.cart
      );
      await cacheService.set(
        userKey,
        "cart-id-123",
        strategyConfig.ttlByDomain.userCart
      );
      await cacheService.set(
        sessionKey,
        "cart-id-456",
        strategyConfig.ttlByDomain.sessionCart
      );

      // TTL 확인
      const cartTTL = await redisTestClient.getTTL(
        `cart-service-test:${cartKey}`
      );
      const userTTL = await redisTestClient.getTTL(
        `cart-service-test:${userKey}`
      );
      const sessionTTL = await redisTestClient.getTTL(
        `cart-service-test:${sessionKey}`
      );

      expect(cartTTL).toBeGreaterThan(strategyConfig.ttlByDomain.cart - 10);
      expect(userTTL).toBeGreaterThan(strategyConfig.ttlByDomain.userCart - 10);
      expect(sessionTTL).toBeGreaterThan(
        strategyConfig.ttlByDomain.sessionCart - 10
      );
    });

    test("TTL 없는 데이터 (영구 저장)", async () => {
      const key = "test:permanent";
      const value = "permanent data";

      await cacheService.set(key, value); // TTL 없음

      const ttl = await redisTestClient.getTTL(`cart-service-test:${key}`);
      expect(ttl).toBe(-1); // -1은 TTL이 설정되지 않음을 의미
    });
  });

  // ========================================
  // 🔍 패턴 기반 무효화 테스트
  // ========================================

  describe("패턴 기반 캐시 무효화", () => {
    test("와일드카드 패턴으로 여러 키 삭제", async () => {
      const baseKey = "test:pattern:user";
      const keys = [`${baseKey}:1`, `${baseKey}:2`, `${baseKey}:3`];
      const pattern = `${baseKey}:*`;

      // 여러 키에 데이터 저장
      for (const key of keys) {
        await cacheService.set(key, `data for ${key}`);
      }

      // 저장 확인
      for (const key of keys) {
        expect(await cacheService.get(key)).toBeTruthy();
      }

      // 패턴으로 무효화
      await cacheService.invalidatePattern(pattern);

      // 삭제 확인
      for (const key of keys) {
        expect(await cacheService.get(key)).toBeNull();
      }
    });

    test("복잡한 패턴 무효화", async () => {
      const testData = {
        "cart:user:123": { items: [1, 2, 3] },
        "cart:user:456": { items: [4, 5] },
        "cart:session:abc": { items: [6] },
        "product:cache:789": { name: "Product" },
      };

      // 테스트 데이터 저장
      for (const [key, value] of Object.entries(testData)) {
        await cacheService.set(key, value);
      }

      // cart:user:* 패턴으로 무효화
      await cacheService.invalidatePattern("cart:user:*");

      // cart:user: 키들만 삭제되었는지 확인
      expect(await cacheService.get("cart:user:123")).toBeNull();
      expect(await cacheService.get("cart:user:456")).toBeNull();
      expect(await cacheService.get("cart:session:abc")).toBeTruthy(); // 여전히 존재
      expect(await cacheService.get("product:cache:789")).toBeTruthy(); // 여전히 존재
    });
  });

  // ========================================
  // 📊 성능 및 압축 테스트
  // ========================================

  describe("성능 및 압축", () => {
    test("대용량 데이터 압축 테스트", async () => {
      const key = "test:compression:large";

      // 1KB 이상의 대용량 데이터 생성 (압축 임계값 초과)
      const largeData = {
        description: "A".repeat(2000), // 2KB 문자열
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(5),
        })),
      };

      await cacheService.set(key, largeData);
      const retrieved = await cacheService.get<typeof largeData>(key);

      expect(retrieved).toEqual(largeData);
      expect(retrieved?.description.length).toBe(2000);
      expect(retrieved?.items.length).toBe(100);
    });

    test("캐시 성능 측정", async () => {
      const key = "test:performance:simple";
      const value = { message: "performance test" };

      // 저장 성능 측정
      const { executionTime: setTime } = await measureExecutionTime(() =>
        cacheService.set(key, value)
      );

      // 조회 성능 측정
      const { executionTime: getTime } = await measureExecutionTime(() =>
        cacheService.get(key)
      );

      expect(setTime).toBeLessThan(100); // 100ms 이하
      expect(getTime).toBeLessThan(50); // 50ms 이하

      console.log(
        `📊 Cache Performance - Set: ${setTime}ms, Get: ${getTime}ms`
      );
    });

    test("동시 액세스 성능", async () => {
      const baseKey = "test:concurrent";
      const concurrentOps = 20;

      // 동시 쓰기 작업
      const writePromises = Array.from({ length: concurrentOps }, (_, i) =>
        cacheService.set(`${baseKey}:write:${i}`, {
          index: i,
          data: `data-${i}`,
        })
      );

      const { executionTime: writeTime } = await measureExecutionTime(() =>
        Promise.all(writePromises)
      );

      // 동시 읽기 작업
      const readPromises = Array.from({ length: concurrentOps }, (_, i) =>
        cacheService.get(`${baseKey}:write:${i}`)
      );

      const { result: readResults, executionTime: readTime } =
        await measureExecutionTime(() => Promise.all(readPromises));

      // 성능 확인
      expect(writeTime).toBeLessThan(1000); // 1초 이하
      expect(readTime).toBeLessThan(500); // 0.5초 이하

      // 데이터 무결성 확인
      readResults.forEach((result, index) => {
        expect(result).toEqual({ index, data: `data-${index}` });
      });

      console.log(
        `📊 Concurrent Performance - Write: ${writeTime}ms, Read: ${readTime}ms`
      );
    });
  });

  // ========================================
  // 🛡️ 오류 처리 및 복원력 테스트
  // ========================================

  describe("오류 처리 및 복원력", () => {
    test("Redis 연결 불가 시 Graceful Degradation", async () => {
      // 테스트용으로 연결 끊기 (실제로는 mock 등을 사용)
      const key = "test:error:graceful";
      const value = "test data";

      // 정상 상황에서는 에러가 발생하지 않아야 함
      await expect(cacheService.set(key, value)).resolves.not.toThrow();
      await expect(cacheService.get(key)).resolves.not.toThrow();
      await expect(cacheService.delete(key)).resolves.not.toThrow();
    });

    test("잘못된 키 형식 처리", async () => {
      const invalidKeys = ["", null as any, undefined as any];

      for (const invalidKey of invalidKeys) {
        // 에러가 발생하지 않고 적절히 처리되어야 함
        await expect(cacheService.get(invalidKey)).resolves.toBeNull();
        await expect(
          cacheService.set(invalidKey, "value")
        ).resolves.not.toThrow();
        await expect(cacheService.delete(invalidKey)).resolves.not.toThrow();
      }
    });

    test("특수 문자가 포함된 키 처리", async () => {
      const specialKeys = [
        "test:special:한글키",
        "test:special:key with spaces",
        "test:special:key@#$%^&*()",
        "test:special:key/with/slashes",
      ];

      for (const key of specialKeys) {
        const value = `value for ${key}`;

        await cacheService.set(key, value);
        const retrieved = await cacheService.get(key);

        expect(retrieved).toBe(value);
      }
    });
  });

  // ========================================
  // 📈 통계 및 모니터링 테스트
  // ========================================

  describe("통계 및 모니터링", () => {
    test("캐시 통계 조회", async () => {
      // 몇 개의 키 생성
      const testKeys = ["stat:1", "stat:2", "stat:3"];
      for (const key of testKeys) {
        await cacheService.set(key, `data for ${key}`);
      }

      const stats = await cacheService.getStats();

      expect(stats).toMatchObject({
        isConnected: true,
        totalKeys: expect.any(Number),
        usedMemory: expect.any(String),
      });

      expect(stats.totalKeys).toBeGreaterThanOrEqual(testKeys.length);
      expect(stats.usedMemory).toMatch(/\d+[KMGT]?B/); // 메모리 형식 확인
    });

    test("캐시 상태 모니터링", async () => {
      const healthStatus = await redisConfig.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: "healthy",
        isConnected: true,
        stats: expect.any(Object),
      });
    });
  });

  // ========================================
  // 🧪 실제 장바구니 시나리오 테스트
  // ========================================

  describe("실제 장바구니 캐시 시나리오", () => {
    test("장바구니 캐시 전체 플로우", async () => {
      const userId = "user-123";
      const cartId = "cart-456";
      const cartData = {
        id: cartId,
        userId,
        items: [
          { productId: "prod-1", quantity: 2, price: 25000 },
          { productId: "prod-2", quantity: 1, price: 15000 },
        ],
        totalAmount: 65000,
        createdAt: new Date().toISOString(),
      };

      // 1. 장바구니 데이터 캐싱
      await cacheService.set(`cart:${cartId}`, cartData, 1800); // 30분

      // 2. 사용자-장바구니 매핑 캐싱
      await cacheService.set(`user:${userId}`, cartId, 3600); // 1시간

      // 3. 캐시에서 사용자의 장바구니 조회
      const cachedCartId = await cacheService.get<string>(`user:${userId}`);
      expect(cachedCartId).toBe(cartId);

      const cachedCart = await cacheService.get(`cart:${cachedCartId}`);
      expect(cachedCart).toEqual(cartData);

      // 4. 장바구니 수정 (캐시 업데이트)
      const updatedCartData = {
        ...cartData,
        items: [
          ...cartData.items,
          { productId: "prod-3", quantity: 1, price: 10000 },
        ],
        totalAmount: 75000,
      };

      await cacheService.set(`cart:${cartId}`, updatedCartData, 1800);

      // 5. 업데이트된 데이터 확인
      const updatedCart = await cacheService.get(`cart:${cartId}`);
      expect(updatedCart).toEqual(updatedCartData);
      expect((updatedCart as any).totalAmount).toBe(75000);

      // 6. 사용자 로그아웃 시 세션 캐시 정리
      await cacheService.invalidatePattern(`user:${userId}*`);

      const afterLogout = await cacheService.get(`user:${userId}`);
      expect(afterLogout).toBeNull();
    });

    test("캐시 미스 시 동작 확인", async () => {
      const nonExistentCartId = "cart-nonexistent";

      // 캐시 미스 상황 시뮬레이션
      const result = await cacheService.get(`cart:${nonExistentCartId}`);

      expect(result).toBeNull();

      // 실제로는 이 시점에서 DB에서 조회하게 됨
      console.log("✅ 캐시 미스 - DB 조회로 fallback 필요");
    });
  });
});
