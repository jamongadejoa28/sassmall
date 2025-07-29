// ========================================
// cartStore - 기본 장바구니 상태 관리 (동기 버전)
// client/src/frameworks/state/cartStore.ts
// ========================================

import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';
import { CartProduct } from '../../types/cart-type/CartProduct';

// ========================================
// Types & Interfaces
// ========================================

export interface CartItem {
  product: CartProduct;
  quantity: number;
  addedAt: Date;
}

export interface CartState {
  // State
  items: CartItem[];

  // Actions
  addItem: (product: CartProduct, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Getters
  getTotalQuantity: () => number;
  getTotalPrice: () => number;
  getItemCount: () => number;
  isEmpty: () => boolean;
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

// ========================================
// 유효성 검증 함수들
// ========================================

function validateProduct(product: CartProduct): void {
  if (!product) {
    throw new Error('상품 정보가 필요합니다');
  }
  if (!product.id || !product.name) {
    throw new Error('올바르지 않은 상품 정보입니다');
  }
  if (product.price <= 0) {
    throw new Error('올바르지 않은 상품 가격입니다');
  }
  if (
    product.inventory.status === 'out_of_stock' ||
    product.inventory.availableQuantity <= 0
  ) {
    throw new Error('품절된 상품입니다');
  }
}

function validateQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('수량은 1 이상이어야 합니다');
  }
  if (!Number.isInteger(quantity)) {
    throw new Error('수량은 정수여야 합니다');
  }
}

function validateStock(
  product: CartProduct,
  requestedQuantity: number,
  currentCartQuantity: number = 0
): void {
  const totalRequested = requestedQuantity + currentCartQuantity;
  if (totalRequested > product.inventory.availableQuantity) {
    throw new Error('재고가 부족합니다');
  }
}

// ========================================
// 기본 장바구니 Store (동기 버전)
// ========================================

export const useCartStore = createWithEqualityFn<CartState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      items: [],

      // ========================================
      // Actions (동기적)
      // ========================================

      addItem: (product, quantity) => {
        try {
          validateProduct(product);
          validateQuantity(quantity);

          const currentItems = get().items;
          const existingItemIndex = currentItems.findIndex(
            item => item.product.id === product.id
          );

          if (existingItemIndex >= 0) {
            const existingItem = currentItems[existingItemIndex];
            const newQuantity = existingItem.quantity + quantity;
            validateStock(product, quantity, existingItem.quantity);

            const updatedItems = [...currentItems];
            updatedItems[existingItemIndex] = {
              ...existingItem,
              quantity: newQuantity,
            };
            set({ items: updatedItems });
          } else {
            validateStock(product, quantity);
            const newItem: CartItem = {
              product,
              quantity,
              addedAt: new Date(),
            };
            set({ items: [...currentItems, newItem] });
          }
        } catch (error) {
          console.error('장바구니 추가 실패:', error);
          throw error;
        }
      },

      removeItem: productId => {
        set(state => ({
          items: state.items.filter(item => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        try {
          validateQuantity(quantity);
          const itemToUpdate = get().items.find(
            item => item.product.id === productId
          );
          if (itemToUpdate) {
            validateStock(itemToUpdate.product, quantity);
          }

          set(state => ({
            items: state.items.map(item =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
          }));
        } catch (error) {
          console.error('수량 변경 실패:', error);
          throw error;
        }
      },

      clearCart: () => {
        set({ items: [] });
      },

      // ========================================
      // Getters (동기적 메서드)
      // ========================================

      getTotalQuantity: () => {
        const items = get().items;
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        const items = get().items;
        return items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
      },

      getItemCount: () => get().items.length,
      isEmpty: () => get().items.length === 0,
      getItem: productId =>
        get().items.find(item => item.product.id === productId),
      hasItem: productId =>
        get().items.some(item => item.product.id === productId),
      getItemQuantity: productId => {
        const item = get().items.find(item => item.product.id === productId);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'cart-storage',
      partialize: state => ({
        items: state.items,
      }),
    }
  ),
  Object.is
);

// ========================================
// 최적화된 Individual Hooks (shallow 사용)
// ========================================

// 단일 값 selector들 (shallow 불필요)
export const useCartTotalQuantity = () =>
  useCartStore(state => state.getTotalQuantity());

export const useCartTotalPrice = () =>
  useCartStore(state => state.getTotalPrice());

export const useCartItemCount = () =>
  useCartStore(state => state.getItemCount());

export const useCartEmpty = () => useCartStore(state => state.isEmpty());

// 객체 반환 hooks (shallow 적용으로 무한 리렌더링 방지)
export const useCartActions = () => {
  return useCartStore(
    state => ({
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateQuantity: state.updateQuantity,
      clearCart: state.clearCart,
    }),
    shallow
  );
};

export const useCartItem = (productId: string) => {
  return useCartStore(state => {
    const item = state.items.find(item => item.product.id === productId);
    return {
      item,
      quantity: item ? item.quantity : 0,
      hasItem: !!item,
    };
  }, shallow);
};

export const useCartSummary = () => {
  return useCartStore(
    state => ({
      totalQuantity: state.getTotalQuantity(),
      totalPrice: state.getTotalPrice(),
      itemCount: state.getItemCount(),
      isEmpty: state.isEmpty(),
    }),
    shallow
  );
};
