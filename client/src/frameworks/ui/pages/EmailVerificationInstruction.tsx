// ========================================
// 이메일 인증 안내 페이지
// 회원가입 후 인증 링크를 보여주는 페이지
// ========================================

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const EmailVerificationInstruction: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isExpired, setIsExpired] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5분 = 300초

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // 인증 링크 생성
  const verificationLink = token
    ? `${window.location.origin}/verify-email?token=${token}`
    : '';

  // 페이지 만료 타이머 및 인증 상태 체크
  useEffect(() => {
    if (!token) {
      setIsExpired(true);
      return;
    }

    // 해당 토큰의 인증 완료 여부 확인
    const isVerified = localStorage.getItem(`email_verified_${token}`);
    if (isVerified) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      // 매 초마다 인증 완료 여부 확인
      const verified = localStorage.getItem(`email_verified_${token}`);
      if (verified) {
        setIsExpired(true);
        clearInterval(timer);
        return;
      }

      setCountdown(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [token]);

  // 페이지 새로고침/뒤로가기 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isExpired) {
        e.preventDefault();
        e.returnValue = '페이지를 새로고침하면 인증 링크가 만료됩니다.';
      }
    };

    const handlePopState = () => {
      if (!isExpired) {
        setIsExpired(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isExpired]);

  // 링크 복사 기능
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(verificationLink);
      alert('링크가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('링크 복사 실패:', err);
      alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.');
    }
  };

  // 만료된 상태
  if (isExpired || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="text-orange-600 text-6xl mb-4">⚠</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                페이지 만료
              </h2>
              <p className="text-gray-600 mb-4">
                이 인증 안내 페이지는 만료되었습니다.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-orange-800 text-sm">
                  다시 회원가입을 진행하거나 로그인을 시도해보세요.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  다시 회원가입
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  로그인 페이지로
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 시간 포맷팅 함수
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="text-blue-600 text-6xl mb-4">📧</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              이메일 인증이 필요합니다
            </h2>
            <p className="text-gray-600 mb-4">
              회원가입이 완료되었습니다! 아래 링크를 클릭하여 이메일 인증을
              완료해주세요.
            </p>

            {/* 이메일 정보 */}
            {email && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm font-medium">
                  인증 이메일: {email}
                </p>
              </div>
            )}

            {/* 인증 링크 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">인증 링크:</p>
              <a
                href={verificationLink}
                className="block w-full p-3 text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-sm break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {verificationLink}
              </a>
              <button
                onClick={copyToClipboard}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                링크 복사
              </button>
            </div>

            {/* 만료 시간 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm font-medium">
                ⏰ 이 페이지는 {formatTime(countdown)} 후 만료됩니다
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                페이지를 새로고침하거나 뒤로가기하면 링크가 만료됩니다.
              </p>
            </div>

            {/* 안내 메시지 */}
            <div className="text-left">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                📋 안내사항
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 위 링크를 클릭하여 이메일 인증을 완료해주세요</li>
                <li>• 인증이 완료되면 자동으로 홈페이지로 이동됩니다</li>
                <li>• 이 페이지는 5분 후 자동으로 만료됩니다</li>
                <li>• 페이지를 새로고침하지 마세요</li>
              </ul>
            </div>

            {/* 버튼들 */}
            <div className="mt-6 space-y-2">
              <a
                href={verificationLink}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                ✓ 이메일 인증하기
              </a>
              <button
                onClick={() => navigate('/')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                나중에 하기 (홈으로)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationInstruction;
