// ========================================
// Admin Header - 관리자 페이지 상단 헤더
// Clean Architecture: Framework Layer
// src/frameworks/ui/components/Admin/AdminHeader.tsx
// ========================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../state/authStore';
import { ROUTES } from '../../../../shared/constants/routes';

/**
 * AdminHeader - 관리자 페이지 상단 헤더
 *
 * 구성 요소:
 * - 검색창 (중앙)
 * - OTHER MENUS 링크
 * - 알림 아이콘들 (배지 포함)
 * - 언어 선택
 * - 관리자 프로필 드롭다운
 */
export const AdminHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 실제 검색 로직 구현
    console.log('Search query:', searchQuery);
  };

  // 알림 데이터 (임시)
  const notifications = [
    { id: 1, count: 5, color: 'bg-blue-500', icon: '📧' },
    { id: 2, count: 2, color: 'bg-green-500', icon: '🏠' },
    { id: 3, count: 8, color: 'bg-orange-500', icon: '📊' },
    { id: 4, count: 1, color: 'bg-red-500', icon: '⚠️' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 검색창 (중앙 좌측) */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="검색"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
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
        </div>

        {/* 우측 메뉴 영역 */}
        <div className="flex items-center space-x-6">
          {/* 기타 메뉴 링크 */}
          <button className="text-purple-600 font-medium hover:text-purple-700 transition-colors">
            기타 메뉴
          </button>

          {/* 알림 아이콘들 */}
          <div className="flex items-center space-x-3">
            {notifications.map(notification => (
              <button
                key={notification.id}
                className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 ${notification.color} rounded-lg flex items-center justify-center text-white text-sm`}
                >
                  {notification.icon}
                </div>
                {notification.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {notification.count > 9 ? '9+' : notification.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 언어 선택 */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs">🇰🇷</span>
            </div>
            <span className="text-gray-700 font-medium">한국어</span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* 관리자 프로필 */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* 프로필 이미지 */}
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-purple-600 font-semibold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                )}
              </div>

              {/* 사용자 정보 */}
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">
                  {user?.name || 'Admin'}
                </div>
                <div className="text-xs text-gray-500">최고 관리자</div>
              </div>

              {/* 드롭다운 화살표 */}
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* 프로필 드롭다운 메뉴 */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate(ROUTES.PROFILE);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  프로필 설정
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate(ROUTES.HOME);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  사용자 페이지로 이동
                </button>

                <hr className="my-2" />

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
