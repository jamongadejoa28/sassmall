// ========================================
// Admin Dashboard - 관리자 대시보드 메인 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminDashboard.tsx
// ========================================

import React from 'react';

/**
 * AdminDashboard - 관리자 대시보드 메인 페이지
 *
 * 구성 요소:
 * - 통계 카드들 (사용자, 상품, 주문, 매출)
 * - 차트 영역 (매출 추이, 주문 현황)
 * - 최근 활동 테이블
 * - 빠른 액션 버튼들
 *
 * 참고: 목업 데이터 없이 UI 구조만 구현
 */
const AdminDashboard: React.FC = () => {
  // 통계 카드 데이터 구조 (실제 데이터는 나중에 연동)
  const statsCards = [
    {
      title: '총 사용자',
      value: '--',
      change: '+0%',
      changeType: 'increase' as const,
      icon: (
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
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      title: '총 상품',
      value: '--',
      change: '+0%',
      changeType: 'increase' as const,
      icon: (
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      title: '총 주문',
      value: '--',
      change: '+0%',
      changeType: 'increase' as const,
      icon: (
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      color: 'bg-purple-500',
    },
    {
      title: '총 매출',
      value: '--',
      change: '+0%',
      changeType: 'increase' as const,
      icon: (
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600 mt-1">온라인 쇼핑몰 관리자 대시보드</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            내보내기
          </button>
          <button className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
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

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {card.value}
                </p>
                <p
                  className={`text-sm mt-2 ${card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}
                >
                  지난달 대비 {card.change}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 차트 및 테이블 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 매출 차트 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">매출 추이</h3>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option>최근 7일</option>
              <option>최근 30일</option>
              <option>최근 3개월</option>
            </select>
          </div>

          {/* 차트 영역 - 실제 차트 라이브러리 연동 전까지 빈 상태 */}
          <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-gray-500">차트 데이터 준비 중</p>
            </div>
          </div>
        </div>

        {/* 빠른 통계 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            빠른 통계
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">오늘 주문</span>
              <span className="font-semibold">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">신규 사용자</span>
              <span className="font-semibold">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">재고 부족</span>
              <span className="font-semibold text-red-600">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">미처리 문의</span>
              <span className="font-semibold text-orange-600">--</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              빠른 액션
            </h4>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                + 새 상품 추가
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                📊 주문 현황 보기
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                👥 사용자 관리
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
            <button className="text-sm text-purple-600 hover:text-purple-700">
              전체 보기
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 테이블 헤더 */}
          <div className="hidden md:grid md:grid-cols-5 gap-4 text-sm font-medium text-gray-500 border-b border-gray-200 pb-3 mb-4">
            <div>사용자</div>
            <div>활동</div>
            <div>시간</div>
            <div>상태</div>
            <div>액션</div>
          </div>

          {/* 빈 상태 */}
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 6h6m-6 4h6m2-6h.01M19 16h.01"
              />
            </svg>
            <p className="text-gray-500">최근 활동 데이터 준비 중</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
