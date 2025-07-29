import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/authStore';
import {
  OrderApiAdapter,
  OrderDetails,
} from '../../../adapters/api/OrderApiAdapter';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import TossPaymentsWidget, {
  TossPaymentsWidgetRef,
} from '../components/TossPaymentsWidget';

const PaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentWidgetReady, setIsPaymentWidgetReady] = useState(false);
  const paymentWidgetRef = useRef<TossPaymentsWidgetRef>(null);

  // 로그인 체크
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/orders');
      return;
    }
  }, [isAuthenticated, navigate]);

  // 주문 정보 로드
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || !isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        const orderApiAdapter = new OrderApiAdapter();
        const response = await orderApiAdapter.getOrder(orderId);

        if (response.success && response.data) {
          setOrder(response.data.order);

          // 결제 불가능한 상태라면 주문 상세로 리다이렉트
          if (response.data.order.status !== 'PENDING') {
            navigate(`/orders/${orderId}`, {
              state: {
                message: '이미 결제가 완료되었거나 결제할 수 없는 주문입니다.',
              },
            });
          }
        } else {
          throw new Error(response.message || '주문 정보를 불러올 수 없습니다');
        }
      } catch (error: any) {
        console.error('주문 정보 로드 오류:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, isAuthenticated, navigate]);

  // TossPayments 결제 요청 처리
  const handlePaymentRequest = async () => {
    if (!paymentWidgetRef.current || !order) {
      alert('결제 위젯이 준비되지 않았습니다.');
      return;
    }

    try {
      const currentUrl = window.location.origin;
      const successUrl = `${currentUrl}/orders/${orderId}/payment/success`;
      const failUrl = `${currentUrl}/orders/${orderId}/payment/fail`;

      await paymentWidgetRef.current.requestPayment(successUrl, failUrl);
    } catch (error: any) {
      console.error('TossPayments 결제 요청 오류:', error);
      alert(error.message || '결제 요청 중 오류가 발생했습니다');
    }
  };

  if (!isAuthenticated) {
    return null; // 리다이렉트 처리 중
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              결제 처리 중 오류가 발생했습니다
            </p>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                다시 시도
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                주문 목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">주문 정보를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/orders/${orderId}`)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          주문 상세로 돌아가기
        </button>

        <h1 className="text-3xl font-bold text-gray-900">TossPayments 결제</h1>
        <p className="text-gray-600 mt-1">주문번호: {order.orderNumber}</p>
      </div>

      <div className="space-y-6">
        {/* 주문 요약 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            주문 요약
          </h2>

          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center space-x-4">
                <img
                  src={item.productImageUrl || '/images/placeholder.png'}
                  alt={item.productName}
                  className="w-16 h-16 object-cover rounded-md"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {item.productName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.productPrice.toLocaleString()}원 × {item.quantity}개
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {item.totalPrice.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 결제 금액 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            결제 금액
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>상품금액</span>
              <span>{order.subtotal.toLocaleString()}원</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>배송비</span>
              <span>
                {order.shippingFee === 0
                  ? '무료'
                  : `${order.shippingFee.toLocaleString()}원`}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-xl font-semibold text-gray-900">
                <span>총 결제금액</span>
                <span>{order.totalAmount.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>

        {/* TossPayments 결제 위젯 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <TossPaymentsWidget
            amount={order.totalAmount}
            orderId={order.id}
            orderName={`주문 ${order.items.length}개 상품`}
            customerEmail={user?.email}
            customerName={user?.name}
            onReady={() => setIsPaymentWidgetReady(true)}
            onError={error => {
              console.error('TossPayments 위젯 오류:', error);
              setError('결제 위젯 로드 중 오류가 발생했습니다');
            }}
            ref={paymentWidgetRef}
          />
        </div>

        {/* 결제 버튼 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button
            onClick={handlePaymentRequest}
            disabled={!isPaymentWidgetReady}
            className="w-full py-4 px-6 bg-blue-600 text-white font-semibold text-lg rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {!isPaymentWidgetReady ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner />
                <span className="ml-2">결제 위젯 로딩 중...</span>
              </div>
            ) : (
              `${order.totalAmount.toLocaleString()}원 TossPayments로 결제하기`
            )}
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            TossPayments를 통해 안전하게 결제됩니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
