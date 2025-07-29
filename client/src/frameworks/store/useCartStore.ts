// ========================================
// 장바구니 전역 상태 관리 - Zustand Store
// client/src/frameworks/store/useCartStore.ts
// ========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 장바구니 아이템 타입 (임시 - 추후 entities에서 import)
 */
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxQuantity: number;
  sku: string;
  totalPrice: number;
}

/**
 * 장바구니 상태 인터페이스
 */
interface CartState {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
}

/**
 * 장바구니 액션 인터페이스
 */
interface CartActions {
  // 아이템 관리
  addItem: (product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    availableQuantity: number;
    sku: string;
  }) => void;
  removeItem: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  increaseItemQuantity: (productId: string) => void;
  decreaseItemQuantity: (productId: string) => void;
  clearCart: () => void;

  // UI 상태 관리
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // 유틸리티
  getItemQuantity: (productId: string) => number;
  hasItem: (productId: string) => boolean;
  isEmpty: () => boolean;
}

/**
 * 장바구니 Store 타입
 */
type CartStore = CartState & CartActions;

/**
 * 전체 아이템 수량 계산
 */
function calculateTotalItems(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

/**
 * 전체 가격 계산
 */
function calculateTotalPrice(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.totalPrice, 0);
}

/**
 * 장바구니 아이템 생성
 */
function createCartItem(params: {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxQuantity: number;
  sku: string;
}): CartItem {
  return {
    ...params,
    totalPrice: params.price * params.quantity,
  };
}

/**
 * 장바구니 전역 상태 관리 Store
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ========================================
      // Initial State
      // ========================================
      items: [],
      isOpen: false,
      totalItems: 0,
      totalPrice: 0,

      // ========================================
      // Item Management Actions
      // ========================================

      /**
       * 장바구니에 상품 추가
       */
      addItem: product => {
        set(state => {
          const existingItemIndex = state.items.findIndex(
            item => item.productId === product.id
          );

          let newItems: CartItem[];

          if (existingItemIndex >= 0) {
            // 기존 아이템 수량 증가
            const existingItem = state.items[existingItemIndex];
            if (existingItem.quantity >= product.availableQuantity) {
              console.error('재고가 부족합니다.');
              return state;
            }

            const updatedItem = {
              ...existingItem,
              quantity: existingItem.quantity + 1,
              totalPrice: existingItem.price * (existingItem.quantity + 1),
            };

            newItems = [
              ...state.items.slice(0, existingItemIndex),
              updatedItem,
              ...state.items.slice(existingItemIndex + 1),
            ];
          } else {
            // 새 아이템 추가
            const newItem = createCartItem({
              id: `cart_${product.id}_${Date.now()}`,
              productId: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              quantity: 1,
              maxQuantity: product.availableQuantity,
              sku: product.sku,
            });
            newItems = [...state.items, newItem];
          }

          return {
            ...state,
            items: newItems,
            totalItems: calculateTotalItems(newItems),
            totalPrice: calculateTotalPrice(newItems),
          };
        });
      },

      /**
       * 장바구니에서 상품 제거
       */
      removeItem: productId => {
        set(state => {
          const newItems = state.items.filter(
            item => item.productId !== productId
          );

          return {
            ...state,
            items: newItems,
            totalItems: calculateTotalItems(newItems),
            totalPrice: calculateTotalPrice(newItems),
          };
        });
      },

      /**
       * 아이템 수량 직접 업데이트
       */
      updateItemQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }

        set(state => {
          const itemIndex = state.items.findIndex(
            item => item.productId === productId
          );

          if (itemIndex === -1) return state;

          const item = state.items[itemIndex];
          if (quantity > item.maxQuantity) {
            console.error('재고를 초과했습니다.');
            return state;
          }

          const updatedItem = {
            ...item,
            quantity,
            totalPrice: item.price * quantity,
          };

          const newItems = [
            ...state.items.slice(0, itemIndex),
            updatedItem,
            ...state.items.slice(itemIndex + 1),
          ];

          return {
            ...state,
            items: newItems,
            totalItems: calculateTotalItems(newItems),
            totalPrice: calculateTotalPrice(newItems),
          };
        });
      },

      /**
       * 아이템 수량 증가
       */
      increaseItemQuantity: productId => {
        set(state => {
          const itemIndex = state.items.findIndex(
            item => item.productId === productId
          );

          if (itemIndex === -1) return state;

          const item = state.items[itemIndex];
          if (item.quantity >= item.maxQuantity) {
            console.error('재고가 부족합니다.');
            return state;
          }

          const updatedItem = {
            ...item,
            quantity: item.quantity + 1,
            totalPrice: item.price * (item.quantity + 1),
          };

          const newItems = [
            ...state.items.slice(0, itemIndex),
            updatedItem,
            ...state.items.slice(itemIndex + 1),
          ];

          return {
            ...state,
            items: newItems,
            totalItems: calculateTotalItems(newItems),
            totalPrice: calculateTotalPrice(newItems),
          };
        });
      },

      /**
       * 아이템 수량 감소
       */
      decreaseItemQuantity: productId => {
        set(state => {
          const itemIndex = state.items.findIndex(
            item => item.productId === productId
          );

          if (itemIndex === -1) return state;

          const currentItem = state.items[itemIndex];

          if (currentItem.quantity <= 1) {
            // 수량이 1이면 아이템 제거
            get().removeItem(productId);
            return state;
          }

          const updatedItem = {
            ...currentItem,
            quantity: currentItem.quantity - 1,
            totalPrice: currentItem.price * (currentItem.quantity - 1),
          };

          const newItems = [
            ...state.items.slice(0, itemIndex),
            updatedItem,
            ...state.items.slice(itemIndex + 1),
          ];

          return {
            ...state,
            items: newItems,
            totalItems: calculateTotalItems(newItems),
            totalPrice: calculateTotalPrice(newItems),
          };
        });
      },

      /**
       * 장바구니 전체 비우기
       */
      clearCart: () => {
        set(() => ({
          items: [],
          isOpen: false,
          totalItems: 0,
          totalPrice: 0,
        }));
      },

      // ========================================
      // UI State Management Actions
      // ========================================

      /**
       * 장바구니 열기
       */
      openCart: () => {
        set(state => ({ ...state, isOpen: true }));
      },

      /**
       * 장바구니 닫기
       */
      closeCart: () => {
        set(state => ({ ...state, isOpen: false }));
      },

      /**
       * 장바구니 토글
       */
      toggleCart: () => {
        set(state => ({ ...state, isOpen: !state.isOpen }));
      },

      // ========================================
      // Utility Actions
      // ========================================

      /**
       * 특정 상품의 수량 조회
       */
      getItemQuantity: productId => {
        const item = get().items.find(item => item.productId === productId);
        return item ? item.quantity : 0;
      },

      /**
       * 특정 상품이 장바구니에 있는지 확인
       */
      hasItem: productId => {
        return get().items.some(item => item.productId === productId);
      },

      /**
       * 장바구니가 비어있는지 확인
       */
      isEmpty: () => {
        return get().items.length === 0;
      },
    }),
    {
      name: 'shopping-cart',
      // localStorage에 저장
      partialize: state => ({
        items: state.items,
      }),
      // 복원 시 계산된 값들 다시 설정
      onRehydrateStorage: () => state => {
        if (state?.items) {
          state.totalItems = calculateTotalItems(state.items);
          state.totalPrice = calculateTotalPrice(state.items);
        }
      },
    }
  )
);
