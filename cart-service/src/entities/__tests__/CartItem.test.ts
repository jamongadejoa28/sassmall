// ========================================
// CartItem Entity TDD 테스트 코드
// cart-service/src/entities/__tests__/CartItem.test.ts
// ========================================

import { CartItem } from "../CartItem";

describe("CartItem Entity", () => {
  // ========================================
  // CartItem 생성 테스트
  // ========================================

  describe("CartItem 생성", () => {
    it("유효한 데이터로 CartItem을 생성할 수 있어야 한다", () => {
      // Given
      const cartItemData = {
        cartId: "cart-123",
        productId: "product-1",
        quantity: 2,
        price: 1000,
        addedAt: new Date(),
      };

      // When
      const cartItem = new CartItem(cartItemData);

      // Then
      expect(cartItem.getCartId()).toBe("cart-123");
      expect(cartItem.getProductId()).toBe("product-1");
      expect(cartItem.getQuantity()).toBe(2);
      expect(cartItem.getPrice()).toBe(1000);
      expect(cartItem.getSubtotal()).toBe(2000);
      expect(cartItem.getAddedAt()).toBeInstanceOf(Date);
    });

    it("cartId가 비어있으면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => {
        new CartItem({
          cartId: "",
          productId: "product-1",
          quantity: 1,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("장바구니 ID는 필수입니다");

      expect(() => {
        new CartItem({
          cartId: "   ",
          productId: "product-1",
          quantity: 1,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("장바구니 ID는 필수입니다");
    });

    it("productId가 비어있으면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => {
        new CartItem({
          cartId: "cart-123",
          productId: "",
          quantity: 1,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("상품 ID는 필수입니다");
    });

    it("수량이 0 이하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => {
        new CartItem({
          cartId: "cart-123",
          productId: "product-1",
          quantity: 0,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("수량은 1 이상이어야 합니다");

      expect(() => {
        new CartItem({
          cartId: "cart-123",
          productId: "product-1",
          quantity: -1,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("수량은 1 이상이어야 합니다");
    });

    it("가격이 0 이하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => {
        new CartItem({
          cartId: "cart-123",
          productId: "product-1",
          quantity: 1,
          price: 0,
          addedAt: new Date(),
        });
      }).toThrow("가격은 0보다 커야 합니다");

      expect(() => {
        new CartItem({
          cartId: "cart-123",
          productId: "product-1",
          quantity: 1,
          price: -500,
          addedAt: new Date(),
        });
      }).toThrow("가격은 0보다 커야 합니다");
    });
  });

  // ========================================
  // 수량 변경 테스트
  // ========================================

  describe("수량 변경", () => {
    let cartItem: CartItem;

    beforeEach(() => {
      cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 2,
        price: 1000,
        addedAt: new Date(),
      });
    });

    it("수량을 변경할 수 있어야 한다", () => {
      // When
      cartItem.updateQuantity(5);

      // Then
      expect(cartItem.getQuantity()).toBe(5);
      expect(cartItem.getSubtotal()).toBe(5000);
    });

    it("수량을 1로 변경할 수 있어야 한다", () => {
      // When
      cartItem.updateQuantity(1);

      // Then
      expect(cartItem.getQuantity()).toBe(1);
      expect(cartItem.getSubtotal()).toBe(1000);
    });

    it("수량을 0으로 변경하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cartItem.updateQuantity(0)).toThrow(
        "수량은 1 이상이어야 합니다"
      );
    });

    it("음수 수량으로 변경하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cartItem.updateQuantity(-1)).toThrow(
        "수량은 1 이상이어야 합니다"
      );
    });

    it("소수점 수량을 정수로 변환해야 한다", () => {
      // When
      cartItem.updateQuantity(3.7);

      // Then
      expect(cartItem.getQuantity()).toBe(3); // 소수점 버림
      expect(cartItem.getSubtotal()).toBe(3000);
    });
  });

  // ========================================
  // 수량 증가 테스트 (장바구니 병합용)
  // ========================================

  describe("수량 증가", () => {
    let cartItem: CartItem;

    beforeEach(() => {
      cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 2,
        price: 1000,
        addedAt: new Date(),
      });
    });

    it("기존 수량에 추가 수량을 더할 수 있어야 한다", () => {
      // When
      cartItem.increaseQuantity(3);

      // Then
      expect(cartItem.getQuantity()).toBe(5); // 2 + 3
      expect(cartItem.getSubtotal()).toBe(5000);
    });

    it("1씩 여러 번 증가시킬 수 있어야 한다", () => {
      // When
      cartItem.increaseQuantity(1);
      cartItem.increaseQuantity(1);
      cartItem.increaseQuantity(1);

      // Then
      expect(cartItem.getQuantity()).toBe(5); // 2 + 1 + 1 + 1
    });

    it("0으로 증가하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cartItem.increaseQuantity(0)).toThrow(
        "추가 수량은 0보다 커야 합니다"
      );
    });

    it("음수로 증가하면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => cartItem.increaseQuantity(-1)).toThrow(
        "추가 수량은 0보다 커야 합니다"
      );
    });

    it("소수점 증가량을 정수로 변환해야 한다", () => {
      // When
      cartItem.increaseQuantity(2.9);

      // Then
      expect(cartItem.getQuantity()).toBe(4); // 2 + 2 (소수점 버림)
    });
  });

  // ========================================
  // 가격 계산 테스트
  // ========================================

  describe("가격 계산", () => {
    it("소계를 정확히 계산해야 한다", () => {
      // Given
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 3,
        price: 1500,
        addedAt: new Date(),
      });

      // When & Then
      expect(cartItem.getSubtotal()).toBe(4500); // 3 * 1500
    });

    it("높은 가격 상품의 소계를 계산해야 한다", () => {
      // Given
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "expensive-product",
        quantity: 2,
        price: 1999999, // 약 200만원
        addedAt: new Date(),
      });

      // When & Then
      expect(cartItem.getSubtotal()).toBe(3999998); // 2 * 1999999
    });

    it("소수점 가격도 정확히 계산해야 한다", () => {
      // Given
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 4,
        price: 1250.5,
        addedAt: new Date(),
      });

      // When & Then
      expect(cartItem.getSubtotal()).toBe(5002); // 4 * 1250.5 = 5002
    });
  });

  // ========================================
  // 도메인 규칙 테스트
  // ========================================

  describe("도메인 규칙", () => {
    let cartItem: CartItem;

    beforeEach(() => {
      cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 3,
        price: 2000,
        addedAt: new Date(),
      });
    });

    it("수량이 유효한지 확인할 수 있어야 한다", () => {
      // When & Then
      expect(cartItem.isValidQuantity()).toBe(true);

      // 수량 변경 후
      cartItem.updateQuantity(10);
      expect(cartItem.isValidQuantity()).toBe(true);
    });

    it("같은 상품인지 확인할 수 있어야 한다", () => {
      // When & Then
      expect(cartItem.isSameProduct("product-1")).toBe(true);
      expect(cartItem.isSameProduct("product-2")).toBe(false);
      expect(cartItem.isSameProduct("")).toBe(false);
    });

    it("상품 정보를 요약할 수 있어야 한다", () => {
      // When
      const summary = cartItem.getSummary();

      // Then
      expect(summary).toEqual({
        productId: "product-1",
        quantity: 3,
        price: 2000,
        subtotal: 6000,
      });
    });

    it("최대 수량 제한을 확인할 수 있어야 한다", () => {
      // Given
      const maxQuantity = 999;

      // When & Then
      expect(cartItem.isQuantityWithinLimit(maxQuantity)).toBe(true);
      expect(cartItem.isQuantityWithinLimit(2)).toBe(false); // 현재 수량 3 > 제한 2
    });
  });

  // ========================================
  // 데이터 변환 테스트
  // ========================================

  describe("데이터 변환", () => {
    let cartItem: CartItem;
    let addedAt: Date;

    beforeEach(() => {
      addedAt = new Date("2024-01-15T10:30:00Z");
      cartItem = new CartItem({
        id: "item-123",
        cartId: "cart-123",
        productId: "product-1",
        quantity: 2,
        price: 1500,
        addedAt,
      });
    });

    it("JSON으로 직렬화할 수 있어야 한다", () => {
      // When
      const json = cartItem.toJSON();

      // Then
      expect(json).toEqual({
        id: "item-123",
        cartId: "cart-123",
        productId: "product-1",
        quantity: 2,
        price: 1500,
        subtotal: 3000,
        addedAt,
      });
    });

    it("업데이트 가능한 필드만 추출할 수 있어야 한다", () => {
      // When
      const updateData = cartItem.getUpdateData();

      // Then
      expect(updateData).toEqual({
        quantity: 2,
        // price와 addedAt은 업데이트 불가
      });
    });
  });

  // ========================================
  // 에러 처리 및 엣지 케이스
  // ========================================

  describe("에러 처리", () => {
    it("생성자에 null/undefined 값이 들어오면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => {
        new CartItem({
          cartId: "cart-123",
          productId: null as any,
          quantity: 1,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("상품 ID는 필수입니다");

      expect(() => {
        new CartItem({
          cartId: undefined as any,
          productId: "product-1",
          quantity: 1,
          price: 1000,
          addedAt: new Date(),
        });
      }).toThrow("장바구니 ID는 필수입니다");
    });

    it("매우 큰 수량에도 올바르게 동작해야 한다", () => {
      // Given
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 1,
        price: 1000,
        addedAt: new Date(),
      });

      // When
      cartItem.updateQuantity(999999);

      // Then
      expect(cartItem.getQuantity()).toBe(999999);
      expect(cartItem.getSubtotal()).toBe(999999000);
    });

    it("매우 높은 가격에도 올바르게 동작해야 한다", () => {
      // Given
      const highPrice = 9999999; // 약 천만원

      // When
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "luxury-product",
        quantity: 2,
        price: highPrice,
        addedAt: new Date(),
      });

      // Then
      expect(cartItem.getPrice()).toBe(highPrice);
      expect(cartItem.getSubtotal()).toBe(highPrice * 2);
    });
  });

  // ========================================
  // 시간 관련 테스트
  // ========================================

  describe("시간 관련", () => {
    it("추가된 시간을 올바르게 반환해야 한다", () => {
      // Given
      const specificTime = new Date("2024-06-18T12:00:00Z");

      // When
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 1,
        price: 1000,
        addedAt: specificTime,
      });

      // Then
      expect(cartItem.getAddedAt()).toEqual(specificTime);
      expect(cartItem.getAddedAt()).toBeInstanceOf(Date);
    });

    it("생성 시간과 현재 시간 차이를 계산할 수 있어야 한다", () => {
      // Given
      const pastTime = new Date(Date.now() - 60000); // 1분 전
      const cartItem = new CartItem({
        cartId: "cart-123",
        productId: "product-1",
        quantity: 1,
        price: 1000,
        addedAt: pastTime,
      });

      // When
      const ageInMs = cartItem.getAgeInMilliseconds();

      // Then
      expect(ageInMs).toBeGreaterThan(50000); // 50초 이상
      expect(ageInMs).toBeLessThan(70000); // 70초 이하
    });
  });
});
