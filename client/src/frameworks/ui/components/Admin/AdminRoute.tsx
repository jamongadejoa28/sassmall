// ========================================
// Admin Route Guard - 관리자 권한 확인 컴포넌트
// Clean Architecture: Framework Layer
// src/frameworks/ui/components/Admin/AdminRoute.tsx
// ========================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../state/authStore';
import { ROUTES } from '../../../../shared/constants/routes';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - 관리자 권한 확인 및 보호된 라우트 컴포넌트
 *
 * 역할:
 * - 사용자 인증 상태 확인
 * - 관리자 권한(role: 'admin') 확인
 * - 비인가 접근 시 적절한 페이지로 리디렉션
 *
 * 보안 정책:
 * - 비로그인 사용자 → 로그인 페이지로 리디렉션
 * - 일반 사용자 → 홈페이지로 리디렉션 (403 방지)
 * - 관리자만 접근 허용
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 로그인하지 않은 경우 → 로그인 페이지로 리디렉션
  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />
    );
  }

  // 로그인했지만 관리자가 아닌 경우 → 홈페이지로 리디렉션
  if (user?.role !== 'admin') {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // 관리자인 경우 → 요청한 관리자 페이지 렌더링
  return <>{children}</>;
};

/**
 * Hook: useIsAdmin - 현재 사용자의 관리자 권한 확인
 *
 * 사용법:
 * const isAdmin = useIsAdmin();
 * if (isAdmin) { ... }
 */
export const useIsAdmin = (): boolean => {
  const { isAuthenticated, user } = useAuthStore();
  return isAuthenticated && user?.role === 'admin';
};

/**
 * 관리자 권한 확인 유틸리티 함수들
 */
export const AdminUtils = {
  /**
   * 현재 사용자가 관리자인지 확인
   */
  isAdmin(user: any): boolean {
    return user?.role === 'admin';
  },

  /**
   * 관리자 권한이 필요한 액션에 대한 확인
   */
  requireAdmin(user: any): void {
    if (!this.isAdmin(user)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
  },

  /**
   * 관리자 전용 메뉴 표시 여부 확인
   */
  showAdminMenu(user: any): boolean {
    return this.isAdmin(user);
  },
};
