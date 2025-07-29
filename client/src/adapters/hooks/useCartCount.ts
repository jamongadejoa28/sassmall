// useCartCount.ts - localStorage 기반 장바구니 아이템 개수 추적 커스텀 훅
// Clean Architecture: Adapters Layer
// 위치: client/src/adapters/hooks/useCartCount.ts

import {
  useCartItemCount,
  useCartLoading,
} from '../../frameworks/state/cartStoreLocal';

/**
 * 장바구니 상품목록 개수를 실시간으로 추적하는 커스텀 훅
 * localStorage 기반으로 서로 다른 상품의 개수를 반환합니다
 *
 * 예: 사과 3개 + 바나나 2개 = 카운트 2 (상품목록 개수)
 *
 * @returns {Object} - cart count와 loading 상태
 */
export const useCartCount = () => {
  const count = useCartItemCount();
  const loading = useCartLoading();

  return {
    count,
    loading,
    refresh: () => {
      // localStorage 기반에서는 실시간으로 업데이트되므로 refresh 불필요
      // 호환성을 위해 빈 함수 제공
    },
  };
};
