// ========================================
// Admin Products - 상품 관리 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminProducts.tsx
// ========================================

import React, { useState, useCallback, useEffect } from 'react';
import { useAdminProducts } from '../../../../adapters/hooks/useAdminProducts';
import {
  ProductFilter,
  Product,
  Category,
} from '../../../../shared/types/product';
import { ProductAddModal } from '../../components/Admin/ProductAddModal';
import { ProductEditModal } from '../../components/Admin/ProductEditModal';
import {
  CreateProductRequest,
  UpdateProductRequest,
} from '../../../../adapters/api/ProductApiAdapter';

/**
 * AdminProducts - 상품 관리 페이지
 *
 * 기능:
 * - 상품 목록 조회 및 관리
 * - 상품 검색 및 필터링
 * - 상품 추가/수정/삭제
 * - 재고 관리
 * - 카테고리 관리
 */
const AdminProducts: React.FC = () => {
  const {
    products,
    categories,
    loading,
    error,
    pagination,
    stats,
    statsLoading,
    fetchProducts,
    refreshProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
  } = useAdminProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalLoading, setAddModalLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 현재 페이지 상태 추가
  const [currentPage, setCurrentPage] = useState(1);

  // 필터 적용 함수
  const applyFilters = useCallback(
    (page: number = 1) => {
      const filters: ProductFilter = {
        page: page,
        limit: 10, // 페이지당 10개 항목
      };

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      // 상태 필터 추가
      if (statusFilter === 'active') {
        filters.isActive = true;
      } else if (statusFilter === 'inactive') {
        filters.isActive = false;
      } else if (statusFilter === 'out_of_stock') {
        filters.stockStatus = 'outOfStock';
      }
      // statusFilter === 'all'이면 isActive를 설정하지 않음 (모든 상품 조회)

      fetchProducts(filters);
    },
    [searchQuery, selectedCategory, statusFilter, fetchProducts]
  );

  // 페이지 변경 함수들
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      applyFilters(page);
    },
    [applyFilters]
  );

  const goToPreviousPage = useCallback(() => {
    if (pagination?.hasPreviousPage && currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [pagination?.hasPreviousPage, currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [pagination?.hasNextPage, currentPage, goToPage]);

  // 검색 및 필터링 처리
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setCurrentPage(1); // 검색 시 첫 페이지로 이동
      applyFilters(1);
    },
    [applyFilters]
  );

  // 검색어나 필터가 변경될 때 자동으로 적용
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
      applyFilters(1);
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, statusFilter, applyFilters]);

  // 포맷팅 함수들
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStockStatus = (quantity: number, threshold: number = 10) => {
    if (quantity === 0) return { text: '품절', color: 'text-red-600' };
    if (quantity <= threshold)
      return { text: '부족', color: 'text-yellow-600' };
    return { text: '충분', color: 'text-green-600' };
  };

  // 상품 추가 처리
  const handleAddProduct = useCallback(
    async (productData: CreateProductRequest) => {
      setAddModalLoading(true);
      try {
        await createProduct(productData);
        // 성공 시 모달 닫기
        setShowAddModal(false);
        // 성공 메시지는 useAdminProducts에서 처리
      } catch (error) {
        // 에러 메시지는 useAdminProducts에서 처리
        throw error;
      } finally {
        setAddModalLoading(false);
      }
    },
    [createProduct]
  );

  // 상품 수정 처리
  const handleEditProduct = useCallback(
    async (productId: string, productData: UpdateProductRequest) => {
      setEditModalLoading(true);
      try {
        await updateProduct(productId, productData);
        // 성공 메시지는 useAdminProducts에서 처리
        setShowEditModal(false);
        setSelectedProduct(null);
      } catch (error) {
        // 에러 메시지는 useAdminProducts에서 처리
        throw error;
      } finally {
        setEditModalLoading(false);
      }
    },
    [updateProduct]
  );

  // 상품 수정 모달 열기
  const openEditModal = useCallback((product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  }, []);

  // 상품 수정 모달 닫기
  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedProduct(null);
    setEditModalLoading(false);
  }, []);

  // 상품 삭제 처리
  const handleDeleteProduct = useCallback(
    async (productId: string, productName: string) => {
      if (
        !window.confirm(
          `"${productName}" 상품을 정말로 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 상품이 완전히 삭제됩니다.`
        )
      ) {
        return;
      }

      try {
        await deleteProduct(productId);
        // 성공 메시지는 useAdminProducts에서 처리
      } catch (error) {
        // 에러 메시지는 useAdminProducts에서 처리
        console.error('상품 삭제 실패:', error);
      }
    },
    [deleteProduct]
  );

  // 상품 상태 토글 처리
  const handleToggleProductStatus = useCallback(
    async (productId: string, currentStatus: boolean, productName: string) => {
      const newStatus = !currentStatus;
      const statusText = newStatus ? '활성화' : '비활성화';

      if (
        !window.confirm(`"${productName}" 상품을 ${statusText}하시겠습니까?`)
      ) {
        return;
      }

      try {
        await toggleProductStatus(productId, newStatus);
        // 성공 메시지는 useAdminProducts에서 처리
      } catch (error) {
        // 에러 메시지는 useAdminProducts에서 처리
        console.error('상품 상태 변경 실패:', error);
      }
    },
    [toggleProductStatus]
  );

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-gray-600 mt-1">상품 등록 및 재고 관리</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            가져오기
          </button>
          <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            내보내기
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>상품 추가</span>
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between space-x-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="상품 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
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
          </form>

          <div className="flex items-center space-x-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">전체 카테고리</option>
              {categories.map((category: Category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="out_of_stock">품절</option>
            </select>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 상품</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '--' : stats?.totalProducts || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">재고 부족</p>
              <p className="text-2xl font-bold text-red-600">
                {statsLoading ? '--' : stats?.lowStockProducts || 0}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 상품</p>
              <p className="text-2xl font-bold text-green-600">
                {statsLoading ? '--' : stats?.activeProducts || 0}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 카테고리</p>
              <p className="text-2xl font-bold text-purple-600">
                {statsLoading
                  ? '--'
                  : stats?.totalCategories || categories.length}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14-4V7a2 2 0 00-2-2m4 6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h2M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 상품 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">상품 목록</h3>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <button className="text-sm text-gray-500 hover:text-gray-700">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 테이블 컬럼 헤더 */}
        <div
          className="hidden md:grid gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500"
          style={{ gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1fr 1.5fr 1fr' }}
        >
          <div className="flex items-center">
            <input type="checkbox" className="mr-3" />
            상품
          </div>
          <div>카테고리</div>
          <div>가격</div>
          <div>재고</div>
          <div>상태</div>
          <div>등록일</div>
          <div>액션</div>
        </div>

        {/* 상품 목록 또는 빈 상태 */}
        {loading ? (
          <div className="px-6 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">상품 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="px-6 py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                오류 발생
              </h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={refreshProducts}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="px-6 py-12">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                상품이 없습니다
              </h3>
              <p className="text-gray-500">첫 번째 상품을 추가해보세요</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                첫 번째 상품 추가하기
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {products.map((product: Product) => {
              const stockStatus = getStockStatus(
                product.inventory.availableQuantity
              );
              return (
                <div key={product.id} className="px-6 py-4 hover:bg-gray-50">
                  <div
                    className="flex flex-col space-y-2 md:grid md:gap-4 md:items-center md:space-y-0"
                    style={{
                      gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1fr 1.5fr 1fr',
                    }}
                  >
                    {/* 상품 정보 */}
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded" />
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.thumbnail_url ? (
                            <img
                              src={product.thumbnail_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg
                              className="w-6 h-6 text-gray-400"
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
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {product.name}
                          </h4>
                          <p className="text-sm text-gray-500 truncate">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 카테고리 */}
                    <div className="text-sm text-gray-600 truncate">
                      <span className="md:hidden font-medium text-gray-500">
                        카테고리:{' '}
                      </span>
                      {product.category.name}
                    </div>

                    {/* 가격 */}
                    <div>
                      <span className="md:hidden font-medium text-gray-500">
                        가격:{' '}
                      </span>
                      <div className="space-y-1">
                        {/* 할인이 있는 경우 */}
                        {product.discountPercentage > 0 ||
                        (product.discount_percent &&
                          product.discount_percent > 0) ? (
                          <>
                            {/* 할인가 */}
                            <div className="font-medium text-red-600">
                              {formatPrice(
                                product.discountPrice || product.price
                              )}
                              <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full">
                                {Math.round(
                                  product.discountPercentage ||
                                    product.discount_percent ||
                                    0
                                )}
                                % 할인
                              </span>
                            </div>
                            {/* 원가 */}
                            <div className="text-sm text-gray-500 line-through">
                              {formatPrice(
                                product.original_price || product.price
                              )}
                            </div>
                          </>
                        ) : (
                          /* 할인이 없는 경우 */
                          <div className="font-medium text-gray-900">
                            {formatPrice(product.price)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 재고 */}
                    <div>
                      <span className="md:hidden font-medium text-gray-500">
                        재고:{' '}
                      </span>
                      <div className="font-medium text-gray-900 inline">
                        {product.inventory.availableQuantity}
                      </div>
                      <div
                        className={`text-sm ${stockStatus.color} inline ml-2`}
                      >
                        ({stockStatus.text})
                      </div>
                    </div>

                    {/* 상태 */}
                    <div>
                      <span className="md:hidden font-medium text-gray-500">
                        상태:{' '}
                      </span>
                      <div className="flex flex-col space-y-1">
                        {/* 현재 상태 표시 */}
                        <div
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {product.is_active ? '활성' : '비활성'}
                        </div>
                        {/* 토글 버튼 */}
                        <button
                          onClick={() =>
                            handleToggleProductStatus(
                              product.id,
                              product.is_active, // 현재 상태 전달
                              product.name
                            )
                          }
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded transition-colors hover:opacity-80 ${
                            product.is_active
                              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          title={`클릭하여 ${product.is_active ? '비활성화' : '활성화'}`}
                        >
                          {product.is_active ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </div>

                    {/* 등록일 */}
                    <div className="text-sm text-gray-600">
                      <span className="md:hidden font-medium text-gray-500">
                        등록일:{' '}
                      </span>
                      {formatDate(product.created_at || product.createdAt)}
                    </div>

                    {/* 액션 */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        수정
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteProduct(product.id, product.name)
                        }
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                총 {pagination.totalItems}개 상품 중{' '}
                {(pagination.currentPage - 1) * 10 + 1} -{' '}
                {Math.min(pagination.currentPage * 10, pagination.totalItems)}개
                표시
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 상품 추가 모달 */}
      <ProductAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddProduct}
        categories={categories}
        loading={addModalLoading}
      />

      {/* 상품 수정 모달 */}
      <ProductEditModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        onSubmit={handleEditProduct}
        categories={categories}
        product={selectedProduct}
        loading={editModalLoading}
      />
    </div>
  );
};

export default AdminProducts;
