import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const PaymentFailPage: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [failureInfo, setFailureInfo] = useState<{
    errorCode?: string;
    errorMessage?: string;
  }>({});

  useEffect(() => {
    // URL 파라미터에서 TossPayments 에러 정보 추출
    const errorCode = searchParams.get('code');
    const errorMessage = searchParams.get('message');

    setFailureInfo({
      errorCode: errorCode || undefined,
      errorMessage:
        errorMessage || 'TossPayments 결제가 취소되거나 실패했습니다.',
    });
  }, [orderId, searchParams]);

  const getTossPaymentsFailureReason = () => {
    const { errorCode, errorMessage } = failureInfo;

    if (errorCode) {
      switch (errorCode) {
        case 'USER_CANCEL':
          return '사용자가 결제를 취소했습니다.';
        case 'PAYMENT_TIMEOUT':
          return '결제 시간이 초과되었습니다.';
        case 'INVALID_CARD':
          return '카드 정보가 올바르지 않습니다.';
        case 'INSUFFICIENT_FUNDS':
          return '잔액이 부족합니다.';
        case 'EXCEED_MAX_DAILY_PAYMENT_COUNT':
          return '일일 결제 한도를 초과했습니다.';
        case 'REJECT_CARD_COMPANY':
          return '카드사에서 결제를 거절했습니다.';
        case 'INVALID_API_KEY':
          return 'API 키가 유효하지 않습니다.';
        default:
          return errorMessage || '알 수 없는 오류가 발생했습니다.';
      }
    }

    return errorMessage || 'TossPayments 결제가 실패했습니다.';
  };

  const handleRetryPayment = () => {
    if (orderId) {
      // 체크아웃 페이지로 이동하여 다시 결제 시도
      navigate('/checkout');
    } else {
      // 장바구니로 돌아가기
      navigate('/cart');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 실패 헤더 */}
          <div className="bg-red-500 text-white p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold">TossPayments 결제 실패</h1>
            <p className="text-lg opacity-90 mt-2">
              결제 처리 중 문제가 발생했습니다.
            </p>
          </div>

          {/* 실패 정보 */}
          <div className="p-8">
            <div className="space-y-6">
              <div className="border-b pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  실패 원인
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">
                    {getTossPaymentsFailureReason()}
                  </p>
                  {failureInfo.errorCode && (
                    <p className="text-sm text-red-600 mt-2">
                      오류 코드: {failureInfo.errorCode}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  해결 방법
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 카드 정보를 다시 확인해주세요</p>
                  <p>• 결제 한도를 확인해주세요</p>
                  <p>• 네트워크 연결 상태를 확인해주세요</p>
                  <p>• 다른 결제 수단을 시도해보세요</p>
                  <p>• 잠시 후 다시 시도해주세요</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  📞 고객센터 문의
                </h4>
                <p className="text-sm text-blue-800">
                  문제가 지속되면 고객센터로 문의해주세요.
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  전화: 1588-1234 | 이메일: support@shopping-mall.com
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleRetryPayment}
                    className="bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 font-medium"
                  >
                    다시 결제하기
                  </button>
                  <button
                    onClick={() => navigate('/cart')}
                    className="bg-gray-300 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-400 font-medium"
                  >
                    장바구니로 돌아가기
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-gray-100 text-gray-600 py-3 px-6 rounded-md hover:bg-gray-200 font-medium"
                  >
                    홈으로 이동
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TossPayments 관련 추가 도움말 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            TossPayments 자주 발생하는 문제
          </h3>
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-400 pl-4">
              <h4 className="font-medium text-gray-900">결제 시간 초과</h4>
              <p className="text-sm text-gray-600">
                결제 페이지에서 10분 이상 대기하면 세션이 만료됩니다. 처음부터
                다시 시도해주세요.
              </p>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-medium text-gray-900">카드사 시스템 점검</h4>
              <p className="text-sm text-gray-600">
                카드사 점검 시간에는 결제가 불가능할 수 있습니다. 다른 결제
                수단을 이용하거나 점검 종료 후 다시 시도해주세요.
              </p>
            </div>
            <div className="border-l-4 border-green-400 pl-4">
              <h4 className="font-medium text-gray-900">모바일 결제 문제</h4>
              <p className="text-sm text-gray-600">
                모바일에서 결제 시 브라우저를 최신 버전으로 업데이트하고, 팝업
                차단을 해제한 후 다시 시도해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailPage;
