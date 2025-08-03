// useContainer.ts - Container Hook
// Clean Architecture: Infrastructure Layer
// 위치: client/src/infrastructure/di/useContainer.ts

import { useMemo } from 'react';
import { container, DIContainer } from './Container';

/**
 * DI 컨테이너에 접근하는 React Hook
 */
export function useContainer(): DIContainer {
  return useMemo(() => container, []);
}

/**
 * 특정 상품 관련 Use Case들에 접근하는 Hook
 */
export function useProductUseCases() {
  const containerInstance = useContainer();

  return useMemo(
    () => ({
      getProducts: containerInstance.getProductsUseCase,
      getProductDetail: containerInstance.getProductDetailUseCase,
      searchProducts: containerInstance.searchProductsUseCase,
    }),
    [containerInstance]
  );
}
