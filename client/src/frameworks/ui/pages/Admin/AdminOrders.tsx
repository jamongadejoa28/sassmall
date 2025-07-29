// ========================================
// Admin Orders - 주문 관리 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminOrders.tsx
// ========================================

import React, { useState } from 'react';

const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search orders:', searchQuery);
  };

  const orderStatuses = [
    { value: 'all', label: '전체 주문', count: '--' },
    {
      value: 'pending',
      label: '대기중',
      count: '--',
      color: 'text-yellow-600',
    },
    {
      value: 'confirmed',
      label: '확인됨',
      count: '--',
      color: 'text-blue-600',
    },
    {
      value: 'shipped',
      label: '배송중',
      count: '--',
      color: 'text-purple-600',
    },
    {
      value: 'delivered',
      label: '배송완료',
      count: '--',
      color: 'text-green-600',
    },
    {
      value: 'cancelled',
      label: '취소됨',
      count: '--',
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
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Manual Order
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
              {status.count}
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

        {/* 테이블 헤더 */}
        <div className="hidden lg:grid lg:grid-cols-8 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="flex items-center">
            <input type="checkbox" className="mr-3" />
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

        {/* 빈 상태 */}
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
              주문 데이터 준비 중
            </h3>
            <p className="text-gray-500">주문 목록이 여기에 표시됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
