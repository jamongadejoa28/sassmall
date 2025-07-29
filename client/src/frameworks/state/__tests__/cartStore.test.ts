// ========================================
// cartStoreLocal 테스트 (localStorage 기반)
// ========================================

import { renderHook, act } from '@testing-library/react';
import { useCartLocalStore } from '../cartStoreLocal';
import { CartProduct } from '../../../types/cart-type/CartProduct';

// Mock 상품 데이터
const mockProduct1: CartProduct = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'MacBook Pro 16-inch M3 Pro',
  description: 'Apple의 최신 M3 Pro 칩을 탑재한 고성능 노트북',
  price: 2999000,
  sku: 'MBP16-M3PRO-18-512',
  brand: 'Apple',
  category: {
    id: '550e8400-e29b-41d4-a716-446655440111',
    name: '노트북',
    slug: 'laptop',
  },
  inventory: {
    availableQuantity: 10,
    status: 'in_stock',
    location: 'MAIN_WAREHOUSE',
  },
  image_urls: [],
  rating: 4.5,
  review_count: 128,
  is_featured: true,
  min_order_quantity: 1,
  max_order_quantity: 10,
  tags: ['laptop', 'computer'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockProduct2: CartProduct = {
  id: '660e8400-e29b-41d4-a716-446655440002',
  name: 'iPhone 15 Pro Max',
  description: '최신 A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰',
  price: 1550000,
  sku: 'IP15PM-256-NT',
  brand: 'Apple',
  category: {
    id: '550e8400-e29b-41d4-a716-446655440122',
    name: '스마트폰',
    slug: 'smartphone',
  },
  inventory: {
    availableQuantity: 5,
    status: 'in_stock',
    location: 'MAIN_WAREHOUSE',
  },
  image_urls: [],
  rating: 4.8,
  review_count: 256,
  is_featured: false,
  min_order_quantity: 1,
  max_order_quantity: 5,
  tags: ['smartphone', 'apple'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('CartStoreLocal', () => {
  beforeEach(() => {
    // 각 테스트 전에 localStorage 클리어
    localStorage.clear();
    // Zustand 스토어의 상태를 초기 상태로 강제로 리셋
    act(() => {
      useCartLocalStore.setState(useCartLocalStore.getInitialState(), true);
    });
  });

  describe('초기 상태', () => {
    it('빈 장바구니로 시작해야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      expect(result.current.items).toEqual([]);
      expect(result.current.getTotalQuantity()).toBe(0);
      expect(result.current.getTotalPrice()).toBe(0);
      expect(result.current.isEmpty()).toBe(true);
    });
  });

  describe('상품 추가', () => {
    it('새로운 상품을 추가할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe(mockProduct1.id);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.getTotalQuantity()).toBe(2);
      expect(result.current.getTotalPrice()).toBe(5998000);
    });

    it('같은 상품을 추가하면 수량이 증가해야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct1, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.getTotalQuantity()).toBe(3);
      expect(result.current.getTotalPrice()).toBe(8997000);
    });

    it('다른 상품을 추가하면 새로운 아이템으로 추가되어야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct2, 2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.getTotalQuantity()).toBe(3);
      expect(result.current.getTotalPrice()).toBe(6099000);
    });
  });

  describe('상품 제거', () => {
    it('상품을 제거할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct2, 1);
      });

      act(() => {
        result.current.removeItem(mockProduct1.id);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe(mockProduct2.id);
    });
  });

  describe('수량 변경', () => {
    it('상품 수량을 변경할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      act(() => {
        result.current.updateQuantity(mockProduct1.id, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.getTotalQuantity()).toBe(5);
    });

    it('수량을 0으로 변경하면 상품이 제거되어야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      act(() => {
        result.current.updateQuantity(mockProduct1.id, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('장바구니 비우기', () => {
    it('장바구니를 비울 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct2, 1);
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.getTotalQuantity()).toBe(0);
      expect(result.current.isEmpty()).toBe(true);
    });
  });

  describe('Getter 메서드', () => {
    // 이제 beforeEach에서 renderHook을 호출하지 않습니다.
    // 각 테스트 케이스 안에서 필요한 상태를 설정합니다.

    it('hasItem이 올바르게 동작해야 한다 (아이템 있음)', () => {
      const { result } = renderHook(() => useCartLocalStore());
      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.hasItem(mockProduct1.id)).toBe(true);
    });

    it('hasItem이 올바르게 동작해야 한다 (아이템 없음)', () => {
      const { result } = renderHook(() => useCartLocalStore());
      // 이 테스트는 빈 장바구니에서 시작하므로 별도의 addItem이 필요 없습니다.
      expect(result.current.hasItem('non-existent-id')).toBe(false);
    });

    it('getItem이 올바르게 동작해야 한다', () => {
      const { result } = renderHook(() => useCartLocalStore());
      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      const item = result.current.getItem(mockProduct1.id);
      expect(item?.product.id).toBe(mockProduct1.id);
      expect(item?.quantity).toBe(2);
    });

    it('getItemQuantity가 올바르게 동작해야 한다 (아이템 있음)', () => {
      const { result } = renderHook(() => useCartLocalStore());
      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.getItemQuantity(mockProduct1.id)).toBe(2);
    });

    it('getItemQuantity가 올바르게 동작해야 한다 (아이템 없음)', () => {
      const { result } = renderHook(() => useCartLocalStore());
      // 이 테스트는 빈 장바구니에서 시작하므로 별도의 addItem이 필요 없습니다.
      expect(result.current.getItemQuantity('non-existent-id')).toBe(0);
    });
  });
});
