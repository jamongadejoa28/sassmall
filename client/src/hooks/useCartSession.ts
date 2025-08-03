// ========================================
// useCartSession Hook - 장바구니 세션 관리 훅
// client/src/hooks/useCartSession.ts
// ========================================

import { useEffect, useState } from 'react';
import { cartSessionManager } from '../utils/cartSessionManager';

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
      const active = cartSessionManager.isSessionActive();

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

    // 이벤트 기반 상태 업데이트 (폴링 제거)
    const handleSessionExpired = () => {
      updateSessionState();
    };

    const handleSessionUpdate = () => {
      updateSessionState();
    };

    // 스토리지 변경 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시)
    const handleStorageChange = (e: StorageEvent) => {
      // 같은 탭에서 발생한 storage 이벤트는 무시 (cross-tab 동기화만 처리)
      if (e.storageArea === localStorage && e.key === 'auth-storage') {
        updateSessionState();
      }
      // cart_session은 대부분 같은 탭에서 발생하므로 무시
    };

    // 사용자 활동 기반 상태 업데이트 (쓰로틀링 적용)
    let lastActivityTime = 0;
    const ACTIVITY_THROTTLE_MS = 5000; // 5초마다 한 번만 실행

    const handleUserActivity = (event: Event) => {
      // 시스템 키 조합 제외 (Alt+Tab, Ctrl+C 등)
      if (event instanceof KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return; // 시스템 키 조합은 무시
        }
      }

      const now = Date.now();
      if (now - lastActivityTime < ACTIVITY_THROTTLE_MS) {
        return; // 쓰로틀링: 너무 자주 호출되지 않도록 제한
      }
      lastActivityTime = now;

      // 키보드 활동은 localStorage 업데이트 없이 메모리에만 기록
      if (cartSessionManager.isSessionActive()) {
        // recordActivity 대신 단순히 활동 시간만 메모리에 기록
        // localStorage 업데이트는 하지 않음으로써 storage 이벤트 방지
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('cartSessionExpired', handleSessionExpired);
    window.addEventListener('cartSessionUpdate', handleSessionUpdate);
    window.addEventListener('storage', handleStorageChange);

    // 사용자 활동 감지 (필요시에만)
    const activityEvents = ['mousedown', 'keydown', 'touchstart'] as const;
    activityEvents.forEach(eventType => {
      document.addEventListener(eventType, handleUserActivity, {
        passive: true,
        once: false,
      });
    });

    return () => {
      window.removeEventListener('cartSessionExpired', handleSessionExpired);
      window.removeEventListener('cartSessionUpdate', handleSessionUpdate);
      window.removeEventListener('storage', handleStorageChange);

      activityEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleUserActivity);
      });
    };
  }, []);

  const extendSession = () => {
    cartSessionManager.recordActivity();

    // 즉시 상태 업데이트
    const remaining = cartSessionManager.getRemainingTime();
    const active = cartSessionManager.isSessionActive();
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
