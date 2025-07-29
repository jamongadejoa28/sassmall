// ========================================
// useCartSession Hook - 장바구니 세션 관리 훅
// client/src/hooks/useCartSession.ts
// ========================================

import { useEffect, useState } from 'react';
import { cartSessionManager } from '../adapters/storage/CartSessionManager';

interface UseCartSessionReturn {
  sessionId: string | null;
  remainingTime: number;
  isActive: boolean;
  isLoggedIn: boolean;
  extendSession: () => void;
  clearSession: () => void;
  getDebugInfo: () => object;
}

/**
 * 장바구니 세션 관리를 위한 React Hook
 *
 * 기능:
 * - 세션 초기화 및 관리
 * - 세션 상태 모니터링
 * - 로그인 상태에 따른 세션 처리
 */
export const useCartSession = (): UseCartSessionReturn => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(-1);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // 초기 세션 ID 설정
    const currentSessionId = cartSessionManager.getSessionId();
    setSessionId(currentSessionId);

    // 상태 업데이트 함수
    const updateSessionState = () => {
      const remaining = cartSessionManager.getRemainingTime();
      const active = !cartSessionManager.isSessionExpired();

      setRemainingTime(remaining);
      setIsActive(active);

      // 로그인 상태 확인 (localStorage의 auth 정보 확인)
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const authData = JSON.parse(authStorage);
          const loggedIn = !!authData.state?.token;
          setIsLoggedIn(loggedIn);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.warn('[useCartSession] Auth 정보 확인 실패:', error);
        setIsLoggedIn(false);
      }
    };

    // 초기 상태 업데이트
    updateSessionState();

    // 30초마다 상태 업데이트 (성능 최적화)
    const interval = setInterval(updateSessionState, 30000);

    // 세션 만료 이벤트 리스너
    const handleSessionExpired = () => {
      updateSessionState();
    };

    // 스토리지 변경 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-storage') {
        updateSessionState();
      }
    };

    window.addEventListener('cartSessionExpired', handleSessionExpired);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('cartSessionExpired', handleSessionExpired);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const extendSession = () => {
    cartSessionManager.recordActivity();

    // 즉시 상태 업데이트
    const remaining = cartSessionManager.getRemainingTime();
    const active = !cartSessionManager.isSessionExpired();
    setRemainingTime(remaining);
    setIsActive(active);
  };

  const clearSession = () => {
    cartSessionManager.clearSession();
    setSessionId(null);
    setRemainingTime(-1);
    setIsActive(false);
  };

  const getDebugInfo = () => {
    return cartSessionManager.getDebugInfo();
  };

  return {
    sessionId,
    remainingTime,
    isActive,
    isLoggedIn,
    extendSession,
    clearSession,
    getDebugInfo,
  };
};
