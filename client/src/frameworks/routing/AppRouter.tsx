import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '../ui/components/Layout/MainLayout';
import { AdminLayout } from '../ui/components/Admin/AdminLayout';
import { AdminRoute } from '../ui/components/Admin/AdminRoute';
import { ROUTES, ADMIN_ROUTES } from '../../shared/constants/routes';

// 실제 구현된 페이지들
const ProductsPage = React.lazy(() => import('../ui/pages/ProductsPage'));
const LoginPage = React.lazy(() => import('../ui/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('../ui/pages/RegisterPage'));

// Development only
const AuthTestPage = React.lazy(() => import('../ui/pages/AuthTestPage'));

// 관리자 페이지들
const AdminDashboard = React.lazy(
  () => import('../ui/pages/Admin/AdminDashboard')
);
const AdminUsers = React.lazy(() => import('../ui/pages/Admin/AdminUsers'));
const AdminProducts = React.lazy(
  () => import('../ui/pages/Admin/AdminProducts')
);
const AdminOrders = React.lazy(() => import('../ui/pages/Admin/AdminOrders'));
const AdminInquiries = React.lazy(
  () => import('../ui/pages/Admin/AdminInquiries')
);
const AdminSettings = React.lazy(
  () => import('../ui/pages/Admin/AdminSettings')
);

// 임시 페이지 컴포넌트
const TempPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">
        백엔드 API 연동 후 실제 기능이 구현됩니다.
      </p>
    </div>
  </div>
);

// 다른 페이지들도 에러 방지를 위해 fallback 추가
const SafePage: React.FC<{ title: string }> = ({ title }) => {
  return <TempPage title={title} />;
};

const ProductDetailPage = React.lazy(() =>
  import('../ui/pages/ProductDetailPage').catch(() => ({
    default: () => <SafePage title="상품 상세" />,
  }))
);

const CartPage = React.lazy(() =>
  import('../ui/pages/CartPage').catch(() => ({
    default: () => <SafePage title="장바구니" />,
  }))
);

const CheckoutPage = React.lazy(() =>
  import('../ui/pages/CheckoutPage').catch(() => ({
    default: () => <SafePage title="주문하기" />,
  }))
);

const OrdersPage = React.lazy(() =>
  import('../ui/pages/OrdersPage').catch(() => ({
    default: () => <SafePage title="주문내역" />,
  }))
);

const OrderDetailPage = React.lazy(() =>
  import('../ui/pages/OrderDetailPage').catch(() => ({
    default: () => <SafePage title="주문 상세" />,
  }))
);

const PaymentPage = React.lazy(() =>
  import('../ui/pages/PaymentPage').catch(() => ({
    default: () => <SafePage title="결제" />,
  }))
);

const PaymentSuccessPage = React.lazy(() =>
  import('../ui/pages/PaymentSuccessPage').catch(() => ({
    default: () => <SafePage title="결제 성공" />,
  }))
);

const PaymentFailPage = React.lazy(() =>
  import('../ui/pages/PaymentFailPage').catch(() => ({
    default: () => <SafePage title="결제 실패" />,
  }))
);

const ProfilePage = React.lazy(() =>
  import('../ui/pages/ProfilePage').catch(() => ({
    default: () => <SafePage title="프로필" />,
  }))
);

const ProfileEditPage = React.lazy(() => import('../ui/pages/ProfileEditPage'));

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <React.Suspense
        fallback={
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <Routes>
          {/* 관리자 페이지들 - AdminLayout 사용 */}
          <Route
            path={ADMIN_ROUTES.DASHBOARD}
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path={ADMIN_ROUTES.USERS}
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path={ADMIN_ROUTES.PRODUCTS}
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminProducts />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path={ADMIN_ROUTES.ORDERS}
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminOrders />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path={ADMIN_ROUTES.INQUIRIES}
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminInquiries />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path={ADMIN_ROUTES.SETTINGS}
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </AdminRoute>
            }
          />

          {/* 일반 사용자 페이지들 - MainLayout 사용 */}
          <Route
            path="/*"
            element={
              <MainLayout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <Routes>
                    <Route path={ROUTES.HOME} element={<ProductsPage />} />
                    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                    <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
                    <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
                    <Route
                      path={ROUTES.PRODUCT_DETAIL}
                      element={<ProductDetailPage />}
                    />
                    <Route path={ROUTES.CART} element={<CartPage />} />
                    <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
                    <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
                    <Route
                      path={ROUTES.ORDER_DETAIL}
                      element={<OrderDetailPage />}
                    />
                    <Route
                      path={ROUTES.ORDER_PAYMENT}
                      element={<PaymentPage />}
                    />
                    <Route
                      path="/orders/:orderId/payment/success"
                      element={<PaymentSuccessPage />}
                    />
                    <Route
                      path="/orders/:orderId/payment/fail"
                      element={<PaymentFailPage />}
                    />
                    <Route
                      path={ROUTES.PROFILE_EDIT}
                      element={<ProfileEditPage />}
                    />
                    <Route path={ROUTES.PROFILE} element={<ProfilePage />} />

                    {/* Development only auth test page */}
                    {process.env.NODE_ENV === 'development' && (
                      <Route path="/auth-test" element={<AuthTestPage />} />
                    )}
                    <Route
                      path="*"
                      element={<TempPage title="페이지를 찾을 수 없습니다" />}
                    />
                  </Routes>
                </div>
              </MainLayout>
            }
          />
        </Routes>
      </React.Suspense>
    </Router>
  );
};
