// ========================================
// Cart Entity TDD 테스트 코드
// cart-service/src/entities/__tests__/Cart.test.ts
// ========================================

import { Cart } from "../Cart";
import { CartItem } from "../CartItem";

describe("Cart Entity", () => {
  // ========================================
  // 장바구니 생성 테스트
  // ========================================

  describe("Cart 생성", () => {
    it("비로그인 사용자용 빈 장바구니를 생성할 수 있어야 한다", () => {
      // Given
      const sessionId = "session-123";

      // When
      const cart = Cart.createForSession(sessionId);

      // Then
      expect(cart.getSessionId()).toBe(sessionId);
      expect(cart.getUserId()).toBeUndefined();
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalItems()).toBe(0);
      expect(cart.getTotalAmount()).toBe(0);
      expect(cart.isEmpty()).toBe(true);
      expect(cart.getCreatedAt()).toBeInstanceOf(Date);
    });

    it("로그인 사용자용 빈 장바구니를 생성할 수 있어야 한다", () => {
      // Given
      const userId = "user-123";

      // When
      const cart = Cart.createForUser(userId);

      // Then
      expect(cart.getUserId()).toBe(userId);
      expect(cart.getSessionId()).toBeUndefined();
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.isEmpty()).toBe(true);
    });

    it("userId와 sessionId가 모두 없으면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => {
        new Cart({
          userId: undefined,
          sessionId: undefined,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }).toThrow("userId 또는 sessionId 중 하나는 반드시 있어야 합니다");
    });
  });

  // ========================================
  // 상품 추가 테스트 (핵심 도메인 로직)
  // ========================================

  describe("상품 추가", () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.createForSession("session-123");
    });

    it("새로운 상품을 장바구니에 추가할 수 있어야 한다", () => {
      // Given
      const productId = "product-1";
      const quantity = 2;
      const price = 1000;

      // When
      cart.addItem(productId, quantity, price);

      // Then
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalItems()).toBe(2);
      expect(cart.getTotalAmount()).toBe(2000);
      expect(cart.isEmpty()).toBe(false);

      const item = cart.getItems()[0];
      expect(item.getProductId()).toBe(productId);
      expect(item.getQuantity()).toBe(quantity);
      expect(item.getPrice()).toBe(price);
    });

    it("같은 상품을 다시 추가하면 수량이 증가해야 한다", () => {
      // Given
      const productId = "product-1";
      cart.addItem(productId, 2, 1000);

      // When - 같은 상품 3개 더 추가
      cart.addItem(productId, 3, 1000);

      // Then
      expect(cart.getItems()).toHaveLength(1); // 아이템 개수는 1개 (같은 상품)
      expect(cart.getTotalItems()).toBe(5); // 총 수량은 5개
      expect(cart.getTotalAmount()).toBe(5000);

      const item = cart.getItems()[0];
      expect(item.getQuantity()).toBe(5);
    });

    it("다른 상품들을 추가할 수 있어야 한다", () => {
      // Given & When
      cart.addItem("product-1", 2, 1000);
      cart.addItem("product-2", 1, 2000);
      cart.addItem("product-3", 3, 500);

      // Then
      expect(cart.getItems()).toHaveLength(3);
      expect(cart.getTotalItems()).toBe(6); // 2 + 1 + 3
      expect(cart.getTotalAmount()).toBe(5500); // 2000 + 2000 + 1500
    });

    it("수량이 0 이하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cart.addItem("product-1", 0, 1000)).toThrow(
        "수량은 1 이상이어야 합니다"
      );

      expect(() => cart.addItem("product-1", -1, 1000)).toThrow(
        "수량은 1 이상이어야 합니다"
      );
    });

    it("가격이 0 이하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cart.addItem("product-1", 1, 0)).toThrow(
        "가격은 0보다 커야 합니다"
      );

      expect(() => cart.addItem("product-1", 1, -100)).toThrow(
        "가격은 0보다 커야 합니다"
      );
    });

    it("productId가 비어있으면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cart.addItem("", 1, 1000)).toThrow("상품 ID는 필수입니다");

      expect(() => cart.addItem("   ", 1, 1000)).toThrow(
        "상품 ID는 필수입니다"
      );
    });
  });

  // ========================================
  // 상품 제거 테스트
  // ========================================

  describe("상품 제거", () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.createForSession("session-123");
      cart.addItem("product-1", 2, 1000);
      cart.addItem("product-2", 1, 2000);
    });

    it("장바구니에서 상품을 제거할 수 있어야 한다", () => {
      // When
      cart.removeItem("product-1");

      // Then
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalItems()).toBe(1);
      expect(cart.getTotalAmount()).toBe(2000);

      const remainingItem = cart.getItems()[0];
      expect(remainingItem.getProductId()).toBe("product-2");
    });

    it("존재하지 않는 상품 제거 시 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cart.removeItem("non-existent-product")).toThrow(
        "해당 상품이 장바구니에 없습니다"
      );
    });

    it("모든 상품을 제거하면 빈 장바구니가 되어야 한다", () => {
      // When
      cart.removeItem("product-1");
      cart.removeItem("product-2");

      // Then
      expect(cart.isEmpty()).toBe(true);
      expect(cart.getTotalItems()).toBe(0);
      expect(cart.getTotalAmount()).toBe(0);
    });
  });

  // ========================================
  // 수량 변경 테스트
  // ========================================

  describe("수량 변경", () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.createForSession("session-123");
      cart.addItem("product-1", 2, 1000);
    });

    it("상품 수량을 변경할 수 있어야 한다", () => {
      // When
      cart.updateItemQuantity("product-1", 5);

      // Then
      expect(cart.getTotalItems()).toBe(5);
      expect(cart.getTotalAmount()).toBe(5000);

      const item = cart.getItems()[0];
      expect(item.getQuantity()).toBe(5);
    });

    it("수량을 0으로 변경하면 상품이 제거되어야 한다", () => {
      // When
      cart.updateItemQuantity("product-1", 0);

      // Then
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.isEmpty()).toBe(true);
    });

    it("존재하지 않는 상품의 수량 변경 시 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cart.updateItemQuantity("non-existent-product", 5)).toThrow(
        "해당 상품이 장바구니에 없습니다"
      );
    });

    it("음수 수량으로 변경 시 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cart.updateItemQuantity("product-1", -1)).toThrow(
        "수량은 0 이상이어야 합니다"
      );
    });
  });

  // ========================================
  // 장바구니 이전 테스트 (로그인 시)
  // ========================================

  describe("장바구니 이전 (sessionId → userId)", () => {
    let sessionCart: Cart;

    beforeEach(() => {
      sessionCart = Cart.createForSession("session-123");
      sessionCart.addItem("product-1", 2, 1000);
      sessionCart.addItem("product-2", 1, 2000);
    });

    it("세션 장바구니를 사용자 장바구니로 이전할 수 있어야 한다", () => {
      // Given
      const userId = "user-123";

      // When
      sessionCart.transferToUser(userId);

      // Then
      expect(sessionCart.getUserId()).toBe(userId);
      expect(sessionCart.getSessionId()).toBeUndefined();
      expect(sessionCart.getItems()).toHaveLength(2); // 기존 아이템들 유지
      expect(sessionCart.getTotalItems()).toBe(3);
      expect(sessionCart.getTotalAmount()).toBe(4000);
    });

    it("이미 사용자 장바구니인 경우 에러를 발생시켜야 한다", () => {
      // Given
      const userCart = Cart.createForUser("user-123");

      // When & Then
      expect(() => userCart.transferToUser("user-456")).toThrow(
        "이미 사용자 장바구니입니다"
      );
    });

    it("빈 userId로 이전 시 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => sessionCart.transferToUser("")).toThrow(
        "사용자 ID는 필수입니다"
      );
    });
  });

  // ========================================
  // 장바구니 병합 테스트
  // ========================================

  describe("장바구니 병합", () => {
    let userCart: Cart;
    let sessionCart: Cart;

    beforeEach(() => {
      userCart = Cart.createForUser("user-123");
      userCart.addItem("product-1", 2, 1000); // 기존 상품
      userCart.addItem("product-2", 1, 2000);

      sessionCart = Cart.createForSession("session-123");
      sessionCart.addItem("product-1", 3, 1000); // 중복 상품
      sessionCart.addItem("product-3", 2, 1500); // 새로운 상품
    });

    it("다른 장바구니와 병합할 수 있어야 한다", () => {
      // When
      userCart.mergeWith(sessionCart);

      // Then
      expect(userCart.getItems()).toHaveLength(3);
      expect(userCart.getTotalItems()).toBe(8); // 5 + 3 (product-1: 2→5, product-2: 1, product-3: 2)
      expect(userCart.getTotalAmount()).toBe(10000); // 5000 + 2000 + 3000

      // 중복 상품 수량 증가 확인
      const product1Item = userCart.findItem("product-1");
      expect(product1Item?.getQuantity()).toBe(5); // 2 + 3

      // 새로운 상품 추가 확인
      const product3Item = userCart.findItem("product-3");
      expect(product3Item?.getQuantity()).toBe(2);
    });

    it("빈 장바구니와 병합해도 변화가 없어야 한다", () => {
      // Given
      const emptyCart = Cart.createForSession("empty-session");

      // When
      userCart.mergeWith(emptyCart);

      // Then
      expect(userCart.getItems()).toHaveLength(2);
      expect(userCart.getTotalItems()).toBe(3);
      expect(userCart.getTotalAmount()).toBe(4000);
    });
  });

  // ========================================
  // 장바구니 비우기 테스트
  // ========================================

  describe("장바구니 비우기", () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.createForSession("session-123");
      cart.addItem("product-1", 2, 1000);
      cart.addItem("product-2", 1, 2000);
    });

    it("장바구니를 비울 수 있어야 한다", () => {
      // When
      cart.clear();

      // Then
      expect(cart.isEmpty()).toBe(true);
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalItems()).toBe(0);
      expect(cart.getTotalAmount()).toBe(0);
    });

    it("이미 빈 장바구니를 비워도 문제없어야 한다", () => {
      // Given
      const emptyCart = Cart.createForSession("session-123");

      // When
      emptyCart.clear();

      // Then
      expect(emptyCart.isEmpty()).toBe(true);
      expect(emptyCart.getItems()).toHaveLength(0);
    });
  });

  // ========================================
  // 도메인 규칙 테스트
  // ========================================

  describe("도메인 규칙", () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.createForSession("session-123");
    });

    it("특정 상품이 장바구니에 있는지 확인할 수 있어야 한다", () => {
      // Given
      cart.addItem("product-1", 2, 1000);

      // When & Then
      expect(cart.hasItem("product-1")).toBe(true);
      expect(cart.hasItem("product-2")).toBe(false);
    });

    it("특정 상품의 수량을 조회할 수 있어야 한다", () => {
      // Given
      cart.addItem("product-1", 5, 1000);

      // When & Then
      expect(cart.getItemQuantity("product-1")).toBe(5);
      expect(cart.getItemQuantity("non-existent")).toBe(0);
    });

    it("장바구니 총 상품 종류 수를 조회할 수 있어야 한다", () => {
      // Given
      cart.addItem("product-1", 5, 1000);
      cart.addItem("product-2", 2, 2000);
      cart.addItem("product-3", 1, 500);

      // When & Then
      expect(cart.getUniqueItemCount()).toBe(3); // 3가지 상품
      expect(cart.getTotalItems()).toBe(8); // 총 8개
    });

    it("장바구니가 비어있는지 확인할 수 있어야 한다", () => {
      // When & Then
      expect(cart.isEmpty()).toBe(true);

      // Given
      cart.addItem("product-1", 1, 1000);

      // When & Then
      expect(cart.isEmpty()).toBe(false);
    });
  });

  // ========================================
  // 업데이트 시간 테스트
  // ========================================

  describe("업데이트 시간", () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.createForSession("session-123");
    });

    it("상품 추가 시 업데이트 시간이 변경되어야 한다", async () => {
      // Given
      const initialUpdatedAt = cart.getUpdatedAt();

      // 시간 차이를 위한 대기
      await new Promise((resolve) => setTimeout(resolve, 10));

      // When
      cart.addItem("product-1", 1, 1000);

      // Then
      expect(cart.getUpdatedAt().getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });

    it("상품 제거 시 업데이트 시간이 변경되어야 한다", async () => {
      // Given
      cart.addItem("product-1", 1, 1000);
      const initialUpdatedAt = cart.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // When
      cart.removeItem("product-1");

      // Then
      expect(cart.getUpdatedAt().getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });
  });
});
