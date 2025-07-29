import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
): { text: string; color: string } => {
  const statusMap: Record<string, { text: string; color: string }> = {
    PENDING: { text: '결제 대기', color: 'text-yellow-600 bg-yellow-50' },
    PAYMENT_COMPLETED: {
      text: '배송 준비중',
      color: 'text-orange-600 bg-orange-50',
    },
    PREPARING: { text: '상품 준비중', color: 'text-orange-600 bg-orange-50' },
    SHIPPED: { text: '배송 중', color: 'text-purple-600 bg-purple-50' },
    DELIVERED: { text: '배송 완료', color: 'text-green-600 bg-green-50' },
    CANCELLED: { text: '주문 취소', color: 'text-red-600 bg-red-50' },
    REFUNDED: { text: '환불 완료', color: 'text-gray-600 bg-gray-50' },
  };

  return (
    statusMap[status] || { text: status, color: 'text-gray-600 bg-gray-50' }
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

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // 주문 취소 관련 상태
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const limit = 10;
  const orderApiAdapter = useMemo(() => new OrderApiAdapter(), []);

  // 인증 상태 체크 - authLoading이 완료된 후에만 체크
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/orders');
      return;
    }
  }, [isAuthenticated, authLoading, navigate]);

  // 주문 목록 로드
  const loadOrders = useCallback(
    async (isLoadMore = false) => {
      // 인증 로딩 중이거나 인증되지 않은 경우 리턴
      if (authLoading || !isAuthenticated) {
        return;
      }

      try {
        if (!isLoadMore) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const response = await orderApiAdapter.getMyOrders(
          limit,
          isLoadMore ? offset : 0
        );

        if (response.success && response.data) {
          const newOrders = response.data.orders;

          if (isLoadMore) {
            setOrders(prev => [...prev, ...newOrders]);
            setOffset(prev => prev + limit);
          } else {
            setOrders(newOrders);
            setOffset(limit);
          }

          setTotalCount(response.data.totalCount);
          setHasMore(response.data.pagination.hasMore);
        } else {
          throw new Error(response.message || '주문 목록을 불러올 수 없습니다');
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [authLoading, isAuthenticated, limit, offset, orderApiAdapter]
  );

  // 초기 로드 - 인증 완료 후에만 실행
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // 주문 취소
  const handleCancelOrder = async () => {
    if (!cancellingOrderId || !cancelReason.trim()) {
      alert('취소 사유를 입력해주세요');
      return;
    }

    try {
      const response = await orderApiAdapter.cancelOrder(
        cancellingOrderId,
        cancelReason.trim()
      );

      if (response.success) {
        // 주문 목록 새로고침
        await loadOrders();
        alert('주문이 성공적으로 취소되었습니다');
      } else {
        throw new Error(response.message || '주문 취소에 실패했습니다');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setShowCancelDialog(false);
      setCancellingOrderId(null);
      setCancelReason('');
    }
  };

  // 주문 취소 다이얼로그 열기
  const openCancelDialog = (orderId: string) => {
    setCancellingOrderId(orderId);
    setShowCancelDialog(true);
  };

  // 더보기 로드
  const loadMoreOrders = () => {
    if (!loadingMore && hasMore) {
      loadOrders(true);
    }
  };

  // 인증 로딩 중인 경우 처리
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 내역</h1>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 null 반환 (리다이렉트 처리 중)
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 내역</h1>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 내역</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              주문 내역을 불러오는 중 오류가 발생했습니다
            </p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => loadOrders()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">주문 내역</h1>
        <div className="text-sm text-gray-500">총 {totalCount}개의 주문</div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              주문 내역이 없습니다
            </h3>
            <p className="text-gray-600 mb-4">첫 번째 주문을 해보세요!</p>
            <button
              onClick={() => navigate('/products')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              상품 둘러보기
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const statusInfo = getOrderStatusText(order.status);
            const canCancel =
              order.status === 'PENDING' ||
              order.status === 'PAYMENT_COMPLETED';

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* 주문 헤더 */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
                    <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          주문번호: {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.orderedAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.text}
                      </div>
                    </div>

                    <div className="flex flex-col lg:items-end mt-4 lg:mt-0">
                      <p className="text-lg font-semibold text-gray-900">
                        총 {order.totalAmount.toLocaleString()}원
                      </p>
                      <p className="text-sm text-gray-500">
                        {getPaymentMethodText(order.paymentMethod)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 주문 상품 목록 */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div
                        key={`${order.id}-item-${item.id}-${index}`}
                        className="flex items-center space-x-4"
                      >
                        <img
                          src={
                            item.productImageUrl || '/images/placeholder.png'
                          }
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.productName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {item.productPrice.toLocaleString()}원 ×{' '}
                            {item.quantity}개
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

                  {/* 배송 정보 */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-2">
                      배송 정보
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>받는 사람: {order.shippingAddress.recipientName}</p>
                      <p>연락처: {order.shippingAddress.recipientPhone}</p>
                      <p>
                        주소: [{order.shippingAddress.postalCode}]{' '}
                        {order.shippingAddress.address}
                        {order.shippingAddress.detailAddress &&
                          ` ${order.shippingAddress.detailAddress}`}
                      </p>
                      {order.memo && <p>배송 메모: {order.memo}</p>}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      주문 상세보기
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => openCancelDialog(order.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        주문 취소
                      </button>
                    )}

                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => navigate(`/orders/${order.id}/payment`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        결제하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center py-6">
              <button
                onClick={loadMoreOrders}
                disabled={loadingMore}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? '로딩 중...' : '더보기'}
              </button>
            </div>
          )}
        </div>
      )}

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
            setCancellingOrderId(null);
            setCancelReason('');
          }}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
};

export default OrdersPage;
