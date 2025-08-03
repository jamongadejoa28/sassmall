// ProductsPage.tsx - Clean Architecture 기반 상품 목록 페이지
// Clean Architecture: UI Pages Layer
// 위치: client/src/frameworks/ui/pages/ProductsPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchFilters from '../components/SearchFilters';
import ProductImage from '../components/ProductImage';
import { useProductUseCases } from '../../../infrastructure/di/useContainer';
import { Product } from '../../../entities/product/Product';
import { ProductListResult } from '../../../entities/product/IProductRepository';
import { GetProductsRequest } from '../../../usecases/product/GetProductsUseCase';

// ========================================
// Types & Interfaces
// ========================================

interface FilterValues {
  search: string;
  category: string[];
  brand: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: string;
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
 * FilterValues를 GetProductsRequest로 변환
 */
const mapFiltersToRequest = (
  filters: FilterValues,
  page: number = 1
): GetProductsRequest => {
  return {
    search: filters.search.trim() || undefined,
    category: filters.category.length > 0 ? filters.category : undefined,
    brand: filters.brand.length > 0 ? filters.brand : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page,
    limit: 20,
  };
};

// ========================================
// ProductsPage Component
// ========================================

const ProductsPage: React.FC = () => {
  // ========================================
  // Hooks & Dependencies
  // ========================================

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getProducts } = useProductUseCases();

  // ========================================
  // State Management
  // ========================================

  const [products, setProducts] = useState<Product[]>([]);
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
  // Business Logic Functions
  // ========================================

  const fetchProducts = useCallback(
    async (filtersToUse: FilterValues, page: number = 1) => {
      setLoading(true);
      setError(null);

      try {
        const request = mapFiltersToRequest(filtersToUse, page);
        const result: ProductListResult = await getProducts.execute(request);

        setProducts(result.products);
        setPagination(result.pagination);
      } catch (err: any) {
        const errorMessage =
          err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [getProducts]
  );

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

  // Stabilize filters object to prevent unnecessary re-renders
  const categorySorted = useMemo(
    () => [...filters.category].sort(),
    [filters.category]
  );
  const brandSorted = useMemo(() => [...filters.brand].sort(), [filters.brand]);

  const stableFilters = useMemo(
    () => ({
      search: filters.search,
      category: categorySorted,
      brand: brandSorted,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    [
      filters.search,
      categorySorted,
      brandSorted,
      filters.minPrice,
      filters.maxPrice,
      filters.sortBy,
      filters.sortOrder,
    ]
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isActive = true; // 컴포넌트가 마운트된 상태인지 확인

    const performFetch = async (
      filtersToUse: FilterValues,
      page: number = 1
    ) => {
      if (!isActive) return; // 컴포넌트가 언마운트되었으면 실행하지 않음

      setLoading(true);
      setError(null);

      try {
        const request = mapFiltersToRequest(filtersToUse, page);
        const result: ProductListResult = await getProducts.execute(request);

        if (isActive) {
          // 비동기 작업 완료 후에도 컴포넌트가 마운트되어 있는지 확인
          setProducts(result.products);
          setPagination(result.pagination);
        }
      } catch (err: any) {
        if (isActive) {
          const errorMessage =
            err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.';
          setError(errorMessage);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    const debouncedFetch = () => {
      timeoutId = setTimeout(() => {
        performFetch(stableFilters, currentPage);
      }, 300);
    };

    if (stableFilters.search.trim()) {
      debouncedFetch();
    } else {
      performFetch(stableFilters, currentPage);
    }

    return () => {
      isActive = false; // 컴포넌트 언마운트 시 플래그 설정
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [stableFilters, currentPage, getProducts]);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">상품 목록</h1>
        <p className="mt-2 text-gray-600">
          {products.length > 0
            ? `${products.length.toLocaleString()}개의 상품 (전체 ${pagination.totalItems.toLocaleString()}개)`
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

      {/* 검색 결과 메시지 */}
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
        {!loading && !error && products.length === 0 && (
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
        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
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

                    {/* 가격 정보 - Entity의 비즈니스 로직 사용 */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {product.hasDiscount() ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-bold text-red-600">
                                {product.getFormattedPrice()}
                              </span>
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                                {product.getDiscountInfo().percentage}% 할인
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 line-through">
                              {product.getFormattedOriginalPrice()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {product.getFormattedPrice()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 재고 상태 - Entity의 비즈니스 로직 사용 */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${product.getStockStatusColor()}`}
                      >
                        {product.getStockStatusText()}
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
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>

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
