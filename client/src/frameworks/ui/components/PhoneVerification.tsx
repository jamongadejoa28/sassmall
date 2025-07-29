// ========================================
// 휴대폰 본인인증 컴포넌트
// client/src/frameworks/ui/components/PhoneVerification.tsx
// ========================================

import React, { useState } from 'react';
import MockPassModal from './MockPassModal';

// 🔧 수정: 프록시를 통한 상대 경로 사용
const API_BASE_URL = '';

export interface VerificationResult {
  isVerified: boolean;
  phoneNumber?: string;
  sessionId?: string;
}

export interface PhoneVerificationProps {
  phoneNumber: string;
  disabled?: boolean;
  onVerificationComplete: (result: VerificationResult) => void;
  onVerificationFailed: (error: string) => void;
}

interface VerificationSession {
  sessionId: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  phoneNumber: string;
  isExpired: boolean;
  remainingTime?: number;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  phoneNumber,
  disabled = false,
  onVerificationComplete,
  onVerificationFailed,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] =
    useState<VerificationSession | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'pending' | 'completed' | 'failed'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 휴대폰 번호 형식 검증
  const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^010\d{8}$/;
    return phoneRegex.test(phone.replace(/[-\s]/g, ''));
  };

  // 인증 요청 시작
  const handleStartVerification = async (): Promise<void> => {
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setErrorMessage('올바른 휴대폰 번호를 입력해주세요. (010-0000-0000)');
      onVerificationFailed('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/phone-verification/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber.replace(/[-\s]/g, ''),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        const session: VerificationSession = {
          sessionId: data.data.sessionId,
          status: 'pending',
          phoneNumber: phoneNumber,
          isExpired: false,
        };

        setCurrentSession(session);
        setVerificationStatus('pending');
        setIsModalOpen(true);

        // 상태 폴링 시작
        startStatusPolling(data.data.sessionId);
      } else {
        const errorMsg = data.error || '인증 요청에 실패했습니다.';
        setErrorMessage(errorMsg);
        onVerificationFailed(errorMsg);
      }
    } catch (error) {
      console.error('인증 요청 오류:', error);
      const errorMsg = '인증 요청 중 오류가 발생했습니다.';
      setErrorMessage(errorMsg);
      onVerificationFailed(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 상태 폴링 시작
  const startStatusPolling = (sessionId: string): void => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/auth/phone-verification/status/${sessionId}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          const status = data.data;

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setVerificationStatus('completed');
            setIsModalOpen(false);

            onVerificationComplete({
              isVerified: true,
              phoneNumber: status.phoneNumber,
              sessionId: sessionId,
            });
          } else if (
            status.status === 'failed' ||
            status.status === 'expired'
          ) {
            clearInterval(pollInterval);
            setVerificationStatus('failed');
            setIsModalOpen(false);

            const errorMsg =
              status.status === 'expired'
                ? '인증 시간이 만료되었습니다. 다시 시도해주세요.'
                : '인증에 실패했습니다. 다시 시도해주세요.';
            setErrorMessage(errorMsg);
            onVerificationFailed(errorMsg);
          }

          setCurrentSession(prev => (prev ? { ...prev, ...status } : null));
        }
      } catch (error) {
        console.error('상태 확인 오류:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // 2초마다 상태 확인

    // 5분 후 자동 종료
    setTimeout(
      () => {
        clearInterval(pollInterval);
        if (verificationStatus === 'pending') {
          setVerificationStatus('failed');
          setIsModalOpen(false);
          setErrorMessage('인증 시간이 만료되었습니다.');
          onVerificationFailed('인증 시간이 만료되었습니다.');
        }
      },
      5 * 60 * 1000
    );
  };

  // Mock 인증 완료 처리 (모달에서 호출)
  const handleMockComplete = async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/phone-verification/complete/${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('completed');
        setIsModalOpen(false);

        onVerificationComplete({
          isVerified: true,
          phoneNumber: data.data.phoneNumber,
          sessionId: sessionId,
        });
      } else {
        const errorMsg = data.error || '인증 완료 처리에 실패했습니다.';
        setErrorMessage(errorMsg);
        onVerificationFailed(errorMsg);
      }
    } catch (error) {
      console.error('인증 완료 오류:', error);
      const errorMsg = '인증 완료 처리 중 오류가 발생했습니다.';
      setErrorMessage(errorMsg);
      onVerificationFailed(errorMsg);
    }
  };

  // 모달 닫기
  const handleModalClose = (): void => {
    setIsModalOpen(false);
    if (verificationStatus === 'pending') {
      setErrorMessage('인증이 취소되었습니다.');
      onVerificationFailed('인증이 취소되었습니다.');
    }
  };

  // 상태에 따른 버튼 텍스트 및 스타일
  const getButtonConfig = () => {
    if (isLoading) {
      return {
        text: '요청 중...',
        className: 'bg-gray-400 cursor-not-allowed',
        disabled: true,
      };
    }

    if (verificationStatus === 'completed') {
      return {
        text: '인증 완료 ✓',
        className: 'bg-green-500 hover:bg-green-600 text-white',
        disabled: true,
      };
    }

    if (verificationStatus === 'pending') {
      return {
        text: '인증 진행 중...',
        className: 'bg-blue-500 hover:bg-blue-600 text-white',
        disabled: false,
      };
    }

    return {
      text: 'PASS 인증',
      className: 'bg-blue-600 hover:bg-blue-700 text-white',
      disabled: disabled || !isValidPhoneNumber(phoneNumber),
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="space-y-3">
      {/* 인증 버튼 */}
      <button
        type="button"
        onClick={handleStartVerification}
        disabled={buttonConfig.disabled}
        className={`w-full px-4 py-2 text-sm font-medium rounded-md shadow-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${buttonConfig.className}`}
      >
        {buttonConfig.text}
      </button>

      {/* 상태 메시지 */}
      {verificationStatus === 'pending' && (
        <div className="flex items-center text-sm text-blue-600">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>PASS 앱에서 인증을 완료해주세요...</span>
        </div>
      )}

      {verificationStatus === 'completed' && (
        <div className="flex items-center text-sm text-green-600">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">휴대폰 본인인증이 완료되었습니다</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="flex items-center text-sm text-red-600">
          <svg
            className="w-4 h-4 mr-2 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 휴대폰 번호 형식 안내 */}
      {!isValidPhoneNumber(phoneNumber) && phoneNumber && (
        <div className="text-xs text-gray-500">
          📱 올바른 형식: 010-0000-0000 (숫자만 11자리)
        </div>
      )}

      {/* Mock PASS 모달 */}
      <MockPassModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onComplete={() =>
          currentSession && handleMockComplete(currentSession.sessionId)
        }
        phoneNumber={phoneNumber}
        sessionId={currentSession?.sessionId}
      />
    </div>
  );
};

export default PhoneVerification;
