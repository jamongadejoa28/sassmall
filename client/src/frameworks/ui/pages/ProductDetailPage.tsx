// ProductDetailPage.tsx - API 응답 구조에 맞춰 수정된 상품 상세 페이지
// Clean Architecture: UI Pages Layer
// 위치: client/src/frameworks/ui/pages/ProductDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartActions } from '../../state/cartStoreLocal';
import { useAuthStore } from '../../state/authStore';
import AddToCartModal from '../components/AddToCartModal';
import ProductReviews from '../components/ProductReviews';
import ProductQnA from '../components/ProductQnA';
import { CartProduct } from '../../../types/cart-type/CartProduct';

// ========================================
// Types & Interfaces (실제 API 응답에 맞춤)
// ========================================

interface ProductDetailData {
  id: string;
  name: string;
  description: string;
  price: number; // 할인된 최종 판매가
  originalPrice?: number; // 원가 (할인이 있는 경우에만)
  discountPercentage?: number; // 할인율
  sku: string;
  brand: string;
  tags: string[];
  isActive: boolean;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
    lowStockThreshold: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: ProductDetailData;
  timestamp: string;
  requestId: string;
}

// ========================================
// ProductDetailPage Component
// ========================================

const ProductDetailPage: React.FC = () => {
  // ========================================
  // State Management
  // ========================================

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartActions();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showAddToCartModal, setShowAddToCartModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'qna'>(
    'description'
  );

  // ========================================
  // API Functions
  // ========================================

  const fetchProductDetail = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/products/${productId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('상품을 찾을 수 없습니다.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setProduct(data.data);
      } else {
        throw new Error(data.message || '상품 정보를 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      const errorMessage =
        err.message || '상품 정보를 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // Event Handlers
  // ========================================

  const handleQuantityChange = useCallback(
    (value: number) => {
      const maxQuantity = product?.inventory?.availableQuantity || 1;
      const newQuantity = Math.max(1, Math.min(value, maxQuantity));
      setQuantity(newQuantity);
    },
    [product?.inventory?.availableQuantity]
  );

  const handleAddToCart = useCallback(async () => {
    if (!product || isAddingToCart) return;

    try {
      setIsAddingToCart(true);

      // CartProduct 객체 생성 - API 응답 구조에 맞게 수정
      const cartProduct: CartProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price, // price는 이미 할인된 최종 판매가
        brand: product.brand,
        sku: product.sku,
        category: {
          id: product.category?.id || '',
          name: product.category?.name || '',
          slug: product.category?.slug || '',
        },
        inventory: {
          availableQuantity: product.inventory?.availableQuantity || 0,
          status: product.inventory?.status || 'out_of_stock',
          location: 'MAIN_WAREHOUSE',
        },
        image_urls: [],
        rating: 4.5,
        review_count: 0,
        is_featured: false,
        min_order_quantity: 1,
        max_order_quantity: 10,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // localStorage 기반 장바구니에 추가
      await addItem(cartProduct, quantity);

      // 장바구니 상태가 완전히 업데이트될 때까지 잠깐 대기
      setTimeout(() => {
        setShowAddToCartModal(true);
      }, 100);
    } catch (error: any) {
      console.error('장바구니 추가 실패:', error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        '장바구니 추가 중 오류가 발생했습니다.';

      toast.error(errorMessage, {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, isAddingToCart, addItem, quantity]);

  const handleBuyNow = useCallback(async () => {
    if (!product) return;

    // 인증 상태 확인
    if (!isAuthenticated) {
      // 미인증 사용자는 로그인 페이지로 이동 (주문 페이지로 돌아오도록 redirect 파라미터 설정)
      navigate('/login?redirect=/checkout');
      return;
    }

    try {
      // 먼저 장바구니에 상품 추가
      const cartProduct: CartProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        brand: product.brand,
        sku: product.sku,
        category: {
          id: product.category?.id || '',
          name: product.category?.name || '',
          slug: product.category?.slug || '',
        },
        inventory: {
          availableQuantity: product.inventory?.availableQuantity || 0,
          status: product.inventory?.status || 'out_of_stock',
          location: 'MAIN_WAREHOUSE',
        },
        image_urls: [],
        rating: 4.5,
        review_count: 0,
        is_featured: false,
        min_order_quantity: 1,
        max_order_quantity: 10,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await addItem(cartProduct, quantity);

      // 바로 주문 페이지로 이동
      navigate('/checkout');
    } catch (error: any) {
      console.error('바로구매 실패:', error);
      toast.error('바로구매 처리 중 오류가 발생했습니다.', {
        duration: 3000,
        icon: '❌',
      });
    }
  }, [product, isAuthenticated, navigate, addItem, quantity]);

  const handleBackToList = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
    } else {
      setError('상품 ID가 제공되지 않았습니다.');
      setLoading(false);
    }
  }, [id, fetchProductDetail]);

  // ========================================
  // Render Helpers
  // ========================================

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const getStockStatusColor = (availableQuantity: number): string => {
    if (availableQuantity === 0) {
      return 'text-red-600 bg-red-50 border-red-200';
    } else if (availableQuantity < 20) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    } else {
      return 'text-green-600 bg-green-50 border-green-200';
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

  const calculateDiscountRate = (): number => {
    // 새 API 구조에서는 discountPercentage를 직접 제공
    return Math.round(product?.discountPercentage || 0);
  };

  const hasDiscount = (): boolean => {
    return (product?.discountPercentage || 0) > 0;
  };

  const isOutOfStock = (): boolean => {
    return (
      product?.inventory?.status?.toLowerCase() === 'out_of_stock' ||
      (product?.inventory?.availableQuantity || 0) <= 0
    );
  };

  const isLowStock = (): boolean => {
    return (
      product?.inventory?.status?.toLowerCase() === 'low_stock' ||
      (product?.inventory?.availableQuantity || 0) <=
        (product?.inventory?.lowStockThreshold || 0)
    );
  };

  // ========================================
  // Loading & Error States
  // ========================================

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <svg
            className="h-16 w-16 mx-auto mb-4 text-red-400"
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
          <h3 className="text-lg font-medium text-red-900 mb-2">
            오류가 발생했습니다
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => id && fetchProductDetail(id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              상품 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">
            상품 정보를 찾을 수 없습니다
          </h3>
          <button
            onClick={handleBackToList}
            className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // Main Render
  // ========================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <button
          onClick={handleBackToList}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          상품 목록으로
        </button>
      </div>

      {/* 카테고리 경로 */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>홈</li>
          <li>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </li>
          <li>{product.category?.name || '카테고리'}</li>
        </ol>
      </nav>

      {/* 상품 상세 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 상품 이미지 섹션 */}
        <div className="space-y-4">
          {/* 메인 이미지 */}
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src={`${process.env.PUBLIC_URL}/images/${product.category?.slug}/${product.sku}.png`}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={e => {
                // 이미지 로드 실패 시 SVG 플레이스홀더로 대체
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <svg
                    class="h-32 w-32 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                `;
              }}
            />
          </div>

          {/* 썸네일 이미지들 */}
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map(index => (
              <div
                key={index}
                className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden"
              >
                <img
                  src={`${process.env.PUBLIC_URL}/images/${product.category?.slug}/${product.sku}.png`}
                  alt={`${product.name} 썸네일 ${index}`}
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  onError={e => {
                    // 이미지 로드 실패 시 SVG 플레이스홀더로 대체
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <svg
                        class="h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    `;
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 상품 정보 섹션 */}
        <div className="space-y-6">
          {/* 카테고리 태그와 추가 태그 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {product.category?.name || '카테고리'}
            </span>
            {product.tags &&
              product.tags.length > 0 &&
              product.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className={`text-sm font-medium px-3 py-1 rounded-full border ${
                    index === 0
                      ? 'text-blue-600 bg-blue-50 border-blue-200'
                      : 'text-green-600 bg-green-50 border-green-200'
                  }`}
                >
                  {tag}
                </span>
              ))}
          </div>

          {/* 상품명과 브랜드 */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            <p className="text-lg text-gray-600">{product.brand}</p>
          </div>

          {/* 가격 정보 */}
          <div className="border-t border-b border-gray-200 py-6">
            {hasDiscount() ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl font-bold text-red-600">
                    {formatPrice(product.price)} {/* 할인된 최종 판매가 */}
                  </span>
                  <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                    {calculateDiscountRate()}% 할인
                  </span>
                </div>
                <span className="text-lg text-gray-500 line-through">
                  {formatPrice(product.originalPrice || 0)} {/* 원가 */}
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* 재고 상태 */}
          {product.inventory && (
            <div
              className={`p-4 rounded-lg border ${getStockStatusColor(
                product.inventory.availableQuantity
              )}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {getStockStatusText(product.inventory.availableQuantity)}
                </span>
                <span className="text-sm">
                  재고: {product.inventory.availableQuantity}개
                </span>
              </div>
              {isLowStock() && !isOutOfStock() && (
                <p className="text-sm">재고가 부족합니다. 서둘러 주문하세요!</p>
              )}
            </div>
          )}

          {/* 수량 선택 */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                수량
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
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
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.inventory?.availableQuantity || 1}
                  value={quantity}
                  onChange={e =>
                    handleQuantityChange(parseInt(e.target.value) || 1)
                  }
                  className="w-20 text-center border border-gray-300 rounded-lg py-2"
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={
                    quantity >= (product.inventory?.availableQuantity || 1)
                  }
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 구매 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isOutOfStock() ? '품절' : '바로 구매'}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock() || isAddingToCart}
                className="w-full border border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-medium hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isAddingToCart ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    추가 중...
                  </>
                ) : (
                  '장바구니 담기'
                )}
              </button>
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">상품 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">SKU:</span>
                <span className="ml-2 font-medium">{product.sku}</span>
              </div>
              <div>
                <span className="text-gray-600">브랜드:</span>
                <span className="ml-2 font-medium">{product.brand}</span>
              </div>
            </div>
          </div>

          {/* 태그 */}
          {product.tags && product.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">태그</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 상품 상세 정보 탭 */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'description'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              상품 상세정보
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reviews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              상품리뷰
            </button>
            <button
              onClick={() => setActiveTab('qna')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qna'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              상품문의
            </button>
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-8">
          {activeTab === 'description' && (
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                상품 상세 설명
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {activeTab === 'reviews' && <ProductReviews productId={product.id} />}

          {activeTab === 'qna' && <ProductQnA productId={product.id} />}
        </div>
      </div>

      {/* 추가 정보 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 배송 정보 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">배송 정보</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 무료배송 (5만원 이상 구매 시)</p>
            <p>• 평일 오후 2시 이전 주문 시 당일 출고</p>
            <p>• 배송기간: 1-2일 (주말/공휴일 제외)</p>
          </div>
        </div>

        {/* 교환/반품 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">교환/반품</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 14일 이내 교환/반품 가능</p>
            <p>• 상품 하자 시 무료 교환/반품</p>
            <p>• 단순 변심 시 배송비 고객 부담</p>
          </div>
        </div>
      </div>

      {/* AddToCartModal */}
      {product && (
        <AddToCartModal
          isOpen={showAddToCartModal}
          onClose={() => setShowAddToCartModal(false)}
          product={{
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price, // price는 이미 할인된 최종 판매가
            brand: product.brand,
            sku: product.sku,
            category: {
              id: product.category?.id || '',
              name: product.category?.name || '',
              slug: product.category?.slug || '',
            },
            inventory: {
              availableQuantity: product.inventory?.availableQuantity || 0,
              status: product.inventory?.status || 'out_of_stock',
              location: 'MAIN_WAREHOUSE',
            },
            image_urls: [],
            rating: 4.5,
            review_count: 0,
            is_featured: false,
            min_order_quantity: 1,
            max_order_quantity: 10,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          addedQuantity={quantity}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
