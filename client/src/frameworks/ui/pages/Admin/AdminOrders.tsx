// ========================================
// Admin Orders - 주문 관리 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminOrders.tsx
// ========================================

import React, { useState, useEffect } from 'react';
import {
  AdminApiAdapter,
  AdminOrdersResponse,
} from '../../../../adapters/api/AdminApiAdapter';
import toast from 'react-hot-toast';

const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ordersData, setOrdersData] = useState<AdminOrdersResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const adminApiAdapter = new AdminApiAdapter();

  // 주문 목록 로드
  useEffect(() => {
    loadOrders();
  }, [currentPage, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        page: currentPage,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      };

      const data = await adminApiAdapter.getAdminOrders(options);
      setOrdersData(data);
    } catch (error: any) {
      console.error('Orders loading error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    loadOrders();
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await adminApiAdapter.updateOrderStatus(orderId, newStatus);
      toast.success('주문 상태가 업데이트되었습니다.');
      loadOrders(); // 목록 새로고침
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleOrderSelect = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === ordersData?.orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(
        new Set(ordersData?.orders.map(order => order.id) || [])
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'confirmed':
        return 'text-blue-600 bg-blue-50';
      case 'shipped':
        return 'text-purple-600 bg-purple-50';
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusCounts = () => {
    if (!ordersData)
      return {
        all: 0,
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

    const counts = {
      all: ordersData.orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    ordersData.orders.forEach(order => {
      const status = order.status.toLowerCase();
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const orderStatuses = [
    { value: 'all', label: '전체 주문', count: statusCounts.all },
    {
      value: 'pending',
      label: '대기중',
      count: statusCounts.pending,
      color: 'text-yellow-600',
    },
    {
      value: 'confirmed',
      label: '확인됨',
      count: statusCounts.confirmed,
      color: 'text-blue-600',
    },
    {
      value: 'shipped',
      label: '배송중',
      count: statusCounts.shipped,
      color: 'text-purple-600',
    },
    {
      value: 'delivered',
      label: '배송완료',
      count: statusCounts.delivered,
      color: 'text-green-600',
    },
    {
      value: 'cancelled',
      label: '취소됨',
      count: statusCounts.cancelled,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">주문 현황 관리 및 배송 추적</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Export Orders
          </button>
          <button
            onClick={() => loadOrders()}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 inline mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            새로고침
          </button>
        </div>
      </div>

      {/* 주문 상태 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {orderStatuses.map(status => (
          <button
            key={status.value}
            onClick={() => setStatusFilter(status.value)}
            className={`bg-white p-4 rounded-lg border border-gray-200 text-left hover:shadow-md transition-shadow ${
              statusFilter === status.value ? 'ring-2 ring-purple-500' : ''
            }`}
          >
            <p
              className={`text-2xl font-bold ${status.color || 'text-gray-900'}`}
            >
              {loading ? '...' : status.count}
            </p>
            <p className="text-sm text-gray-600 mt-1">{status.label}</p>
          </button>
        ))}
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
                placeholder="Search by order ID, customer name..."
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
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Today</option>
              <option>Custom range</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>All Payment Methods</option>
              <option>Credit Card</option>
              <option>PayPal</option>
              <option>Bank Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* 주문 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">주문 목록</h3>
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
            </div>
          </div>
        </div>

        {/* 에러 상태 */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-400 mr-3"
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
              <p className="text-red-800">
                데이터 로드 중 오류가 발생했습니다: {error}
              </p>
              <button
                onClick={loadOrders}
                className="ml-auto text-red-600 hover:text-red-800 font-medium"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 테이블 헤더 */}
        <div className="hidden lg:grid lg:grid-cols-8 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="mr-3"
              checked={
                selectedOrders.size === ordersData?.orders.length &&
                ordersData?.orders.length > 0
              }
              onChange={handleSelectAll}
            />
            주문 ID
          </div>
          <div>고객</div>
          <div>상품</div>
          <div>주문일</div>
          <div>결제 방법</div>
          <div>금액</div>
          <div>상태</div>
          <div>액션</div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="px-6 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">주문 목록을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 주문 목록 */}
        {!loading && ordersData && ordersData.orders.length > 0 && (
          <div className="divide-y divide-gray-200">
            {ordersData.orders.map(order => (
              <div
                key={order.id}
                className="hidden lg:grid lg:grid-cols-8 gap-4 px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={selectedOrders.has(order.id)}
                    onChange={() => handleOrderSelect(order.id)}
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      #{order.id.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {order.customerName}
                  </p>
                  <p className="text-sm text-gray-500">ID: {order.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {order.items.length}개 상품
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items[0]?.productName}
                    {order.items.length > 1
                      ? ` 외 ${order.items.length - 1}개`
                      : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-900">카드결제</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    ₩{order.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    value={order.status}
                    onChange={e => handleStatusChange(order.id, e.target.value)}
                  >
                    <option value="pending">대기중</option>
                    <option value="confirmed">확인됨</option>
                    <option value="shipped">배송중</option>
                    <option value="delivered">배송완료</option>
                    <option value="cancelled">취소됨</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && (!ordersData || ordersData.orders.length === 0) && (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                주문이 없습니다
              </h3>
              <p className="text-gray-500">아직 등록된 주문이 없습니다.</p>
            </div>
          </div>
        )}

        {/* 페이징 */}
        {ordersData &&
          ordersData.pagination &&
          ordersData.pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  총 {ordersData.pagination.total}개 중{' '}
                  {(currentPage - 1) * 20 + 1}-
                  {Math.min(currentPage * 20, ordersData.pagination.total)}개
                  표시
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setCurrentPage(prev => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    이전
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {currentPage} / {ordersData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(prev =>
                        Math.min(ordersData.pagination.totalPages, prev + 1)
                      )
                    }
                    disabled={currentPage === ordersData.pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default AdminOrders;
