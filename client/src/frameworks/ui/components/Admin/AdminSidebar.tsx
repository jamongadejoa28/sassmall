// ========================================
// Admin Sidebar - 관리자 사이드바 네비게이션
// Clean Architecture: Framework Layer
// src/frameworks/ui/components/Admin/AdminSidebar.tsx
// ========================================

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_ROUTES } from '../../../../shared/constants/routes';
import { UserApiAdapter } from '../../../../adapters/api/UserApiAdapter';

interface SidebarMenuItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
  isNew?: boolean;
}

/**
 * AdminSidebar - 관리자 페이지 사이드바 네비게이션
 *
 * 특징:
 * - 이미지 디자인과 유사한 모던한 사이드바
 * - 현재 페이지 활성화 표시
 * - 배지 및 새로운 기능 표시
 * - 접기/펼치기 기능
 */
export const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // 사용자 통계 로드
  useEffect(() => {
    const userApiAdapter = new UserApiAdapter();

    const loadUserStats = async () => {
      try {
        const response = await userApiAdapter.getUserStats();
        if (response.success) {
          setTotalUsers(response.data.totalUsers);
        }
      } catch (error) {
        console.error('사용자 통계 로드 실패:', error);
        // 에러 발생 시 기본값 유지 (0)
      }
    };

    loadUserStats();
  }, []);

  // 메뉴 아이템 정의 (totalUsers 변경시 재생성)
  const menuItems: SidebarMenuItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: '대시보드',
        path: ADMIN_ROUTES.DASHBOARD,
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
            />
          </svg>
        ),
      },
      {
        id: 'users',
        label: '사용자',
        path: ADMIN_ROUTES.USERS,
        icon: (
          <svg
            className="w-5 h-5"
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
        badge: totalUsers > 0 ? totalUsers.toString() : undefined,
      },
      {
        id: 'products',
        label: '상품',
        path: ADMIN_ROUTES.PRODUCTS,
        icon: (
          <svg
            className="w-5 h-5"
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
      },
      {
        id: 'orders',
        label: '주문',
        path: ADMIN_ROUTES.ORDERS,
        icon: (
          <svg
            className="w-5 h-5"
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
      },
      {
        id: 'inquiries',
        label: '문의',
        path: ADMIN_ROUTES.INQUIRIES,
        icon: (
          <svg
            className="w-5 h-5"
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
        ),
        isNew: true,
      },
      {
        id: 'settings',
        label: '설정',
        path: ADMIN_ROUTES.SETTINGS,
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
      },
    ],
    [totalUsers]
  );

  // 현재 활성화된 메뉴 확인
  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div
      className={`bg-white h-screen shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}
    >
      {/* 사이드바 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-800">
              ShoppingMall
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* 메인 메뉴 */}
      <div className="p-4">
        {!isCollapsed && (
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            주 메뉴
          </div>
        )}

        <nav className="space-y-2">
          {menuItems.map(item => (
            <Link
              key={item.id}
              to={item.path}
              className={`
                flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${
                  isActiveRoute(item.path)
                    ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <div className="flex-shrink-0">{item.icon}</div>

              {!isCollapsed && (
                <>
                  <span className="font-medium flex-1">{item.label}</span>

                  {/* 배지 표시 */}
                  {item.badge && (
                    <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}

                  {/* NEW 배지 */}
                  {item.isNew && (
                    <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-1 rounded-full">
                      NEW
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
