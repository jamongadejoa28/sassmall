// ========================================
// Cart Session Timeout Notice Component
// client/src/frameworks/ui/components/CartSessionTimeoutNotice.tsx
// ========================================

import React, { useState, useEffect } from 'react';
import { cartSessionManager } from '../../../utils/cartSessionManager';

interface CartSessionTimeoutNoticeProps {
  onSessionExpired?: () => void;
  showWarningAt?: number; // 경고 표시 시점 (초)
}

const CartSessionTimeoutNotice: React.FC<CartSessionTimeoutNoticeProps> = ({
  onSessionExpired,
  showWarningAt = 300, // 기본값: 5분 전
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(-1);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const updateRemainingTime = () => {
      const remaining = cartSessionManager.getRemainingTime();
      setRemainingTime(remaining);

      // 로그인 사용자는 타임아웃이 없음
      if (remaining === -1) {
        setShowWarning(false);
        setIsVisible(false);
        return;
      }

      // 경고 표시 여부 결정
      if (remaining > 0 && remaining <= showWarningAt) {
        setShowWarning(true);
        setIsVisible(true);
      } else if (remaining <= 0) {
        setShowWarning(false);
        setIsVisible(false);
        onSessionExpired?.();
      } else {
        setShowWarning(false);
        setIsVisible(false);
      }
    };

    // 초기 확인
    updateRemainingTime();

    // 10초마다 확인
    const interval = setInterval(updateRemainingTime, 10000);

    // 세션 만료 이벤트 리스너
    const handleSessionExpired = () => {
      setShowWarning(false);
      setIsVisible(false);
      onSessionExpired?.();
    };

    window.addEventListener('cartSessionExpired', handleSessionExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener('cartSessionExpired', handleSessionExpired);
    };
  }, [showWarningAt, onSessionExpired]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = () => {
    // 사용자 활동을 기록하여 세션 연장
    cartSessionManager.recordActivity();
    setShowWarning(false);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !showWarning) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              장바구니 세션 만료 예정
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                {remainingTime > 60
                  ? `${formatTime(remainingTime)} 후에 장바구니가 자동으로 비워집니다.`
                  : `${remainingTime}초 후에 장바구니가 자동으로 비워집니다.`}
              </p>
              <p className="mt-1 text-xs">
                활동을 계속하시려면 '세션 연장' 버튼을 클릭해주세요.
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleExtendSession}
                className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
              >
                세션 연장
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-yellow-600 border border-yellow-600 px-3 py-1 rounded hover:bg-yellow-50 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="text-yellow-400 hover:text-yellow-600"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="bg-yellow-200 rounded-full h-2">
            <div
              className="bg-yellow-600 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, Math.min(100, (remainingTime / showWarningAt) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSessionTimeoutNotice;
