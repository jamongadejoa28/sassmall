// ========================================
// 실무적 장바구니 테스트 케이스 - 복잡성 최소화
// cart-service/src/adapters/__tests__/CartRepositoryImpl.test.ts
// ========================================

import { TestDataSource } from "../../infrastructure/database/test-data-source";
import { Cart } from "../../entities/Cart";
import { CartRepositoryImpl } from "../CartRepositoryImpl";
import { TestUtils } from "../../test-utils/TestUtils";

/**
 * 실무 중심 장바구니 Repository 테스트
 *
 * 특징:
 * - 복잡성 최소화
 * - 실제 쇼핑몰 시나리오 중심
 * - 성능 및 안정성 검증
 * - 재고 관리 시나리오 포함
 */
describe("CartRepositoryImpl - 실무 중심 테스트", () => {
  let repository: CartRepositoryImpl;

  // ✅ 테스트용 고정 데이터 (UUID 보장)
  const TEST_USER_ID = TestUtils.generateUserId();
  const TEST_USER_ID_2 = TestUtils.generateUserId();
  const TEST_SESSION_ID = TestUtils.generateSessionId();
  const TEST_SESSION_ID_2 = TestUtils.generateSessionId();
  const TEST_PRODUCT_ID_1 = TestUtils.generateProductId();
  const TEST_PRODUCT_ID_2 = TestUtils.generateProductId();

  beforeAll(async () => {
    try {
      if (!TestDataSource.isInitialized) {
        await TestDataSource.initialize();
        console.log("✅ Test database connected");
      }
      repository = new CartRepositoryImpl(TestDataSource);
    } catch (error) {
      console.error("❌ Test database setup failed:", error);
      throw error;
    }
  });

  afterAll(async () => {
    repository = null as any;
    console.log("✅ Test cleanup completed");
  });

  beforeEach(async () => {
    try {
      await TestDataSource.query(
        "TRUNCATE TABLE cart_items, carts RESTART IDENTITY CASCADE"
      );
    } catch (error) {
      console.error("❌ Database cleanup failed:", error);
      throw error;
    }
  });

  // ========================================
  // 1. 기본 CRUD 테스트 (단순화)
  // ========================================
  describe("기본 CRUD 기능", () => {
    it("새로운 빈 장바구니를 저장할 수 있다", async () => {
      // Given
      const cart = Cart.createForSession(TEST_SESSION_ID);

      // When
      const savedCart = await repository.save(cart);

      // Then
      expect(savedCart.getId()).toBeDefined();
      expect(TestUtils.isValidUUID(savedCart.getId())).toBe(true);
      expect(savedCart.getSessionId()).toBe(TEST_SESSION_ID);
      expect(savedCart.isEmpty()).toBe(true);
    });

    it("상품이 있는 장바구니를 저장할 수 있다", async () => {
      // Given
      const cart = Cart.createForUser(TEST_USER_ID);
      cart.addItem(TEST_PRODUCT_ID_1, 2, 15000);
      cart.addItem(TEST_PRODUCT_ID_2, 1, 25000);

      // When
      const savedCart = await repository.save(cart);

      // Then
      expect(savedCart.getItems()).toHaveLength(2);
      expect(savedCart.getTotalItems()).toBe(3);
      expect(savedCart.getTotalAmount()).toBe(55000); // 30000 + 25000
      expect(savedCart.getUserId()).toBe(TEST_USER_ID);
    });

    it("기존 장바구니를 업데이트할 수 있다", async () => {
      // Given
      const cart = Cart.createForSession(TEST_SESSION_ID);
      cart.addItem(TEST_PRODUCT_ID_1, 1, 10000);
      const savedCart = await repository.save(cart);

      // When - 상품 추가
      savedCart.addItem(TEST_PRODUCT_ID_2, 2, 5000);
      const updatedCart = await repository.save(savedCart);

      // Then
      expect(updatedCart.getId()).toBe(savedCart.getId());
      expect(updatedCart.getItems()).toHaveLength(2);
      expect(updatedCart.getTotalAmount()).toBe(20000); // 10000 + 10000
    });

    it("장바구니를 조회할 수 있다", async () => {
      // Given
      const cart = Cart.createForUser(TEST_USER_ID);
      cart.addItem(TEST_PRODUCT_ID_1, 3, 8000);
      const savedCart = await repository.save(cart);

      // When
      const foundCart = await repository.findById(savedCart.getId());

      // Then
      expect(foundCart).not.toBeNull();
      expect(foundCart!.getId()).toBe(savedCart.getId());
      expect(foundCart!.getUserId()).toBe(TEST_USER_ID);
      expect(foundCart!.getTotalAmount()).toBe(24000);
    });

    it("장바구니를 삭제할 수 있다", async () => {
      // Given
      const cart = Cart.createForSession(TEST_SESSION_ID);
      cart.addItem(TEST_PRODUCT_ID_1, 1, 5000);
      const savedCart = await repository.save(cart);

      // When
      await repository.delete(savedCart.getId());

      // Then
      const foundCart = await repository.findById(savedCart.getId());
      expect(foundCart).toBeNull();
    });
  });

  // ========================================
  // 2. 실무적 시나리오 테스트
  // ========================================
  describe("실무적 쇼핑몰 시나리오", () => {
    it("같은 상품을 여러 번 추가하면 수량이 증가한다 (일반적인 쇼핑몰 동작)", async () => {
      // Given
      const cart = Cart.createForUser(TEST_USER_ID);

      // When - 같은 상품을 3번 추가
      cart.addItem(TEST_PRODUCT_ID_1, 1, 12000); // 1개
      cart.addItem(TEST_PRODUCT_ID_1, 2, 12000); // +2개 = 3개
      cart.addItem(TEST_PRODUCT_ID_1, 1, 12000); // +1개 = 4개

      const savedCart = await repository.save(cart);

      // Then
      expect(savedCart.getItems()).toHaveLength(1); // 상품 종류는 1개
      expect(savedCart.getItemQuantity(TEST_PRODUCT_ID_1)).toBe(4); // 수량은 4개
      expect(savedCart.getTotalAmount()).toBe(48000); // 12000 * 4
    });

    it("비로그인 → 로그인 시 장바구니 이전 (실제 쇼핑몰 시나리오)", async () => {
      // Given - 비로그인 상태에서 장바구니에 상품 담기
      const sessionCart = Cart.createForSession(TEST_SESSION_ID);
      sessionCart.addItem(TEST_PRODUCT_ID_1, 2, 15000);
      sessionCart.addItem(TEST_PRODUCT_ID_2, 1, 8000);
      const savedSessionCart = await repository.save(sessionCart);

      // When - 로그인 후 장바구니 이전
      savedSessionCart.transferToUser(TEST_USER_ID);
      const transferredCart = await repository.save(savedSessionCart);

      // Then - 사용자 장바구니로 이전됨
      expect(transferredCart.getUserId()).toBe(TEST_USER_ID);
      expect(transferredCart.getSessionId()).toBeUndefined();
      expect(transferredCart.getItems()).toHaveLength(2);
      expect(transferredCart.getTotalAmount()).toBe(38000);

      // 원본 세션으로는 조회되지 않음
      const sessionResult = await repository.findBySessionId(TEST_SESSION_ID);
      expect(sessionResult).toBeNull();

      // 사용자 ID로는 조회됨
      const userResult = await repository.findByUserId(TEST_USER_ID);
      expect(userResult).not.toBeNull();
      expect(userResult!.getId()).toBe(transferredCart.getId());
    });

    it("장바구니 병합 시나리오 (로그인 시 기존 장바구니와 병합)", async () => {
      // Given - 기존 사용자 장바구니
      const userCart = Cart.createForUser(TEST_USER_ID);
      userCart.addItem(TEST_PRODUCT_ID_1, 1, 10000);
      await repository.save(userCart);

      // 세션 장바구니
      const sessionCart = Cart.createForSession(TEST_SESSION_ID);
      sessionCart.addItem(TEST_PRODUCT_ID_1, 2, 10000); // 중복 상품
      sessionCart.addItem(TEST_PRODUCT_ID_2, 1, 20000); // 새 상품
      await repository.save(sessionCart);

      // When - 장바구니 병합
      const existingCart = await repository.findByUserId(TEST_USER_ID);
      existingCart!.mergeWith(sessionCart);
      const mergedCart = await repository.save(existingCart!);

      // Then
      expect(mergedCart.getItems()).toHaveLength(2);
      expect(mergedCart.getItemQuantity(TEST_PRODUCT_ID_1)).toBe(3); // 1 + 2
      expect(mergedCart.getItemQuantity(TEST_PRODUCT_ID_2)).toBe(1);
      expect(mergedCart.getTotalAmount()).toBe(50000); // 30000 + 20000
    });

    it("상품 재고 부족 상황 처리 (현실적 시나리오)", async () => {
      // Given - 재고가 제한된 상황 시뮬레이션
      const lowStockProduct = TestUtils.createLowStockProduct(); // 재고 1개
      const outOfStockProduct = TestUtils.createOutOfStockProduct(); // 품절

      const cart = Cart.createForUser(TEST_USER_ID);

      // When - 재고보다 많은 수량 주문 시도 (실제로는 Use Case에서 검증)
      cart.addItem(lowStockProduct.id, 5, lowStockProduct.price); // 재고 1개인데 5개 주문
      cart.addItem(outOfStockProduct.id, 1, outOfStockProduct.price); // 품절 상품 주문

      // Repository는 저장만 담당 (비즈니스 로직은 Use Case에서)
      const savedCart = await repository.save(cart);

      // Then - Repository 레벨에서는 저장만 성공
      expect(savedCart.getItems()).toHaveLength(2);
      expect(savedCart.getItemQuantity(lowStockProduct.id)).toBe(5);
      expect(savedCart.getItemQuantity(outOfStockProduct.id)).toBe(1);
    });
  });

  // ========================================
  // 3. 성능 및 안정성 테스트
  // ========================================
  describe("성능 및 안정성", () => {
    it("대량 상품 장바구니 처리 (성능 테스트)", async () => {
      // Given - 대량 상품 (실제 대형 쇼핑몰 시나리오)
      const cart = Cart.createForUser(TEST_USER_ID);
      const products = TestUtils.createBulkProducts(20); // 20개 상품

      // When
      const start = Date.now();
      products.forEach((product, index) => {
        cart.addItem(product.id, index + 1, product.price);
      });
      const savedCart = await repository.save(cart);
      const processingTime = Date.now() - start;

      // Then
      expect(savedCart.getItems()).toHaveLength(20);
      expect(processingTime).toBeLessThan(2000); // 2초 이내
      expect(savedCart.getTotalItems()).toBe(210); // 1+2+...+20 = 210
    });

    it("동시 사용자 시나리오 (부하 테스트)", async () => {
      // Given - 여러 사용자가 동시에 장바구니 생성
      const users = TestUtils.createBulkUsers(10);
      const product = TestUtils.createTestProduct();

      // When - 동시 처리
      const start = Date.now();
      const promises = users.map(async (user) => {
        const cart = Cart.createForUser(user.id);
        cart.addItem(
          product.id,
          Math.floor(Math.random() * 5) + 1,
          product.price
        );
        return repository.save(cart);
      });

      const results = await Promise.all(promises);
      const processingTime = Date.now() - start;

      // Then
      expect(results).toHaveLength(10);
      expect(processingTime).toBeLessThan(3000); // 3초 이내
      results.forEach((cart) => {
        expect(cart.getItems()).toHaveLength(1);
        expect(TestUtils.isValidUUID(cart.getId())).toBe(true);
      });
    });

    it("데이터 무결성 검증 (CASCADE 삭제)", async () => {
      // Given
      const cart = Cart.createForUser(TEST_USER_ID);
      cart.addItem(TEST_PRODUCT_ID_1, 2, 10000);
      cart.addItem(TEST_PRODUCT_ID_2, 3, 15000);
      const savedCart = await repository.save(cart);

      // When - 장바구니 삭제
      await repository.delete(savedCart.getId());

      // Then - 관련 아이템들도 모두 삭제됨
      const itemCount = await TestDataSource.query(
        "SELECT COUNT(*) as count FROM cart_items WHERE cart_id = $1",
        [savedCart.getId()]
      );
      expect(parseInt(itemCount[0].count)).toBe(0);
    });
  });

  // ========================================
  // 4. 에러 처리 테스트
  // ========================================
  describe("에러 처리", () => {
    it("잘못된 UUID로 조회 시 null 반환", async () => {
      const result = await repository.findById("invalid-uuid");
      expect(result).toBeNull();
    });

    it("존재하지 않는 사용자 조회 시 null 반환", async () => {
      const result = await repository.findByUserId(TestUtils.generateUserId());
      expect(result).toBeNull();
    });

    it("존재하지 않는 세션 조회 시 null 반환", async () => {
      const result = await repository.findBySessionId("non-existent-session");
      expect(result).toBeNull();
    });

    it("존재하지 않는 장바구니 삭제 시 오류 없이 처리", async () => {
      await expect(
        repository.delete(TestUtils.generateCartId())
      ).resolves.not.toThrow();
    });
  });

  // ========================================
  // 5. 실무적 검증 테스트
  // ========================================
  describe("실무적 검증", () => {
    it("장바구니 저장 후 조회 시 데이터 일치", async () => {
      // Given
      const originalCart = Cart.createForUser(TEST_USER_ID);
      originalCart.addItem(TEST_PRODUCT_ID_1, 3, 12000);
      originalCart.addItem(TEST_PRODUCT_ID_2, 2, 8000);

      // When
      const savedCart = await repository.save(originalCart);
      const retrievedCart = await repository.findById(savedCart.getId());

      // Then - 모든 데이터가 정확히 일치
      expect(retrievedCart).not.toBeNull();
      expect(retrievedCart!.getId()).toBe(savedCart.getId());
      expect(retrievedCart!.getUserId()).toBe(TEST_USER_ID);
      expect(retrievedCart!.getItems()).toHaveLength(2);
      expect(retrievedCart!.getTotalItems()).toBe(5);
      expect(retrievedCart!.getTotalAmount()).toBe(52000);
    });

    it("사용자별 최신 장바구니 조회", async () => {
      // Given - 같은 사용자의 여러 장바구니
      const cart1 = Cart.createForUser(TEST_USER_ID);
      await repository.save(cart1);

      await TestUtils.delay(10); // 시간 차이 보장

      const cart2 = Cart.createForUser(TEST_USER_ID);
      cart2.addItem(TEST_PRODUCT_ID_1, 1, 5000);
      const savedCart2 = await repository.save(cart2);

      // When
      const latestCart = await repository.findByUserId(TEST_USER_ID);

      // Then - 가장 최근 장바구니 반환
      expect(latestCart).not.toBeNull();
      expect(latestCart!.getId()).toBe(savedCart2.getId());
      expect(latestCart!.getItems()).toHaveLength(1);
    });
  });
});
