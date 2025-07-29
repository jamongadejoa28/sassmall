// ========================================
// cartStoreLocal - localStorage 기반 장바구니 상태 관리
// client/src/frameworks/state/cartStoreLocal.ts
// ========================================

import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { CartProduct } from '../../types/cart-type/CartProduct';
import {
  cartLocalRepository,
  LocalCartItem,
} from '../../adapters/storage/CartLocalRepository';
import { cartSessionManager } from '../../adapters/storage/CartSessionManager';

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
  loading: boolean;
  error: string | null;

  // Actions
  loadCart: () => Promise<void>;
  addItem: (product: CartProduct, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeSelectedItems: (productIds: string[]) => Promise<void>;
  clearCart: () => Promise<void>;
  syncProductInfo: () => Promise<void>;

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
// localStorage 아이템을 CartItem으로 변환
// ========================================

function localItemToCartItem(localItem: LocalCartItem): CartItem {
  const product: CartProduct = {
    id: localItem.productId,
    name: localItem.productName,
    description: '',
    price: localItem.productPrice,
    brand: localItem.productBrand,
    sku: localItem.productInfo?.sku || '',
    category: {
      id: '',
      name: localItem.productInfo?.category || '',
      slug: localItem.productInfo?.category || '',
    },
    inventory: {
      availableQuantity: localItem.productInfo?.availableQuantity || 0,
      status: 'sufficient',
      location: 'MAIN_WAREHOUSE',
    },
    image_urls: localItem.productImageUrl ? [localItem.productImageUrl] : [],
    imageUrls: localItem.productImageUrl ? [localItem.productImageUrl] : [],
    rating: 0,
    review_count: 0,
    is_featured: false,
    min_order_quantity: 1,
    max_order_quantity: 999,
    tags: [],
    created_at: '',
    updated_at: '',
  };

  return {
    product,
    quantity: localItem.quantity,
    addedAt: new Date(localItem.addedAt),
  };
}

// ========================================
// localStorage 기반 장바구니 Store
// ========================================

export const useCartLocalStore = createWithEqualityFn<CartState>()(
  (set, get) => ({
    // 초기 상태
    items: [],
    loading: false,
    error: null,

    // ========================================
    // Actions
    // ========================================

    loadCart: async () => {
      set({ loading: true, error: null });
      try {
        // 세션 ID 확인/생성
        cartSessionManager.getOrCreateSessionId();

        const localCart = await cartLocalRepository.load();
        const items = localCart.items.map(localItemToCartItem);

        set({ items, loading: false });
      } catch (error: any) {
        console.error('Cart load failed:', error);
        set({
          items: [],
          loading: false,
          error: error.message || '장바구니 로드에 실패했습니다.',
        });
      }
    },

    addItem: async (product, quantity) => {
      set({ loading: true, error: null });
      try {
        // 세션 활동 기록
        cartSessionManager.recordActivity();

        const localCart = await cartLocalRepository.addItem(product, quantity);
        const items = localCart.items.map(localItemToCartItem);

        set({ items, loading: false });
      } catch (error: any) {
        console.error('Cart add item failed:', error);
        set({
          loading: false,
          error: error.message || '상품 추가에 실패했습니다.',
        });
        throw error;
      }
    },

    removeItem: async productId => {
      set({ loading: true, error: null });
      try {
        cartSessionManager.recordActivity();

        const localCart = await cartLocalRepository.removeItem(productId);
        const items = localCart.items.map(localItemToCartItem);

        set({ items, loading: false });
      } catch (error: any) {
        console.error('Cart remove item failed:', error);
        set({
          loading: false,
          error: error.message || '상품 제거에 실패했습니다.',
        });
        throw error;
      }
    },

    updateQuantity: async (productId, quantity) => {
      set({ loading: true, error: null });
      try {
        cartSessionManager.recordActivity();

        const localCart = await cartLocalRepository.updateQuantity(
          productId,
          quantity
        );
        const items = localCart.items.map(localItemToCartItem);

        set({ items, loading: false });
      } catch (error: any) {
        console.error('Cart update quantity failed:', error);
        set({
          loading: false,
          error: error.message || '수량 변경에 실패했습니다.',
        });
        throw error;
      }
    },

    removeSelectedItems: async productIds => {
      set({ loading: true, error: null });
      try {
        cartSessionManager.recordActivity();

        const localCart =
          await cartLocalRepository.removeSelectedItems(productIds);
        const items = localCart.items.map(localItemToCartItem);

        set({ items, loading: false });
      } catch (error: any) {
        console.error('Cart remove selected items failed:', error);
        set({
          loading: false,
          error: error.message || '선택 상품 삭제에 실패했습니다.',
        });
        throw error;
      }
    },

    clearCart: async () => {
      set({ loading: true, error: null });
      try {
        cartSessionManager.recordActivity();

        await cartLocalRepository.clear();

        set({ items: [], loading: false });
      } catch (error: any) {
        console.error('Cart clear failed:', error);
        set({
          loading: false,
          error: error.message || '장바구니 비우기에 실패했습니다.',
        });
        throw error;
      }
    },

    syncProductInfo: async () => {
      set({ loading: true, error: null });
      try {
        cartSessionManager.recordActivity();

        const localCart = await cartLocalRepository.syncProductInfo();
        const items = localCart.items.map(localItemToCartItem);

        set({ items, loading: false });
      } catch (error: any) {
        console.error('Cart sync product info failed:', error);
        set({
          loading: false,
          error: error.message || '상품 정보 동기화에 실패했습니다.',
        });
        // 동기화 실패해도 예외를 던지지 않음 (선택적 기능)
      }
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
  Object.is
);

// ========================================
// 최적화된 Individual Hooks
// ========================================

export const useCartTotalQuantity = () =>
  useCartLocalStore(state => state.getTotalQuantity());

export const useCartTotalPrice = () =>
  useCartLocalStore(state => state.getTotalPrice());

export const useCartItemCount = () =>
  useCartLocalStore(state => state.getItemCount());

export const useCartEmpty = () => useCartLocalStore(state => state.isEmpty());

export const useCartLoading = () => useCartLocalStore(state => state.loading);

export const useCartError = () => useCartLocalStore(state => state.error);

export const useCartActions = () => {
  return useCartLocalStore(
    state => ({
      loadCart: state.loadCart,
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateQuantity: state.updateQuantity,
      removeSelectedItems: state.removeSelectedItems,
      clearCart: state.clearCart,
      syncProductInfo: state.syncProductInfo,
    }),
    shallow
  );
};

export const useCartItem = (productId: string) => {
  return useCartLocalStore(state => {
    const item = state.items.find(item => item.product.id === productId);
    return {
      item,
      quantity: item ? item.quantity : 0,
      hasItem: !!item,
    };
  }, shallow);
};

export const useCartSummary = () => {
  return useCartLocalStore(
    state => ({
      items: state.items, // items 추가
      totalQuantity: state.getTotalQuantity(),
      totalPrice: state.getTotalPrice(),
      itemCount: state.getItemCount(),
      isEmpty: state.isEmpty(),
      loading: state.loading,
      error: state.error,
    }),
    shallow
  );
};
