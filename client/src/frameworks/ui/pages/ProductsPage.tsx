// ProductsPage.tsx - 쿠팡 스타일 상품 목록 페이지
// Clean Architecture: UI Pages Layer
// 위치: client/src/frameworks/ui/pages/ProductsPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchFilters from '../components/SearchFilters';
import { useProductImage } from '../../../shared/hooks/useProductImage';

// ========================================
// Types & Interfaces (새로운 스키마 반영)
// ========================================

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number; // 할인 전 가격
  discountPrice?: number; // 할인된 가격 (현재 가격과 동일)
  discountPercentage?: number; // 할인율
  brand: string;
  sku: string;
  rating: number; // 평점 (0-5)
  review_count: number; // 리뷰 수
  is_featured: boolean; // 추천상품
  is_active: boolean; // 활성 상태 (백엔드에서 이미 필터링되지만 타입 안전성을 위해 추가)
  tags: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: {
    availableQuantity: number;
    inventory_status: string;
  };
  image_urls: string[];
  thumbnail_url?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    products: ProductData[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    filters: {
      appliedBrand?: string;
      appliedCategory?: string;
      appliedPriceRange?: {
        min: number;
        max: number;
      };
      appliedSearch?: string;
      appliedSort?: string;
    };
  };
}

// CategoryData 인터페이스 제거됨 - 현재 사용되지 않음
// interface CategoryData {
//   id: string;
//   name: string;
//   slug: string;
//   product_count: number;
// }

interface FilterValues {
  search: string;
  category: string[];
  brand: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: string; // 'price' | 'name' | 'createdAt'
  sortOrder: 'asc' | 'desc';
}

// ========================================
// Utility Functions
// ========================================

/**
 * URL 검색 파라미터를 FilterValues로 변환
 */
const parseFiltersFromUrl = (searchParams: URLSearchParams): FilterValues => {
  const brand = searchParams.get('brand');
  const brands = brand ? brand.split(',').filter(Boolean) : [];

  const category = searchParams.get('category');
  const categories = category ? category.split(',').filter(Boolean) : [];

  return {
    search: searchParams.get('search') || '',
    category: categories,
    brand: brands,
    minPrice: searchParams.get('minPrice')
      ? parseInt(searchParams.get('minPrice')!)
      : null,
    maxPrice: searchParams.get('maxPrice')
      ? parseInt(searchParams.get('maxPrice')!)
      : null,
    sortBy: searchParams.get('sortBy') || 'created_desc',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  };
};

/**
 * FilterValues를 URL 검색 파라미터로 변환
 */
const buildUrlFromFilters = (
  filters: FilterValues,
  page: number = 1
): string => {
  const params = new URLSearchParams();

  params.set('page', page.toString());

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.category.length > 0) {
    params.set('category', filters.category.join(','));
  }

  if (filters.brand.length > 0) {
    params.set('brand', filters.brand.join(','));
  }

  if (filters.minPrice !== null) {
    params.set('minPrice', filters.minPrice.toString());
  }

  if (filters.maxPrice !== null) {
    params.set('maxPrice', filters.maxPrice.toString());
  }

  if (filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc') {
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
  }

  return params.toString();
};

/**
 * API 호출용 쿼리 파라미터 생성 (정렬 방식 수정)
 */
const buildApiQuery = (filters: FilterValues, page: number = 1): string => {
  const params = new URLSearchParams();

  params.set('page', page.toString());
  params.set('limit', '20'); // 한 페이지당 20개

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  // 다중 카테고리 지원 (쉼표로 구분)
  if (filters.category.length > 0) {
    params.set('category', filters.category.join(','));
  }

  // 다중 브랜드 지원 (쉼표로 구분)
  if (filters.brand.length > 0) {
    params.set('brand', filters.brand.join(','));
  }

  // 가격 필터링 - 유효성 검사 추가
  if (filters.minPrice !== null && filters.minPrice >= 0) {
    params.set('minPrice', Math.floor(filters.minPrice).toString());
  }

  if (filters.maxPrice !== null && filters.maxPrice >= 0) {
    params.set('maxPrice', Math.floor(filters.maxPrice).toString());
  }

  // 정렬 기준: 백엔드가 기대하는 결합된 형태로 전송
  params.set('sortBy', filters.sortBy);

  // 일반 사용자 페이지에서는 항상 활성 상품만 조회
  // 백엔드에서 isActive 파라미터가 없으면 활성 상품만 반환하지만, 명시적으로 설정
  params.set('isActive', 'true');

  return params.toString();
};

// productType 필터링 제거됨 - 단순화된 스키마에서 사용하지 않음

// ========================================
// ProductsPage Component
// ========================================

const ProductsPage: React.FC = () => {
  // ========================================
  // State Management
  // ========================================

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState<ProductData[]>([]); // 모든 상품 (API에서 받은 원본)
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // URL에서 필터 상태 파싱
  const filters = useMemo(
    () => parseFiltersFromUrl(searchParams),
    [searchParams]
  );
  const currentPage = parseInt(searchParams.get('page') || '1');

  // ========================================
  // API Functions
  // ========================================

  const fetchProducts = useCallback(
    async (filtersToUse: FilterValues, page: number = 1) => {
      setLoading(true);
      setError(null);

      try {
        const queryString = buildApiQuery(filtersToUse, page);

        const response = await fetch(
          `http://localhost:3001/api/v1/products?${queryString}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();

        if (data.success) {
          setAllProducts(data.data.products);
          setPagination(data.data.pagination);
        } else {
          throw new Error(
            data.message || '상품 목록을 불러오는데 실패했습니다.'
          );
        }
      } catch (err: any) {
        const errorMessage =
          err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ========================================
  // Client-side Filtering 제거됨
  // ========================================
  // productType 필터링이 제거되어 별도 클라이언트 필터링 불필요

  // ========================================
  // Event Handlers
  // ========================================

  const handleFiltersChange = useCallback(
    (newFilters: FilterValues) => {
      const urlParams = buildUrlFromFilters(newFilters, 1);
      setSearchParams(urlParams ? `?${urlParams}` : '');
    },
    [setSearchParams]
  );

  const handleReset = useCallback(() => {
    setSearchParams('');
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const urlParams = buildUrlFromFilters(filters, newPage);
      setSearchParams(urlParams ? `?${urlParams}` : '');
    },
    [filters, setSearchParams]
  );

  const handleProductClick = useCallback(
    (productId: string) => {
      navigate(`/products/${productId}`);
    },
    [navigate]
  );

  // ========================================
  // Effects
  // ========================================

  // URL 파라미터가 변경될 때마다 API 호출
  useEffect(() => {
    fetchProducts(filters, currentPage);
  }, [fetchProducts, filters, currentPage]);

  // ========================================
  // Render Helpers
  // ========================================

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const getStockStatusColor = (availableQuantity: number): string => {
    if (availableQuantity === 0) {
      return 'text-red-600 bg-red-50';
    } else if (availableQuantity < 20) {
      return 'text-yellow-600 bg-yellow-50';
    } else {
      return 'text-green-600 bg-green-50';
    }
  };

  const getStockStatusText = (availableQuantity: number): string => {
    if (availableQuantity === 0) {
      return '품절';
    } else if (availableQuantity < 20) {
      return '품절 임박';
    } else {
      return '재고 충분';
    }
  };

  // 현재 표시할 상품 목록
  // 백엔드에서 이미 활성 상품(is_active=true)만 필터링해서 반환하므로
  // 일반 사용자는 자동으로 비활성 상품이 제외된 목록을 보게 됨
  const displayProducts = allProducts;

  // ========================================
  // 이미지 컴포넌트
  // ========================================

  const ProductImage: React.FC<{ product: ProductData }> = ({ product }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // 클린 코드: 커스텀 훅을 사용하여 이미지 URL 생성
    const imageSrc = useProductImage(product);

    return (
      <div className="aspect-square bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
        {!imageError ? (
          <img
            src={imageSrc}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => {
              setImageLoaded(true);
            }}
            onError={() => {
              setImageError(true);
            }}
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
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        )}
      </div>
    );
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">상품 목록</h1>
        <p className="mt-2 text-gray-600">
          {displayProducts.length > 0
            ? `${displayProducts.length.toLocaleString()}개의 상품 (전체 ${pagination.totalItems.toLocaleString()}개)`
            : '상품을 찾고 있습니다...'}
        </p>
      </div>

      {/* 검색/필터링 컴포넌트 */}
      <SearchFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleReset}
        isLoading={loading}
      />

      {/* ✅ 검색 결과 메시지 (필터 영역 대신 상품 목록 위에 표시) */}
      {filters.search.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-blue-800">
              <strong>"{filters.search}"</strong>로 검색한 결과입니다.
            </span>
          </div>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div className="space-y-6">
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-2">
              <svg
                className="h-12 w-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium">오류가 발생했습니다</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => fetchProducts(filters, currentPage)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && !error && displayProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg
                className="h-16 w-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">
                검색 결과가 없습니다
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                다른 검색어나 필터를 시도해보세요.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              필터 초기화
            </button>
          </div>
        )}

        {/* 상품 목록 */}
        {!loading && !error && displayProducts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  {/* 상품 이미지 */}
                  <ProductImage product={product} />

                  {/* 상품 정보 */}
                  <div className="p-4">
                    <div className="mb-2 flex gap-1">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {product.category.name}
                      </span>
                      {/* 상품 타입 태그 (tags의 첫 번째 단어) */}
                      {product.tags && product.tags.length > 0 && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          {product.tags[0]}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>

                    <p className="text-sm text-gray-600 mb-2">
                      {product.brand}
                    </p>

                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* 태그 표시 */}
                    {product.tags && product.tags.length > 1 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(1, 4).map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                          {product.tags.length > 4 && (
                            <span className="text-xs text-gray-400">
                              +{product.tags.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 가격 정보 */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {product.discountPrice && product.discountPrice > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-bold text-red-600">
                                {formatPrice(product.discountPrice)}
                              </span>
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                                {product.discountPercentage}% 할인
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 line-through">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 재고 상태 */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStockStatusColor(product.inventory.availableQuantity)}`}
                      >
                        {getStockStatusText(
                          product.inventory.availableQuantity
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        재고: {product.inventory.availableQuantity}개
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {/* 이전 페이지 */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>

                {/* 페이지 번호 */}
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const pageNumber = startPage + i;

                    if (pageNumber > pagination.totalPages) return null;

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-2 border rounded-lg transition-colors ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  }
                )}

                {/* 다음 페이지 */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
