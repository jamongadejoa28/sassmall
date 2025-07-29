// ========================================
// AddToCartModal - 실제 쇼핑몰 수준의 장바구니 추가 모달
// client/src/frameworks/ui/components/AddToCartModal.tsx
// ========================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartProduct } from '../../../types/cart-type/CartProduct';
import { useCartSummary, useCartActions } from '../../state/cartStoreLocal';
import { ROUTES } from '../../../shared/constants/routes';

// ========================================
// Types & Interfaces
// ========================================

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CartProduct;
  addedQuantity: number;
}

// ========================================
// AddToCartModal 컴포넌트
// ========================================

const AddToCartModal: React.FC<AddToCartModalProps> = ({
  isOpen,
  onClose,
  product,
  addedQuantity,
}) => {
  const navigate = useNavigate();
  const { totalQuantity, totalPrice, itemCount, loading } = useCartSummary();
  const { loadCart } = useCartActions();

  // ========================================
  // Effects
  // ========================================

  // 모달이 열릴 때 장바구니 데이터를 다시 로드
  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen, loadCart]);

  // ========================================
  // 이벤트 핸들러
  // ========================================

  const handleViewCart = () => {
    onClose();
    navigate(ROUTES.CART);
  };

  const handleContinueShopping = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ========================================
  // 유틸리티 함수
  // ========================================

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-transform scale-100"
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              장바구니에 추가되었습니다!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 상품 정보 */}
        <div className="p-6">
          <div className="flex items-start space-x-4">
            {/* 상품 이미지 */}
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
              {product.image_urls && product.image_urls.length > 0 ? (
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <svg
                  className="w-8 h-8 text-gray-400"
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

            {/* 상품 정보 */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                {product.name}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                브랜드: {product.brand}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(product.price)}
                </span>
                <span className="text-sm text-gray-500">
                  수량: {addedQuantity}개
                </span>
              </div>
            </div>
          </div>

          {/* 장바구니 요약 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 mb-3">
              장바구니 요약
            </h5>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">총 상품</span>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">총 수량</span>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">
                      총 금액
                    </span>
                    <div className="h-5 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">총 상품</span>
                  <span className="font-medium">{itemCount}개 품목</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">총 수량</span>
                  <span className="font-medium">{totalQuantity}개</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">
                      총 금액
                    </span>
                    <span className="text-base font-bold text-blue-600">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼들 */}
          <div className="mt-6 space-y-3">
            {/* 장바구니 확인하기 */}
            <button
              onClick={handleViewCart}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 5H3m4 8v2a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              장바구니 확인하기
            </button>

            {/* 쇼핑 계속하기 */}
            <button
              onClick={handleContinueShopping}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              쇼핑 계속하기
            </button>
          </div>

          {/* 추가 정보 */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              💝 5만원 이상 구매 시 무료배송 🚚
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToCartModal;
