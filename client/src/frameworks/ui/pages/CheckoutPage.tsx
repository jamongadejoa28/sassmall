import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartSummary, useCartActions } from '../../state/cartStoreLocal';
import { useAuthStore } from '../../state/authStore';
import { OrderApiAdapter } from '../../../adapters/api/OrderApiAdapter';
import { AddressModal } from '../components/AddressModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AddressData } from '../components/AddressSearch';
import TossPaymentsWidget, {
  TossPaymentsWidgetRef,
} from '../components/TossPaymentsWidget';

interface ShippingAddress {
  postalCode: string;
  address: string;
  detailAddress: string;
  recipientName: string;
  recipientPhone: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalPrice, isEmpty } = useCartSummary();
  const { clearCart } = useCartActions();
  const { user, isAuthenticated } = useAuthStore();

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    postalCode: user?.postalCode || '',
    address: user?.address || '',
    detailAddress: user?.detailAddress || '',
    recipientName: user?.name || '',
    recipientPhone: user?.phoneNumber || '',
  });

  const [paymentMethod] = useState<'TOSSPAYMENTS'>('TOSSPAYMENTS'); // TossPayments 결제
  const [memo, setMemo] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPaymentWidgetReady, setIsPaymentWidgetReady] = useState(false);
  const paymentWidgetRef = useRef<TossPaymentsWidgetRef>(null);

  // orderId를 컴포넌트 마운트 시점에 고정 (재렌더링 방지)
  const [orderId] = useState(
    () => `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // TossPayments 위젯 콜백 함수들
  const handleWidgetReady = useCallback(() => {
    setIsPaymentWidgetReady(true);
  }, []);

  const handleWidgetError = useCallback((error: any) => {
    console.error('❌ [CheckoutPage] TossPayments 위젯 오류:', error);
    setIsPaymentWidgetReady(false);
    alert('결제 위젯 로드 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
  }, []);

  // 로그인 체크
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
  }, [isAuthenticated, navigate]);

  // 빈 장바구니 체크
  useEffect(() => {
    if (isEmpty) {
      navigate('/cart');
      return;
    }
  }, [isEmpty, navigate]);

  // 배송비 계산 (5만원 이상 무료배송)
  const shippingFee = totalPrice >= 50000 ? 0 : 3000;
  const finalAmount = totalPrice + shippingFee;

  const handleAddressSearch = (data: AddressData) => {
    setShippingAddress(prev => ({
      ...prev,
      postalCode: data.zonecode,
      address: data.address,
    }));
  };

  const validateForm = (): string | null => {
    if (!shippingAddress.postalCode) return '우편번호를 입력해주세요';
    if (!shippingAddress.address) return '주소를 입력해주세요';
    if (!shippingAddress.recipientName?.trim())
      return '수령인 이름을 입력해주세요';
    if (!shippingAddress.recipientPhone?.trim())
      return '수령인 전화번호를 입력해주세요';

    // 전화번호 형식 검증
    const phoneRegex = /^010\d{8}$/;
    if (
      !phoneRegex.test(shippingAddress.recipientPhone.replace(/[-\s]/g, ''))
    ) {
      return '올바른 휴대폰 번호를 입력해주세요 (010XXXXXXXX)';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    if (!isPaymentWidgetReady) {
      alert('결제 위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderApiAdapter = new OrderApiAdapter();

      // 1. 주문 데이터 구성
      const orderData = {
        cartItems: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productPrice: item.product.price,
          quantity: item.quantity,
          productImageUrl: item.product.imageUrls?.[0] || '',
          productOptions: {},
        })),
        shippingAddress: {
          postalCode: shippingAddress.postalCode,
          address: shippingAddress.address,
          detailAddress: shippingAddress.detailAddress || '',
          recipientName: shippingAddress.recipientName,
          recipientPhone: shippingAddress.recipientPhone.replace(/[-\s]/g, ''),
        },
        paymentMethod,
        memo: memo.trim() || undefined,
      };

      // 2. 주문 생성
      const orderResponse = await orderApiAdapter.createOrder(orderData);

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || '주문 생성에 실패했습니다');
      }

      // 3. TossPayments 결제 요청
      const serverOrderId = orderResponse.data!.orderId;
      const currentUrl = window.location.origin;

      const successUrl = `${currentUrl}/orders/${serverOrderId}/payment/success`;
      const failUrl = `${currentUrl}/orders/${serverOrderId}/payment/fail`;

      // TossPayments Widget을 통한 결제 요청
      if (paymentWidgetRef.current) {
        await paymentWidgetRef.current.requestPayment(successUrl, failUrl);
      } else {
        throw new Error('결제 위젯 참조를 찾을 수 없습니다');
      }

      // 장바구니 비우기 (결제 성공 시 처리됨)
      await clearCart();
    } catch (error: any) {
      console.error('주문/결제 처리 오류:', error);
      alert(error.message || '주문 처리 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (!isAuthenticated || isEmpty) {
    return null; // 리다이렉트 처리 중
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">주문/결제</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 주문 정보 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주문 상품 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              주문 상품
            </h2>
            <div className="space-y-4">
              {items.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0"
                >
                  <img
                    src={
                      item.product.imageUrls?.[0] || '/images/placeholder.png'
                    }
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      수량: {item.quantity}개
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {(item.product.price * item.quantity).toLocaleString()}원
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 배송 정보 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              배송 정보
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송지 주소 *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    readOnly
                    placeholder="우편번호"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    주소검색
                  </button>
                </div>
                <input
                  type="text"
                  value={shippingAddress.address}
                  readOnly
                  placeholder="주소"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <input
                  type="text"
                  value={shippingAddress.detailAddress}
                  onChange={e =>
                    setShippingAddress(prev => ({
                      ...prev,
                      detailAddress: e.target.value,
                    }))
                  }
                  placeholder="상세주소"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수령인 *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.recipientName}
                    onChange={e =>
                      setShippingAddress(prev => ({
                        ...prev,
                        recipientName: e.target.value,
                      }))
                    }
                    placeholder="받으실 분 이름"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    휴대폰 번호 *
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.recipientPhone}
                    onChange={e =>
                      setShippingAddress(prev => ({
                        ...prev,
                        recipientPhone: e.target.value,
                      }))
                    }
                    placeholder="010-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 결제 방법 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              결제 방법
            </h2>
            <TossPaymentsWidget
              amount={finalAmount}
              orderId={orderId}
              orderName={`주문 ${items.length}개 상품`}
              customerEmail={user?.email}
              customerName={user?.name}
              onReady={handleWidgetReady}
              onError={handleWidgetError}
              ref={paymentWidgetRef}
            />
          </div>

          {/* 배송 메모 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              배송 메모
            </h2>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="배송 시 요청사항을 입력해주세요 (선택사항)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 주문 요약 */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              주문 요약
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>상품금액</span>
                <span>{totalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>배송비</span>
                <span>
                  {shippingFee === 0
                    ? '무료'
                    : `${shippingFee.toLocaleString()}원`}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-semibold text-gray-900">
                  <span>총 결제금액</span>
                  <span>{finalAmount.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {shippingFee === 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  🚚 5만원 이상 구매로 무료배송!
                </p>
              </div>
            )}

            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isSubmitting || isEmpty || !isPaymentWidgetReady}
              className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <span className="text-xl">💳</span>
              <span>
                {isSubmitting
                  ? '결제 처리 중...'
                  : !isPaymentWidgetReady
                    ? '결제 위젯 로딩 중...'
                    : `${finalAmount.toLocaleString()}원 결제하기`}
              </span>
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              TossPayments로 안전하게 결제됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 주소 검색 모달 */}
      {isAddressModalOpen && (
        <AddressModal
          isOpen={isAddressModalOpen}
          onAddressSelect={handleAddressSearch}
          onClose={() => setIsAddressModalOpen(false)}
        />
      )}

      {/* 주문 확인 다이얼로그 */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="결제 확인"
          message={`총 ${finalAmount.toLocaleString()}원을 TossPayments로 결제하시겠습니까?`}
          confirmText="결제하기"
          cancelText="취소"
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirmDialog(false)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
