// ProductImage.tsx - 상품 이미지 컴포넌트
// 위치: client/src/frameworks/ui/components/ProductImage.tsx

import React, { useState, memo, useMemo } from 'react';
import { Product } from '../../../entities/product/Product';

interface ProductImageProps {
  product: Product;
}

/**
 * 상품 이미지를 표시하는 컴포넌트
 * memo를 사용하여 불필요한 재렌더링 방지
 */
export const ProductImage: React.FC<ProductImageProps> = memo(
  ({ product }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // 이미지 URL을 메모이제이션하여 불필요한 재계산 방지git checkout -- api-gateway/src/__tests__/app.test.ts
    const imageSrc = useMemo(() => product.getPrimaryImageUrl(), [product]);

    return (
      <div className="aspect-square bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors relative">
        {!imageError && imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <svg
            className="h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
        {!imageLoaded && !imageError && imageSrc && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 이미지 관련 필드만 비교하여 불필요한 재렌더링 방지
    const prev = prevProps.product;
    const next = nextProps.product;

    return (
      prev.id === next.id &&
      prev.thumbnail_url === next.thumbnail_url &&
      JSON.stringify(prev.image_urls) === JSON.stringify(next.image_urls) &&
      prev.category.slug === next.category.slug &&
      prev.sku === next.sku
    );
  }
);

ProductImage.displayName = 'ProductImage';

export default ProductImage;
