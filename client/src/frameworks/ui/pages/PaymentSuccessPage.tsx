import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { OrderApiAdapter } from '../../../adapters/api/OrderApiAdapter';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';

interface PaymentData {
  orderId: string;
  paymentKey: string;
  amount: number;
}

interface PaymentSuccessData {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentKey: string;
  paymentInfo?: any;
}

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [isApproving, setIsApproving] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [approvedData, setApprovedData] = useState<PaymentSuccessData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const processedRef = useRef<boolean>(false);

  const orderApiAdapter = useMemo(() => new OrderApiAdapter(), []);

  useEffect(() => {
    // 컴포넌트 로드 시 결제 정보만 설정 (자동 승인 제거)
    if (processedRef.current) {
      return;
    }

    if (!orderId) {
      setError('주문 ID가 없습니다.');
      return;
    }

    const paymentKey = searchParams.get('paymentKey');
    const amount = searchParams.get('amount');

    if (!paymentKey || !amount) {
      setError('결제 정보가 불완전합니다.');
      return;
    }

    processedRef.current = true;

    // 결제 정보만 설정 (승인 API 호출하지 않음)
    setPaymentData({
      orderId,
      paymentKey,
      amount: parseInt(amount),
    });
  }, [orderId, searchParams]);

  const handleApprovePayment = useCallback(async () => {
    if (!paymentData || isApproving) return;

    setIsApproving(true);
    setError(null);

    try {
      const response = await orderApiAdapter.approvePayment(
        paymentData.paymentKey,
        paymentData.orderId,
        paymentData.amount
      );

      if (response.success) {
        setApprovedData({
          orderId: paymentData.orderId,
          orderNumber: response.data?.orderNumber || paymentData.orderId,
          totalAmount: paymentData.amount,
          paymentKey: paymentData.paymentKey,
          paymentInfo: response.data?.paymentInfo,
        });
        setIsApproved(true);
      } else {
        throw new Error(
          response.message || 'TossPayments 결제 승인에 실패했습니다.'
        );
      }
    } catch (error: any) {
      setError(error.message || '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsApproving(false);
    }
  }, [paymentData, isApproving, orderApiAdapter]);

  // 로딩 상태 (결제 정보 로드 중)
  if (!paymentData && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-gray-600">
            결제 정보를 불러오고 있습니다...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">결제 실패</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/cart')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              장바구니로 돌아가기
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 결제 승인 완료 후 화면
  if (isApproved && approvedData) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 성공 헤더 */}
            <div className="bg-green-500 text-white p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold">결제 완료!</h1>
              <p className="text-lg opacity-90 mt-2">
                TossPayments 결제가 성공적으로 처리되었습니다.
              </p>
            </div>

            {/* 주문 정보 */}
            <div className="p-8">
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    결제 정보
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">주문번호</p>
                      <p className="font-medium">{approvedData.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">결제금액</p>
                      <p className="font-medium text-lg text-green-600">
                        {approvedData.totalAmount.toLocaleString()}원
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">결제방법</p>
                      <p className="font-medium">TossPayments</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">결제시간</p>
                      <p className="font-medium">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    다음 단계
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>✓ 결제 완료</p>
                    <p>✓ 주문 접수 완료</p>
                    <p>• 주문 확인 및 준비 중</p>
                    <p>• 배송 준비</p>
                    <p>• 배송 시작</p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    주문 상태는 마이페이지에서 확인하실 수 있습니다.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => navigate(`/orders/${orderId}`)}
                      className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
                    >
                      주문 상세보기
                    </button>
                    <button
                      onClick={() => navigate('/orders')}
                      className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400"
                    >
                      주문 내역
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="bg-gray-100 text-gray-600 py-2 px-6 rounded-md hover:bg-gray-200"
                    >
                      계속 쇼핑하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 결제 승인 대기 화면 (수동 승인 버튼)
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 승인 대기 헤더 */}
          <div className="bg-blue-500 text-white p-8 text-center">
            <div className="text-6xl mb-4">💳</div>
            <h1 className="text-3xl font-bold">TossPayments 결제</h1>
            <p className="text-lg opacity-90 mt-2">
              결제 정보를 확인하고 승인해주세요.
            </p>
          </div>

          {/* 결제 정보 */}
          <div className="p-8">
            <div className="space-y-6">
              <div className="border-b pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  주문 요약
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">주문번호</p>
                    <p className="font-medium">{paymentData?.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">결제금액</p>
                    <p className="font-medium text-lg text-blue-600">
                      {paymentData?.amount.toLocaleString()}원
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">결제방법</p>
                    <p className="font-medium">TossPayments</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">결제시간</p>
                    <p className="font-medium">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 승인 안내 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      결제를 완료하려면 승인이 필요합니다
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      아래 버튼을 클릭하여 결제를 승인해주세요.
                    </p>
                  </div>
                </div>
              </div>

              {/* 승인 버튼 */}
              <div className="text-center space-y-4">
                <button
                  onClick={handleApprovePayment}
                  disabled={isApproving}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isApproving ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">결제 승인 중...</span>
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💳</span>
                      {paymentData?.amount.toLocaleString()}원 TossPayments로
                      결제하기
                    </>
                  )}
                </button>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/cart')}
                    className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400"
                  >
                    장바구니로 돌아가기
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-gray-100 text-gray-600 py-2 px-6 rounded-md hover:bg-gray-200"
                  >
                    홈으로 이동
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
