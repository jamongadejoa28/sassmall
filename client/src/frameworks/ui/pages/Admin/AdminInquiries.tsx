// ========================================
// Admin Inquiries - 문의 관리 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminInquiries.tsx
// ========================================

import React, { useState } from 'react';

const AdminInquiries: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search inquiries:', searchQuery);
  };

  const inquiryTypes = [
    { value: 'all', label: '전체 문의', count: '--' },
    { value: 'product', label: '상품 문의', count: '--', icon: '❓' },
    { value: 'order', label: '주문 문제', count: '--', icon: '📦' },
    { value: 'payment', label: '결제 문의', count: '--', icon: '💳' },
    { value: 'shipping', label: '배송 문의', count: '--', icon: '🚚' },
    { value: 'return', label: '반품/교환', count: '--', icon: '↩️' },
    { value: 'other', label: '기타 문의', count: '--', icon: '💬' },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문의 관리</h1>
          <p className="text-gray-600 mt-1">고객 문의 및 지원 요청 관리</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            내보내기
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            일괄 처리
          </button>
        </div>
      </div>

      {/* 문의 타입별 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {inquiryTypes.map(type => (
          <button
            key={type.value}
            onClick={() => setStatusFilter(type.value)}
            className={`bg-white p-4 rounded-lg border border-gray-200 text-center hover:shadow-md transition-shadow ${
              statusFilter === type.value ? 'ring-2 ring-purple-500' : ''
            }`}
          >
            <div className="text-2xl mb-2">{type.icon}</div>
            <p className="text-xl font-bold text-gray-900">{type.count}</p>
            <p className="text-xs text-gray-600 mt-1">{type.label}</p>
          </button>
        ))}
      </div>

      {/* 우선순위별 문의 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">긴급 문의</p>
              <p className="text-2xl font-bold text-red-600">--</p>
              <p className="text-xs text-gray-500 mt-1">즉시 처리 필요</p>
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
              <p className="text-sm text-gray-600">미답변 문의</p>
              <p className="text-2xl font-bold text-orange-600">--</p>
              <p className="text-xs text-gray-500 mt-1">24시간 이내 답변</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">완료된 문의</p>
              <p className="text-2xl font-bold text-green-600">--</p>
              <p className="text-xs text-gray-500 mt-1">이번 달 처리</p>
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
                placeholder="Search by customer name, subject..."
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
              <option>All Status</option>
              <option>New</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>Latest</option>
              <option>Oldest</option>
              <option>Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* 문의 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">문의 목록</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">평균 응답 시간: --</span>
            </div>
          </div>
        </div>

        {/* 테이블 헤더 */}
        <div className="hidden lg:grid lg:grid-cols-7 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="flex items-center">
            <input type="checkbox" className="mr-3" />
            고객/제목
          </div>
          <div>타입</div>
          <div>우선순위</div>
          <div>상태</div>
          <div>담당자</div>
          <div>등록일</div>
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              문의 데이터 준비 중
            </h3>
            <p className="text-gray-500">고객 문의가 여기에 표시됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInquiries;
