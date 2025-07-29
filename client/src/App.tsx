import React, { useEffect } from 'react';
import { AppRouter } from './frameworks/routing/AppRouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useCartSession } from './hooks/useCartSession';
import { useCartActions } from './frameworks/state/cartStoreLocal';
import { useAuthStore } from './frameworks/state/authStore';
import { CartCleanupService } from './utils/cartCleanup';
import { TokenExpirationHandler } from './shared/utils/tokenExpiration';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
});

function App() {
  // 장바구니 세션 관리 초기화 (훅 실행을 위해 필요하지만 직접 사용하지 않음)
  useCartSession();

  // 장바구니 액션 훅
  const { loadCart } = useCartActions();

  // 인증 상태 관리
  const { isAuthenticated, loadUserProfile, logout } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 초기화 작업
    const initializeApp = async () => {
      try {
        // 장바구니 정리 서비스 실행
        await CartCleanupService.performStartupCleanup();

        // 장바구니 데이터 로드
        await loadCart();
      } catch (error) {
        console.error('❌ App 초기화 중 오류:', error);
      }
    };

    initializeApp();
  }, [loadCart]);

  // 별도 useEffect로 인증 상태 초기화 처리
  useEffect(() => {
    const initializeAuth = async () => {
      // localStorage에서 토큰 확인
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedAuthData = localStorage.getItem('auth-storage');

      if (storedAccessToken && storedAuthData) {
        try {
          const authData = JSON.parse(storedAuthData);
          const user = authData?.state?.user;

          // 토큰은 있지만 사용자 정보가 없는 경우 프로필 로드
          if (!user && storedAccessToken) {
            await loadUserProfile();
          }

          // 토큰이 있으면 토큰 만료 체크 시작
          if (storedAccessToken) {
            TokenExpirationHandler.startExpirationCheck(
              () => localStorage.getItem('accessToken'),
              async () => {
                console.log('🔒 Token expired, logging out...');
                await logout();
              }
            );
          }
        } catch (error) {
          console.error('Failed to parse stored auth data:', error);
          // 잘못된 데이터는 정리
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    };

    // 컴포넌트 마운트 후 잠시 기다렸다가 실행 (Zustand persist 복원 후)
    const timer = setTimeout(initializeAuth, 100);
    return () => {
      clearTimeout(timer);
      // 컴포넌트 언마운트 시 토큰 체크 중지
      TokenExpirationHandler.stopExpirationCheck();
    };
  }, [loadUserProfile, isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <AppRouter />
        <Toaster position="top-right" />
      </div>
    </QueryClientProvider>
  );
}

export default App;
