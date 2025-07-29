import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/authStore';
import {
  OrderApiAdapter,
  OrderDetails,
} from '../../../adapters/api/OrderApiAdapter';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';

// 주문 상태 한글 변환
const getOrderStatusText = (
  status: string
): { text: string; color: string; description: string } => {
  const statusMap: Record<
    string,
    { text: string; color: string; description: string }
  > = {
    PENDING: {
      text: '결제 대기',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      description: '주문이 생성되었습니다. 결제를 진행해주세요.',
    },
    PAYMENT_COMPLETED: {
      text: '배송 준비중',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      description: '결제가 완료되었습니다. 상품 준비 중입니다.',
    },
    PREPARING: {
      text: '상품 준비중',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      description: '상품을 포장하고 있습니다.',
    },
    SHIPPED: {
      text: '배송 중',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      description: '상품이 배송 중입니다.',
    },
    DELIVERED: {
      text: '배송 완료',
      color: 'text-green-600 bg-green-50 border-green-200',
      description: '상품이 배송 완료되었습니다.',
    },
    CANCELLED: {
      text: '주문 취소',
      color: 'text-red-600 bg-red-50 border-red-200',
      description: '주문이 취소되었습니다.',
    },
    REFUNDED: {
      text: '환불 완료',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      description: '환불이 완료되었습니다.',
    },
  };

  return (
    statusMap[status] || {
      text: status,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      description: '',
    }
  );
};

// 결제 방법 한글 변환
const getPaymentMethodText = (method: string): string => {
  const methodMap: Record<string, string> = {
    KAKAOPAY: '카카오페이',
    CARD: '신용카드',
    BANK_TRANSFER: '계좌이체',
  };

  return methodMap[method] || method;
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 주문 취소 관련 상태
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const orderApiAdapter = useMemo(() => new OrderApiAdapter(), []);

  // 로그인 체크
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/orders');
      return;
    }
  }, [isAuthenticated, navigate]);

  // 주문 정보 로드
  const loadOrder = useCallback(async () => {
    if (!orderId || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const response = await orderApiAdapter.getOrder(orderId);

      if (response.success && response.data) {
        setOrder(response.data.order);
      } else {
        throw new Error(response.message || '주문 정보를 불러올 수 없습니다');
      }
    } catch (error: any) {
      console.error('주문 정보 로드 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, isAuthenticated, orderApiAdapter]);

  // 초기 로드
  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // 주문 취소
  const handleCancelOrder = async () => {
    if (!orderId || !cancelReason.trim()) {
      alert('취소 사유를 입력해주세요');
      return;
    }

    setCancelling(true);

    try {
      const response = await orderApiAdapter.cancelOrder(
        orderId,
        cancelReason.trim()
      );

      if (response.success) {
        // 주문 정보 새로고침
        await loadOrder();
        alert('주문이 성공적으로 취소되었습니다');
      } else {
        throw new Error(response.message || '주문 취소에 실패했습니다');
      }
    } catch (error: any) {
      console.error('주문 취소 오류:', error);
      alert(error.message);
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
      setCancelReason('');
    }
  };

  // 결제 진행
  const handlePayment = () => {
    if (orderId) {
      navigate(`/orders/${orderId}/payment`);
    }
  };

  if (!isAuthenticated) {
    return null; // 리다이렉트 처리 중
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              주문 정보를 불러오는 중 오류가 발생했습니다
            </p>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={() => loadOrder()}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">주문 정보를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const statusInfo = getOrderStatusText(order.status);
  const canCancel =
    order.status === 'PENDING' || order.status === 'PAYMENT_COMPLETED';
  const canPay = order.status === 'PENDING';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/orders')}
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
          주문 목록으로 돌아가기
        </button>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">주문 상세</h1>
            <p className="text-lg text-gray-600 mt-1">
              주문번호: {order.orderNumber}
            </p>
          </div>

          <div
            className={`mt-4 lg:mt-0 inline-flex px-4 py-2 rounded-lg border ${statusInfo.color}`}
          >
            <span className="font-medium">{statusInfo.text}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 주문 상태 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            주문 상태
          </h2>
          <div className={`p-4 rounded-lg border ${statusInfo.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{statusInfo.text}</h3>
                <p className="text-sm mt-1">{statusInfo.description}</p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(order.orderedAt).toLocaleString('ko-KR')}
              </div>
            </div>
          </div>
        </div>

        {/* 주문 상품 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            주문 상품
          </h2>
          <div className="space-y-6">
            {order.items.map((item, index) => (
              <div
                key={`${order.id}-item-${item.id}-${index}`}
                className="flex items-center space-x-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0"
              >
                <img
                  src={item.productImageUrl || '/images/placeholder.png'}
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-lg">
                    {item.productName}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-gray-600">
                      단가: {item.productPrice.toLocaleString()}원
                    </p>
                    <p className="text-gray-600">수량: {item.quantity}개</p>
                    {item.productOptions &&
                      Object.keys(item.productOptions).length > 0 && (
                        <p className="text-sm text-gray-500">
                          옵션: {JSON.stringify(item.productOptions)}
                        </p>
                      )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {item.totalPrice.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            배송 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">받는 분</h3>
              <div className="space-y-2 text-gray-600">
                <p>이름: {order.shippingAddress.recipientName}</p>
                <p>연락처: {order.shippingAddress.recipientPhone}</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">배송지</h3>
              <div className="text-gray-600">
                <p>[{order.shippingAddress.postalCode}]</p>
                <p>{order.shippingAddress.address}</p>
                {order.shippingAddress.detailAddress && (
                  <p>{order.shippingAddress.detailAddress}</p>
                )}
              </div>
            </div>
          </div>

          {order.memo && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">배송 메모</h3>
              <p className="text-gray-600">{order.memo}</p>
            </div>
          )}
        </div>

        {/* 결제 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            결제 정보
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">상품금액</span>
              <span>{order.subtotal.toLocaleString()}원</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">배송비</span>
              <span>
                {order.shippingFee === 0
                  ? '무료'
                  : `${order.shippingFee.toLocaleString()}원`}
              </span>
            </div>

            <div className="flex justify-between text-lg font-semibold text-gray-900 pt-3 border-t border-gray-200">
              <span>총 결제금액</span>
              <span>{order.totalAmount.toLocaleString()}원</span>
            </div>

            <div className="flex justify-between text-gray-600 mt-4">
              <span>결제 방법</span>
              <span>{getPaymentMethodText(order.paymentMethod)}</span>
            </div>

            {order.paymentId && (
              <div className="flex justify-between text-gray-600">
                <span>결제 ID</span>
                <span className="font-mono text-sm">{order.paymentId}</span>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            {canPay && (
              <button
                onClick={handlePayment}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
              >
                결제하기
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
              >
                주문 취소
              </button>
            )}

            <button
              onClick={() => navigate('/orders')}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition-colors"
            >
              주문 목록으로
            </button>
          </div>
        </div>
      </div>

      {/* 주문 취소 다이얼로그 */}
      {showCancelDialog && (
        <ConfirmDialog
          title="주문 취소"
          message={
            <div className="space-y-4">
              <p>정말로 주문을 취소하시겠습니까?</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  취소 사유 *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="주문 취소 사유를 입력해주세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          }
          confirmText="취소하기"
          cancelText="닫기"
          onConfirm={handleCancelOrder}
          onCancel={() => {
            setShowCancelDialog(false);
            setCancelReason('');
          }}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          isLoading={cancelling}
        />
      )}
    </div>
  );
};

export default OrderDetailPage;
