import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/authStore';
import { ROUTES } from '../../../shared/constants/routes';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">프로필</h1>
          <p className="text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">프로필</h1>
          <p className="text-gray-600 mt-2">
            {user?.name || '사용자'}님의 계정 정보
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* 사용자 정보 표시 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이름
              </label>
              <p className="mt-1 text-gray-900">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <p className="mt-1 text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                역할
              </label>
              <p className="mt-1 text-gray-900">
                {user?.role === 'admin' ? '관리자' : '일반회원'}
              </p>
            </div>
            {user?.phoneNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  전화번호
                </label>
                <p className="mt-1 text-gray-900">{user.phoneNumber}</p>
              </div>
            )}
            {user?.address && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  주소
                </label>
                <p className="mt-1 text-gray-900">
                  {user.postalCode && `(${user.postalCode}) `}
                  {user.address}
                  {user.detailAddress && ` ${user.detailAddress}`}
                </p>
              </div>
            )}
          </div>

          {/* 프로필 수정 버튼 */}
          <button
            onClick={() => navigate(ROUTES.PROFILE_EDIT)}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            프로필 수정
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
