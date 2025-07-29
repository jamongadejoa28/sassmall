// ========================================
// Mock PASS 인증 모달 컴포넌트
// client/src/frameworks/ui/components/MockPassModal.tsx
// ========================================

import React, { useState, useEffect } from 'react';

export interface MockPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  phoneNumber: string;
  sessionId?: string;
}

const MockPassModal: React.FC<MockPassModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  phoneNumber,
  sessionId,
}) => {
  const [step, setStep] = useState<
    'loading' | 'verify' | 'processing' | 'success'
  >('loading');
  const [countdown, setCountdown] = useState(300); // 5분 = 300초
  const [isCompleting, setIsCompleting] = useState(false);

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setStep('loading');
      setCountdown(300);
      setIsCompleting(false);

      // 로딩 시뮬레이션 (2초)
      const loadingTimer = setTimeout(() => {
        setStep('verify');
      }, 2000);

      return () => clearTimeout(loadingTimer);
    }
  }, [isOpen]);

  // 카운트다운 타이머
  useEffect(() => {
    if (isOpen && step === 'verify' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, step, countdown, onClose]);

  // 인증 완료 처리
  const handleComplete = async (): Promise<void> => {
    setIsCompleting(true);
    setStep('processing');

    // 처리 시뮬레이션 (1.5초)
    setTimeout(() => {
      setStep('success');

      // 성공 메시지 표시 후 완료
      setTimeout(() => {
        onComplete();
      }, 1500);
    }, 1500);
  };

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 휴대폰 번호 마스킹
  const maskPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[-\s]/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-****-${cleaned.slice(-4)}`;
    }
    return phone;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={() => {
            // 인증 처리 중이거나 성공 단계에서는 외부 클릭으로 모달을 닫을 수 없음
            if (step !== 'processing' && step !== 'success') {
              onClose();
            }
          }}
        ></div>

        {/* 모달 컨텐츠 */}
        <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
          {/* 로딩 단계 */}
          {step === 'loading' && (
            <div className="text-center">
              {/* PASS 로고 영역 */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <div className="text-2xl font-bold text-blue-600">P</div>
              </div>

              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                PASS 인증
              </h3>

              <div className="mb-4">
                <div className="animate-spin mx-auto h-8 w-8 border-b-2 border-blue-600"></div>
              </div>

              <p className="text-sm text-gray-500">
                인증을 준비하고 있습니다...
              </p>
            </div>
          )}

          {/* 인증 단계 */}
          {step === 'verify' && (
            <div className="text-center">
              {/* PASS 로고 영역 */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <div className="text-2xl font-bold text-blue-600">P</div>
              </div>

              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                본인인증
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">휴대폰 번호</p>
                <p className="text-lg font-medium text-gray-900 mb-4">
                  {maskPhoneNumber(phoneNumber)}
                </p>

                {/* 남은 시간 */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">남은 시간</p>
                  <p className="text-xl font-mono font-bold text-red-500">
                    {formatTime(countdown)}
                  </p>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-600">
                  💡 개발/테스트 환경에서는 아래 버튼을 클릭하여
                  <br />
                  인증을 완료할 수 있습니다.
                </p>
              </div>

              {/* 버튼들 */}
              <div className="space-y-2">
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="w-full bg-blue-600 border border-transparent rounded-md py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCompleting ? '처리 중...' : '인증 완료'}
                </button>

                <button
                  onClick={onClose}
                  disabled={isCompleting}
                  className="w-full bg-white border border-gray-300 rounded-md py-3 px-4 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
              </div>

              {/* 세션 정보 (개발용) */}
              {sessionId && process.env.NODE_ENV === 'development' && (
                <div className="mt-4 text-xs text-gray-400">
                  Session: {sessionId.slice(0, 8)}...
                </div>
              )}
            </div>
          )}

          {/* 처리 중 단계 */}
          {step === 'processing' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600"></div>
              </div>

              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                인증 처리 중
              </h3>

              <p className="text-sm text-gray-500">잠시만 기다려 주세요...</p>
            </div>
          )}

          {/* 성공 단계 */}
          {step === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>

              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                인증 완료
              </h3>

              <p className="text-sm text-green-600 font-medium">
                휴대폰 본인인증이 완료되었습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockPassModal;
