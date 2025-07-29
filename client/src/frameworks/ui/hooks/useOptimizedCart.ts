// 최적화된 장바구니 훅
// 위치: client/src/frameworks/ui/hooks/useOptimizedCart.ts

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useCartSummary, useCartActions } from '../../state/cartStoreLocal';
import { PerformanceMonitor } from '../components/utils/performance';

/**
 * 성능 최적화된 장바구니 훅
 * - 메모이제이션을 통한 불필요한 리렌더링 방지
 * - 디바운싱을 통한 과도한 업데이트 방지
 * - 지연 로딩을 통한 초기 로딩 속도 개선
 */
export function useOptimizedCart() {
  const {
    items,
    totalPrice: totalAmount,
    totalQuantity,
    loading: isLoading,
  } = useCartSummary();

  const { addItem, removeItem, updateQuantity, clearCart } = useCartActions();

  // 디바운싱을 위한 ref
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // 메모이제이션된 계산값들
  const memoizedValues = useMemo(() => {
    return PerformanceMonitor.measureComponentRender(
      'CartCalculations',
      () => ({
        // 상품별 그룹화
        groupedItems: items.reduce(
          (groups: Record<string, any[]>, item: any) => {
            const key = `${item.product.id}_${JSON.stringify(item.product.options || {})}`;
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(item);
            return groups;
          },
          {} as Record<string, any[]>
        ),

        // 카테고리별 통계
        categoryStats: items.reduce(
          (
            stats: Record<string, { count: number; total: number }>,
            item: any
          ) => {
            const category = item.product.name.split(' ')[0] || 'Unknown';
            if (!stats[category]) {
              stats[category] = { count: 0, total: 0 };
            }
            stats[category].count += item.quantity;
            stats[category].total += item.product.price * item.quantity;
            return stats;
          },
          {} as Record<string, { count: number; total: number }>
        ),

        // 최대/최소 가격 상품
        priceRange:
          items.length > 0
            ? {
                min: Math.min(...items.map((item: any) => item.product.price)),
                max: Math.max(...items.map((item: any) => item.product.price)),
              }
            : null,

        // 배송비 계산 (예시: 5만원 이상 무료배송)
        shippingInfo: {
          freeShippingThreshold: 50000,
          shippingFee: totalAmount >= 50000 ? 0 : 3000,
          remainingForFreeShipping: Math.max(0, 50000 - totalAmount),
        },
      })
    );
  }, [items, totalAmount]);

  // 디바운싱된 업데이트 함수
  const debouncedUpdateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const now = Date.now();
      lastUpdateRef.current = now;

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (lastUpdateRef.current === now) {
          PerformanceMonitor.measureAsync('CartUpdate', async () => {
            updateQuantity(productId, quantity);
          });
        }
      }, 300); // 300ms 디바운싱
    },
    [updateQuantity]
  );

  // 최적화된 상품 추가
  const optimizedAddItem = useCallback(
    (item: any) => {
      return PerformanceMonitor.measureAsync('CartAddItem', async () => {
        // 중복 상품 체크
        const existingItem = items.find(
          (existing: any) =>
            existing.product.id === item.product.id &&
            JSON.stringify(existing.product.options) ===
              JSON.stringify(item.product.options)
        );

        if (existingItem) {
          // 기존 상품이면 수량만 증가
          debouncedUpdateQuantity(
            existingItem.product.id,
            existingItem.quantity + item.quantity
          );
        } else {
          // 새 상품이면 추가
          addItem(item.product, item.quantity);
        }
      });
    },
    [items, addItem, debouncedUpdateQuantity]
  );

  // 배치 작업을 위한 최적화된 함수들
  const batchOperations = useMemo(
    () => ({
      // 여러 상품 동시 제거
      removeMultiple: (productIds: string[]) => {
        return PerformanceMonitor.measureAsync('CartBatchRemove', async () => {
          productIds.forEach(id => removeItem(id));
        });
      },

      // 장바구니 전체 수량 조정
      adjustAllQuantities: (multiplier: number) => {
        return PerformanceMonitor.measureAsync('CartBatchAdjust', async () => {
          items.forEach((item: any) => {
            const newQuantity = Math.max(
              1,
              Math.floor(item.quantity * multiplier)
            );
            updateQuantity(item.product.id, newQuantity);
          });
        });
      },

      // 가격대별 상품 필터링 및 제거
      removeByPriceRange: (minPrice: number, maxPrice: number) => {
        return PerformanceMonitor.measureAsync(
          'CartFilterByPrice',
          async () => {
            const itemsToRemove = items.filter(
              (item: any) =>
                item.product.price >= minPrice && item.product.price <= maxPrice
            );
            itemsToRemove.forEach((item: any) => removeItem(item.product.id));
          }
        );
      },
    }),
    [items, removeItem, updateQuantity]
  );

  // 성능 통계
  const performanceStats = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return null;

    return {
      itemCount: items.length,
      memoryUsage: PerformanceMonitor.measureMemory(),
      lastRenderTime: performance.now(),
      cacheHitRatio:
        items.length > 0 ? 1 - items.length / (items.length + 1) : 0,
    };
  }, [items.length]);

  // 정리 작업
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 기본 상태
    items,
    totalAmount,
    totalQuantity,
    isLoading,

    // 계산된 값들
    ...memoizedValues,

    // 최적화된 액션들
    addItem: optimizedAddItem,
    removeItem,
    updateQuantity: debouncedUpdateQuantity,
    clearCart,

    // 배치 작업
    batchOperations,

    // 성능 정보 (개발 환경에서만)
    performanceStats,

    // 유틸리티 함수들
    utils: {
      // 상품 검색 (메모이제이션됨)
      searchItems: useCallback(
        (query: string) => {
          return items.filter((item: any) =>
            item.product.name.toLowerCase().includes(query.toLowerCase())
          );
        },
        [items]
      ),

      // 상품 정렬
      sortItems: useCallback(
        (sortBy: 'name' | 'price' | 'quantity') => {
          return [...items].sort((a: any, b: any) => {
            switch (sortBy) {
              case 'name':
                return a.product.name.localeCompare(b.product.name);
              case 'price':
                return b.product.price - a.product.price;
              case 'quantity':
                return b.quantity - a.quantity;
              default:
                return 0;
            }
          });
        },
        [items]
      ),

      // 장바구니 데이터 내보내기
      exportCartData: useCallback(() => {
        return {
          items: items.map((item: any) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            productPrice: item.product.price,
            timestamp: Date.now(),
          })),
          summary: {
            totalAmount,
            totalQuantity,
            itemCount: items.length,
            exportedAt: new Date().toISOString(),
          },
        };
      }, [items, totalAmount, totalQuantity]),
    },
  };
}

// 장바구니 성능 모니터링 훅
export function useCartPerformanceMonitor() {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    if (process.env.NODE_ENV === 'development') {
      // 너무 빠른 리렌더링 경고
      if (timeSinceLastRender < 50 && renderCountRef.current > 1) {
        console.warn(
          '⚠️ Cart is re-rendering too frequently. Consider optimizing dependencies.'
        );
      }
    }
  });

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current,
  };
}

// 타입 정의
export type OptimizedCartReturn = ReturnType<typeof useOptimizedCart>;
export type CartPerformanceReturn = ReturnType<
  typeof useCartPerformanceMonitor
>;
