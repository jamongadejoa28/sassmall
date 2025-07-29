// ========================================
// Admin Layout - 관리자 페이지 메인 레이아웃
// Clean Architecture: Framework Layer
// src/frameworks/ui/components/Admin/AdminLayout.tsx
// ========================================

import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout - 관리자 페이지 전용 레이아웃
 *
 * 구조:
 * - 좌측: AdminSidebar (고정)
 * - 우측: AdminHeader + 메인 콘텐츠 영역
 *
 * 특징:
 * - 일반 사용자 MainLayout과 완전 분리
 * - 반응형 디자인 지원
 * - 사이드바 접기/펼치기 기능
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 좌측 사이드바 */}
      <AdminSidebar />

      {/* 우측 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 */}
        <AdminHeader />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
