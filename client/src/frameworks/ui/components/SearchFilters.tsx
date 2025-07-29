// SearchFilters.tsx - ESLint/Prettier 오류 해결된 검색/필터링 컴포넌트
// Clean Architecture: UI Components Layer
// 위치: client/src/frameworks/ui/components/SearchFilters.tsx

import React, { useState, useCallback, useEffect } from 'react';

// ========================================
// Types & Interfaces
// ========================================

export interface FilterValues {
  search: string;
  category: string[];
  brand: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface SearchFiltersProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onReset: () => void;
  isLoading?: boolean;
}

// 동적으로 로딩되는 브랜드와 카테고리 목록
const INITIAL_BRANDS: string[] = [];
const INITIAL_CATEGORIES: string[] = [];

// 정렬 옵션 (백엔드 API 형태에 맞춰 수정)
const SORT_OPTIONS = [
  { value: 'created_desc', label: '최신순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
  { value: 'name_asc', label: '이름순' },
];

// ========================================
// SearchFilters Component
// ========================================

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  isLoading = false,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [availableBrands, setAvailableBrands] =
    useState<string[]>(INITIAL_BRANDS);
  const [availableCategories, setAvailableCategories] =
    useState<string[]>(INITIAL_CATEGORIES);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // 로컬 상태로 입력값 관리 (실제 필터링과 분리)
  const [localInputs, setLocalInputs] = useState({
    search: filters.search,
    minPrice: filters.minPrice?.toString() || '',
    maxPrice: filters.maxPrice?.toString() || '',
  });

  // 외부에서 필터가 변경될 때 로컬 입력값도 동기화
  useEffect(() => {
    setLocalInputs({
      search: filters.search,
      minPrice: filters.minPrice?.toString() || '',
      maxPrice: filters.maxPrice?.toString() || '',
    });
  }, [filters.search, filters.minPrice, filters.maxPrice]);

  // 브랜드와 카테고리 동적 로딩
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (isLoadingFilters) return;

      setIsLoadingFilters(true);
      try {
        const response = await fetch(
          'http://localhost:3001/api/v1/products?page=1&limit=100'
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.products) {
            // 브랜드 추출
            const brands = Array.from(
              new Set(
                data.data.products.map((p: any) => p.brand).filter(Boolean)
              )
            ) as string[];
            setAvailableBrands(brands.sort());

            // 카테고리 추출
            const categories = Array.from(
              new Set(
                data.data.products
                  .map((p: any) => p.category?.name)
                  .filter(Boolean)
              )
            ) as string[];
            setAvailableCategories(categories.sort());
          }
        }
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // isLoadingFilters 의존성 제거 (무한 루프 방지)

  // ========================================
  // Event Handlers
  // ========================================

  // 검색어 입력 핸들러 (로컬 상태만 업데이트)
  const handleSearchInputChange = useCallback((value: string) => {
    setLocalInputs(prev => ({
      ...prev,
      search: value,
    }));
  }, []);

  // 가격 입력 핸들러 (로컬 상태만 업데이트)
  const handlePriceInputChange = useCallback(
    (type: 'min' | 'max', value: string) => {
      setLocalInputs(prev => ({
        ...prev,
        [type === 'min' ? 'minPrice' : 'maxPrice']: value,
      }));
    },
    []
  );

  // 검색 실행 (엔터키 또는 버튼 클릭)
  const executeSearch = useCallback(() => {
    onFiltersChange({
      ...filters,
      search: localInputs.search,
    });
  }, [filters, localInputs.search, onFiltersChange]);

  // 가격 필터 적용
  const applyPriceFilter = useCallback(() => {
    const minPrice =
      localInputs.minPrice === '' ? null : parseInt(localInputs.minPrice);
    const maxPrice =
      localInputs.maxPrice === '' ? null : parseInt(localInputs.maxPrice);

    // 가격 범위 유효성 검사
    if (minPrice !== null && maxPrice !== null && minPrice >= maxPrice) {
      alert('최소 가격은 최대 가격보다 작아야 합니다.');
      return;
    }

    onFiltersChange({
      ...filters,
      minPrice,
      maxPrice,
    });
  }, [filters, localInputs.minPrice, localInputs.maxPrice, onFiltersChange]);

  // 엔터키 핸들러
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent, action: 'search' | 'price') => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (action === 'search') {
          executeSearch();
        } else if (action === 'price') {
          applyPriceFilter();
        }
      }
    },
    [executeSearch, applyPriceFilter]
  );

  // 카테고리 토글 (체크박스만 클릭 가능)
  const handleCategoryToggle = useCallback(
    (category: string) => {
      const newCategories = filters.category.includes(category)
        ? filters.category.filter(c => c !== category)
        : [...filters.category, category];

      onFiltersChange({
        ...filters,
        category: newCategories,
      });
    },
    [filters, onFiltersChange]
  );

  // 브랜드 토글 (체크박스만 클릭 가능)
  const handleBrandToggle = useCallback(
    (brand: string) => {
      const newBrands = filters.brand.includes(brand)
        ? filters.brand.filter(b => b !== brand)
        : [...filters.brand, brand];

      onFiltersChange({
        ...filters,
        brand: newBrands,
      });
    },
    [filters, onFiltersChange]
  );

  // 정렬 변경 (즉시 적용)
  const handleSortChange = useCallback(
    (optionIndex: number) => {
      const option = SORT_OPTIONS[optionIndex];
      onFiltersChange({
        ...filters,
        sortBy: option.value,
        sortOrder: 'desc', // 백엔드에서 사용하지 않는 값이므로 기본값으로 설정
      });
    },
    [filters, onFiltersChange]
  );

  // 가격 범위 빠른 선택 (토글 기능 포함)
  const handleQuickPriceSelect = useCallback(
    (range: { min?: number; max?: number }) => {
      // 현재 선택된 범위와 동일한지 확인
      const isSameRange =
        filters.minPrice === (range.min || null) &&
        filters.maxPrice === (range.max || null);

      if (isSameRange) {
        // 같은 범위를 다시 클릭하면 초기화
        onFiltersChange({
          ...filters,
          minPrice: null,
          maxPrice: null,
        });
      } else {
        // 다른 범위를 클릭하면 해당 범위로 설정
        onFiltersChange({
          ...filters,
          minPrice: range.min || null,
          maxPrice: range.max || null,
        });
      }
    },
    [filters, onFiltersChange]
  );

  // 활성 필터 개수 계산 (검색어 제외)
  const activeFiltersCount = [
    filters.category.length > 0,
    filters.brand.length > 0,
    filters.minPrice !== null,
    filters.maxPrice !== null,
  ].filter(Boolean).length;

  // ========================================
  // Render
  // ========================================

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-6">
      {/* 검색창 + 기본 컨트롤 */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* 검색창 */}
        <div className="flex-1 max-w-md">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="상품명, 브랜드로 검색..."
                value={localInputs.search}
                onChange={e => handleSearchInputChange(e.target.value)}
                onKeyPress={e => handleKeyPress(e, 'search')}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* 검색 버튼 */}
            <button
              type="button"
              onClick={executeSearch}
              disabled={isLoading || localInputs.search === filters.search}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              검색
            </button>
          </div>
        </div>

        {/* 정렬 + 필터 토글 버튼 */}
        <div className="flex gap-3 items-center">
          {/* 정렬 선택 */}
          <select
            value={SORT_OPTIONS.findIndex(opt => opt.value === filters.sortBy)}
            onChange={e => handleSortChange(parseInt(e.target.value))}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {SORT_OPTIONS.map((option, index) => (
              <option key={index} value={index}>
                {option.label}
              </option>
            ))}
          </select>

          {/* 고급 필터 토글 */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            disabled={isLoading}
            className={`relative px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                />
              </svg>
              필터
            </span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* 초기화 버튼 */}
          {(activeFiltersCount > 0 || filters.search.length > 0) && (
            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 고급 필터 패널 */}
      {showFilters && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          {/* 활성 필터 표시 */}
          {(filters.category.length > 0 || filters.brand.length > 0) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                활성 필터:
              </h4>
              <div className="flex flex-wrap gap-2">
                {filters.category.map(category => (
                  <span
                    key={category}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    카테고리: {category}
                  </span>
                ))}
                {filters.brand.map(brand => (
                  <span
                    key={brand}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    브랜드: {brand}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 카테고리 필터 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                카테고리
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableCategories.map(category => (
                  <div key={category} className="flex items-center">
                    <input
                      id={`category-${category}`}
                      type="checkbox"
                      checked={filters.category.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      disabled={isLoading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 브랜드 필터 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">브랜드</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableBrands.map(brand => (
                  <div key={brand} className="flex items-center">
                    <input
                      id={`brand-${brand}`}
                      type="checkbox"
                      checked={filters.brand.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                      disabled={isLoading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label
                      htmlFor={`brand-${brand}`}
                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                    >
                      {brand}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 가격 범위 필터 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                가격 범위
              </h3>
              <div className="space-y-3">
                {/* 가격 입력 필드 */}
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="최소 가격"
                      value={localInputs.minPrice}
                      onChange={e =>
                        handlePriceInputChange('min', e.target.value)
                      }
                      onKeyPress={e => handleKeyPress(e, 'price')}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <span className="text-gray-500">~</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="최대 가격"
                      value={localInputs.maxPrice}
                      onChange={e =>
                        handlePriceInputChange('max', e.target.value)
                      }
                      onKeyPress={e => handleKeyPress(e, 'price')}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* 가격 필터 적용 버튼 */}
                <button
                  type="button"
                  onClick={applyPriceFilter}
                  disabled={
                    isLoading ||
                    (localInputs.minPrice ===
                      (filters.minPrice?.toString() || '') &&
                      localInputs.maxPrice ===
                        (filters.maxPrice?.toString() || ''))
                  }
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  가격 필터 적용
                </button>

                {/* 가격 범위 빠른 선택 */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '10만원 이하', max: 100000 },
                    { label: '10-50만원', min: 100000, max: 500000 },
                    { label: '50-100만원', min: 500000, max: 1000000 },
                    { label: '100만원 이상', min: 1000000 },
                  ].map((range, index) => {
                    // 현재 선택된 범위인지 확인
                    const isSelected =
                      filters.minPrice === (range.min || null) &&
                      filters.maxPrice === (range.max || null);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleQuickPriceSelect(range)}
                        disabled={isLoading}
                        className={`px-3 py-1 text-xs border rounded-full transition-colors disabled:opacity-50 ${
                          isSelected
                            ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
