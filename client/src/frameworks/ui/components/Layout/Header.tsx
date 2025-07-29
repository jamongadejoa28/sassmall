import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../state/authStore';
import { useCartCount } from '../../../../adapters/hooks/useCartCount';
import { ROUTES, ADMIN_ROUTES } from '../../../../shared/constants/routes';
import { useIsAdmin } from '../Admin/AdminRoute';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { count: cartCount } = useCartCount();
  const isAdmin = useIsAdmin();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      // 로그아웃 실패 시 처리
    }
  };

  return (
    <header className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link to={ROUTES.HOME} className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600">
              ShoppingMall
            </h1>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to={ROUTES.PRODUCTS}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              상품
            </Link>

            {/* 관리자 메뉴 (관리자에게만 표시) */}
            {isAdmin && (
              <Link
                to={ADMIN_ROUTES.DASHBOARD}
                className="text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center space-x-1"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>관리자</span>
              </Link>
            )}
          </nav>

          {/* 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 장바구니 */}
            <Link
              to={ROUTES.CART}
              className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 5H3m4 8v2a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              {/* 장바구니 개수 배지 */}
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* 사용자 메뉴 */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  to={ROUTES.ORDERS}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  주문내역
                </Link>
                <Link
                  to={ROUTES.PROFILE}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  {user?.name ? `${user.name}님` : '사용자님'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  로그인
                </Link>
                <Link to={ROUTES.REGISTER} className="btn-primary">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
