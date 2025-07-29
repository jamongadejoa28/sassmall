// ========================================
// Admin Users - 사용자 관리 페이지 (목업 데이터)
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminUsers.tsx
// ========================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserApiAdapter } from '../../../../adapters/api/UserApiAdapter';
import AdminUserEditModal from '../../components/AdminUserEditModal';
import toast from 'react-hot-toast';

// 실제 사용자 데이터 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  phoneNumber?: string;
  postalCode?: string;
  address?: string;
  detailAddress?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  avatar?: string; // 아바타 필드 추가 (향후 확장용)
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  customerCount: number;
  adminCount: number;
  newUsersThisMonth: number;
  newUsersToday: number;
}

/**
 * AdminUsers - 사용자 관리 페이지
 *
 * 기능:
 * - 사용자 목록 조회 (그리드/리스트 뷰)
 * - 사용자 검색 및 필터링
 * - 사용자 상세 정보 보기
 * - 사용자 상태 관리 (활성/비활성)
 * - 실제 DB 데이터 연동
 */
const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');
  const [currentPage, setCurrentPage] = useState(1);
  // totalPages는 사용하지 않으므로 제거

  // 사용자 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const userApiAdapter = useMemo(() => new UserApiAdapter(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 사용자 목록과 통계를 병렬로 로드
      const [usersResponse, statsResponse] = await Promise.all([
        userApiAdapter.getUsers({
          page: currentPage,
          limit: 12,
          search: searchQuery || undefined,
          role: roleFilter ? (roleFilter as 'customer' | 'admin') : undefined,
          isActive: statusFilter ? statusFilter === 'active' : undefined,
        }),
        userApiAdapter.getUserStats(),
      ]);

      if (usersResponse.success) {
        setUsers(usersResponse.data.users);
      }

      if (statsResponse.success) {
        setUserStats(statsResponse.data);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      toast.error('데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, roleFilter, statusFilter, userApiAdapter]);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색 시 데이터 다시 로드
  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        loadData();
      }, 500); // 디바운싱
      return () => clearTimeout(timeoutId);
    } else {
      loadData();
    }
  }, [searchQuery, loadData]);

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  // 사용자 상태 토글
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await userApiAdapter.updateUserStatus(
        userId,
        !currentStatus
      );
      if (response.success) {
        toast.success(
          `사용자 상태가 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`
        );
        // 데이터 다시 로드
        loadData();
      }
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      toast.error('사용자 상태 변경에 실패했습니다.');
    }
  };

  // 사용자 삭제
  const deleteUser = async (userId: string) => {
    if (!window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await userApiAdapter.deleteUser(userId);
      if (response.success) {
        toast.success('사용자가 삭제되었습니다.');
        loadData();
      }
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      toast.error('사용자 삭제에 실패했습니다.');
    }
  };

  // 사용자 수정 모달 열기
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  // 사용자 수정 모달 닫기
  const closeEditModal = () => {
    setSelectedUser(null);
    setIsEditModalOpen(false);
  };

  // 사용자 정보 수정 완료 핸들러
  const handleUserUpdated = (updatedUser: User) => {
    // 서버에서 최신 데이터를 다시 불러오기
    loadData();
    closeEditModal();
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-1">사용자 계정 관리 및 권한 설정</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="사용자 검색"
              className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
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
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 필터 및 통계 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-500">총 사용자:</span>
              <span className="font-semibold ml-2">
                {userStats?.totalUsers || 0}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">활성 사용자:</span>
              <span className="font-semibold ml-2 text-green-600">
                {userStats?.activeUsers || 0}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">비활성 사용자:</span>
              <span className="font-semibold ml-2 text-red-600">
                {userStats?.inactiveUsers || 0}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">이번 달 신규:</span>
              <span className="font-semibold ml-2 text-blue-600">
                {userStats?.newUsersThisMonth || 0}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">모든 사용자</option>
              <option value="active">활성 사용자</option>
              <option value="inactive">비활성 사용자</option>
            </select>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">모든 권한</option>
              <option value="admin">관리자</option>
              <option value="customer">고객</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="createdAt_desc">최신 가입순</option>
              <option value="createdAt_asc">오래된 가입순</option>
              <option value="name_asc">이름순 (A-Z)</option>
              <option value="name_desc">이름순 (Z-A)</option>
              <option value="email_asc">이메일순 (A-Z)</option>
              <option value="email_desc">이메일순 (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          // 로딩 상태
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">데이터 로드 중...</span>
          </div>
        ) : users.length === 0 ? (
          // 빈 상태
          <div className="text-center py-12">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg font-medium">
              사용자가 없습니다
            </p>
            <p className="text-gray-400 mt-2">
              검색 조건을 변경하거나 필터를 확인해보세요
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // 그리드 뷰 (실제 데이터)
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map(user => (
                <div
                  key={user.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      )}
                    </div>
                    {/* 상태 배지 */}
                    <div
                      className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                        user.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      <span className="text-white text-xs font-bold">
                        {user.isActive ? '●' : '●'}
                      </span>
                    </div>
                  </div>

                  {/* 사용자 정보 */}
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {user.role === 'admin' ? '관리자' : '고객'}
                    </p>
                    <p className="text-sm text-purple-600 mb-4">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* 연락처 정보 */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span>{user.phoneNumber || '연락처 없음'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
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
                      <span>
                        최근 로그인:{' '}
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : '로그인 기록 없음'}
                      </span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <button
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        onClick={() => openEditModal(user)}
                      >
                        수정
                      </button>
                      <button
                        className={`text-sm font-medium ${
                          user.isActive
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button
                        className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
                        onClick={() => deleteUser(user.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 리스트 뷰 (테이블 형태)
          <div>
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
              <div>사용자</div>
              <div>이메일</div>
              <div>역할</div>
              <div>가입일</div>
              <div>상태</div>
              <div>액션</div>
            </div>

            {/* 사용자 목록 (테이블 형태) */}
            <div className="divide-y divide-gray-200">
              {users.map(user => (
                <div
                  key={user.id}
                  className="grid grid-cols-6 gap-4 p-4 hover:bg-gray-50"
                >
                  {/* 사용자 정보 */}
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {user.name}
                    </span>
                  </div>

                  {/* 이메일 */}
                  <div className="flex items-center">
                    <span className="text-gray-600 truncate">{user.email}</span>
                  </div>

                  {/* 역할 */}
                  <div className="flex items-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role === 'admin' ? '관리자' : '고객'}
                    </span>
                  </div>

                  {/* 가입일 */}
                  <div className="flex items-center">
                    <span className="text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* 상태 */}
                  <div className="flex items-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? '활성' : '비활성'}
                    </span>
                  </div>

                  {/* 액션 */}
                  <div className="flex items-center space-x-2">
                    <button
                      className="text-sm text-purple-600 hover:text-purple-700"
                      onClick={() => openEditModal(user)}
                    >
                      수정
                    </button>
                    <button
                      className={`text-sm ${
                        user.isActive
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                    >
                      {user.isActive ? '비활성화' : '활성화'}
                    </button>
                    <button
                      className="text-sm text-red-600 hover:text-red-700"
                      onClick={() => deleteUser(user.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 사용자 수정 모달 */}
      <AdminUserEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={handleUserUpdated}
        user={selectedUser}
      />
    </div>
  );
};

export default AdminUsers;
