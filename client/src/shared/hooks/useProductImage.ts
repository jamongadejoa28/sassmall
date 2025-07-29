// useProductImage.ts - 상품 이미지 URL을 제공하는 커스텀 훅
// Clean Architecture: Frameworks Layer
// 위치: client/src/shared/hooks/useProductImage.ts

import { useMemo } from 'react';
import { imageService } from '../services/ImageService';

interface ProductData {
  sku: string;
  image_urls?: string[];
  thumbnail_url?: string | null;
  category: {
    slug: string;
  };
}

/**
 * 상품 이미지 URL을 제공하는 커스텀 훅
 *
 * @param product 상품 데이터
 * @returns 이미지 URL
 *
 * @example
 * ```tsx
 * const MyComponent = ({ product }) => {
 * const imageUrl = useProductImage(product);
 *
 * return <img src={imageUrl} alt={product.name} />;
 * };
 * ```
 */
export const useProductImage = (product: ProductData): string => {
  return useMemo(() => {
    return imageService.getProductImageUrl(product);
  }, [product]); // 'product' 객체 전체를 의존성으로 추가하여 경고를 해결합니다.
};

/**
 * 다중 상품의 이미지 URL을 한 번에 처리하는 훅
 *
 * @param products 상품 배열
 * @returns 이미지 URL 배열
 */
export const useProductImages = (products: ProductData[]): string[] => {
  return useMemo(() => {
    return products.map(product => imageService.getProductImageUrl(product));
  }, [products]);
};
