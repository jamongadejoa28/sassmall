// ========================================
// 이메일 인증 페이지
// ========================================

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'expired'
  >('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isVerified, setIsVerified] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('인증 토큰이 없습니다.');
      return;
    }

    // 이메일 인증 처리
    const verifyEmail = async () => {
      try {
        // 실제 API 호출
        const response = await fetch(
          `/api/v1/auth/verify-email?token=${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          setStatus('success');
          setMessage('이메일 인증이 완료되었습니다!');
          setIsVerified(true);

          // 로컬 스토리지에 인증 완료 표시 (토큰별로 관리)
          localStorage.setItem(`email_verified_${token}`, 'true');

          // 5초 카운트다운 후 홈으로 이동
          let timer = 5;
          const interval = setInterval(() => {
            timer--;
            setCountdown(timer);
            if (timer <= 0) {
              clearInterval(interval);
              navigate('/');
            }
          }, 1000);
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.message || '이메일 인증에 실패했습니다.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
        console.error('Email verification error:', error);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  // 페이지 이탈 방지 및 만료 처리
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isVerified && status === 'success') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePopState = () => {
      if (isVerified) {
        setStatus('expired');
        setMessage('이 인증 링크는 이미 사용되었습니다.');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isVerified, status]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  이메일 인증 중...
                </h2>
                <p className="text-gray-600">잠시만 기다려주세요.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="text-green-600 text-6xl mb-4">✓</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  인증 완료!
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 text-sm font-medium">
                    이제 로그인하여 서비스를 이용할 수 있습니다.
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {countdown}초 후 자동으로 홈페이지로 이동합니다...
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  바로 홈으로 이동
                </button>
              </>
            )}

            {status === 'expired' && (
              <>
                <div className="text-orange-600 text-5xl mb-4">⚠</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  링크 만료
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  홈으로 이동
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="text-red-600 text-5xl mb-4">✗</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  인증 실패
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    다시 회원가입
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    홈으로 이동
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
