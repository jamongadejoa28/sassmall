import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

interface TossPaymentsWidgetProps {
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  onReady?: () => void;
  onError?: (error: any) => void;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  theme?: 'light' | 'dark';
  locale?: 'ko' | 'en';
}

interface TossPaymentsWidgetRef {
  requestPayment: (successUrl: string, failUrl: string) => Promise<void>;
  isReady: () => boolean;
  getWidgetInstance: () => any;
  refreshWidget: () => Promise<void>;
  getPaymentMethods: () => any[];
  updateAmount: (newAmount: number) => Promise<void>;
}

const TossPaymentsWidget = forwardRef<
  TossPaymentsWidgetRef,
  TossPaymentsWidgetProps
>(
  (
    {
      amount,
      orderId,
      orderName,
      customerEmail,
      customerName,
      onReady,
      onError,
      onLoadStart,
      onLoadComplete,
      theme = 'light',
      locale: _locale = 'ko',
    },
    ref
  ) => {
    // 상태 관리
    const [widgets, setWidgets] = useState<any>(null);
    const [ready, setReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastError, setLastError] = useState<Error | null>(null);
    const mountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const initializationPromiseRef = useRef<Promise<void> | null>(null);

    // 고정 설정값 (환경 변수로 관리)
    const clientKey =
      process.env.REACT_APP_TOSS_PAYMENTS_CLIENT_KEY ||
      'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

    // 고유 ID 생성 (useMemo로 메모이제이션)
    const componentId = useMemo(() => {
      const randomId = Math.random().toString(36).substring(2, 11);
      const timestamp = Date.now().toString(36);
      return `toss${timestamp}${randomId}`;
    }, []);

    const paymentMethodId = useMemo(
      () => `payment-method-${componentId}`,
      [componentId]
    );
    const agreementId = useMemo(
      () => `agreement-${componentId}`,
      [componentId]
    );

    // 고정된 customerKey 생성 (useMemo로 메모이제이션)
    // customerKey는 이메일이 아닌 고유 식별자여야 함
    const customerKey = useMemo(() => {
      return window.btoa(Math.random().toString()).slice(0, 20);
    }, []);

    // 콜백 최적화
    const handleLoadStart = useCallback(() => {
      onLoadStart?.();
    }, [onLoadStart]);

    const handleLoadComplete = useCallback(() => {
      onLoadComplete?.();
    }, [onLoadComplete]);

    const handleError = useCallback(
      (error: any) => {
        setLastError(error);
        onError?.(error);
      },
      [onError]
    );

    const handleReady = useCallback(() => {
      onReady?.();
    }, [onReady]);

    // SDK 캐싱을 위한 static 변수
    const sdkCacheRef = useRef<any>(null);

    // 1단계: TossPayments SDK 초기화 및 위젯 인스턴스 생성
    useEffect(() => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      async function initializeTossPayments() {
        // 중복 초기화 방지
        if (initializationPromiseRef.current) {
          return initializationPromiseRef.current;
        }

        initializationPromiseRef.current = (async () => {
          try {
            setIsLoading(true);
            setLastError(null);
            handleLoadStart();

            // 마운트 상태 확인
            if (!mountedRef.current || abortController.signal.aborted) {
              return;
            }

            // SDK 캐싱 확인 및 로드 (재시도 로직 포함)
            let tossPayments = sdkCacheRef.current;
            if (!tossPayments) {
              const maxRetries = 3;
              let retryAttempt = 0;

              while (retryAttempt < maxRetries) {
                try {
                  tossPayments = await loadTossPayments(clientKey);
                  sdkCacheRef.current = tossPayments;
                  break;
                } catch (sdkError) {
                  retryAttempt++;

                  if (retryAttempt >= maxRetries) {
                    throw new Error(
                      `SDK 로드 실패: ${maxRetries}번 재시도 수행`
                    );
                  }

                  // 지수 백오프 대기
                  const delay = Math.pow(2, retryAttempt) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
            }

            if (!mountedRef.current || abortController.signal.aborted) {
              return;
            }

            // 위젯 인스턴스 생성 (향상된 옵션)
            const widgetInstance = tossPayments.widgets({
              customerKey: customerKey,
            });

            if (!mountedRef.current || abortController.signal.aborted) {
              return;
            }

            setWidgets(widgetInstance);
            handleLoadComplete();
          } catch (error) {
            console.error('❌ [TossWidget] SDK 초기화 오류:', error);
            setRetryCount(prev => prev + 1);
            if (mountedRef.current && !abortController.signal.aborted) {
              handleError(error);
            }
            throw error;
          } finally {
            if (mountedRef.current && !abortController.signal.aborted) {
              setIsLoading(false);
            }
          }
        })();

        return initializationPromiseRef.current;
      }

      // 컴포넌트 마운트 상태 설정
      mountedRef.current = true;

      // 비동기 초기화 시작
      initializeTossPayments().catch(error => {
        console.error('🚫 [TossWidget] 초기화 실패:', error);
      });

      return () => {
        abortController.abort();
        mountedRef.current = false;
        initializationPromiseRef.current = null;
      };
    }, [
      clientKey,
      customerKey,
      handleError,
      handleLoadStart,
      handleLoadComplete,
    ]);

    // 재시도 이벤트 리스너 등록
    useEffect(() => {
      const handleRetryEvent = () => {
        if (mountedRef.current) {
          const abortController = new AbortController();
          abortControllerRef.current = abortController;

          const retryInitialization = async () => {
            try {
              setIsLoading(true);
              setLastError(null);
              handleLoadStart();

              // 마운트 상태 확인
              if (!mountedRef.current || abortController.signal.aborted) {
                return;
              }

              // SDK 캐시 초기화
              sdkCacheRef.current = null;

              // SDK 재로드
              const tossPayments = await loadTossPayments(clientKey);
              sdkCacheRef.current = tossPayments;

              if (!mountedRef.current || abortController.signal.aborted) {
                return;
              }

              // 위젯 인스턴스 재생성
              const widgetInstance = tossPayments.widgets({
                customerKey: customerKey,
              });

              if (!mountedRef.current || abortController.signal.aborted) {
                return;
              }

              setWidgets(widgetInstance);
              handleLoadComplete();
            } catch (error) {
              // 재시도 초기화 오류 - 사일런트 처리
              setRetryCount(prev => prev + 1);
              if (mountedRef.current && !abortController.signal.aborted) {
                handleError(error);
              }
            } finally {
              if (mountedRef.current && !abortController.signal.aborted) {
                setIsLoading(false);
              }
            }
          };

          retryInitialization();
        }
      };

      window.addEventListener('retryTossInitialization', handleRetryEvent);

      return () => {
        window.removeEventListener('retryTossInitialization', handleRetryEvent);
      };
    }, [
      clientKey,
      customerKey,
      handleError,
      handleLoadStart,
      handleLoadComplete,
    ]);

    // DOM 요소 확인 함수 (메모이제이션)
    const checkDOMElements = useCallback(() => {
      const paymentElement = document.getElementById(paymentMethodId);
      const agreementElement = document.getElementById(agreementId);

      if (!paymentElement || !agreementElement) {
        console.error('❌ [TossWidget] DOM 요소가 마운트되지 않음:', {
          paymentMethodId,
          agreementId,
          paymentElement: !!paymentElement,
          agreementElement: !!agreementElement,
        });
        throw new Error('DOM 요소가 마운트되지 않았습니다');
      }

      return { paymentElement, agreementElement };
    }, [paymentMethodId, agreementId]);

    // 2단계: DOM 마운트 후 위젯 UI 렌더링 (useLayoutEffect로 DOM 보장)
    useLayoutEffect(() => {
      let renderTimeoutId: NodeJS.Timeout;
      const abortController = new AbortController();

      async function renderPaymentWidgets() {
        if (!widgets || !mountedRef.current || abortController.signal.aborted) {
          return;
        }

        try {
          setIsLoading(true);

          // DOM 요소 확인
          checkDOMElements();

          // 결제 금액 설정
          await widgets.setAmount({
            currency: 'KRW',
            value: amount,
          });

          if (!mountedRef.current || abortController.signal.aborted) {
            return;
          }

          // 결제 수단 UI 렌더링

          const renderOptions = {
            paymentMethods: {
              selector: `#${paymentMethodId}`,
              variantKey: 'DEFAULT',
            },
            agreement: {
              selector: `#${agreementId}`,
            },
          };

          await Promise.all([
            widgets.renderPaymentMethods(renderOptions.paymentMethods),
            widgets.renderAgreement(renderOptions.agreement),
          ]);

          if (!mountedRef.current || abortController.signal.aborted) {
            return;
          }

          setReady(true);
          handleReady();
        } catch (error) {
          console.error('TossPayments Widget 렌더링 오류:', error);
          if (mountedRef.current && !abortController.signal.aborted) {
            handleError(error);
          }
        } finally {
          if (mountedRef.current && !abortController.signal.aborted) {
            setIsLoading(false);
          }
        }
      }

      // widgets가 준비되면 약간의 지연 후 렌더링 (DOM 안정성 보장)
      if (widgets) {
        renderTimeoutId = setTimeout(renderPaymentWidgets, 10);
      }

      return () => {
        abortController.abort();
        if (renderTimeoutId) {
          clearTimeout(renderTimeoutId);
        }
      };
    }, [
      widgets,
      paymentMethodId,
      agreementId,
      amount,
      theme,
      handleError,
      handleReady,
      checkDOMElements,
    ]);

    // 3단계: 금액 업데이트 (디바운싱 적용)
    useEffect(() => {
      if (!widgets || !ready || !mountedRef.current) {
        return;
      }

      const updateAmountDebounced = setTimeout(() => {
        if (widgets && ready && mountedRef.current) {
          try {
            widgets.setAmount({
              currency: 'KRW',
              value: amount,
            });
          } catch (error) {
            console.warn('💰 [TossWidget] 금액 업데이트 중 오류:', error);
            handleError(error);
          }
        }
      }, 300); // 300ms 디바운싱

      return () => {
        clearTimeout(updateAmountDebounced);
      };
    }, [amount, widgets, ready, handleError]);

    // Cleanup: 컴포넌트 언마운트 시 모든 리소스 정리
    useEffect(() => {
      return () => {
        mountedRef.current = false;

        // AbortController 정리
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // DOM 정리는 하지 않음 - React가 자동으로 처리
        // TossPayments SDK가 생성한 DOM 요소는 React가 관리하지 않으므로
        // 직접 정리하지 않고 컴포넌트 언마운트 시 React가 처리하도록 함
      };
    }, [paymentMethodId, agreementId]);

    // 결제 요청 함수 (메모이제이션)
    const requestPayment = useCallback(
      async (successUrl: string, failUrl: string) => {
        try {
          if (!widgets || !ready || !mountedRef.current) {
            throw new Error('결제 위젯이 준비되지 않았습니다');
          }

          await widgets.requestPayment({
            orderId,
            orderName,
            successUrl,
            failUrl,
            customerEmail: customerEmail || 'customer@example.com',
            customerName: customerName || '고객',
            customerMobilePhone: '01012345678',
          });
        } catch (error) {
          console.error('❌ [TossWidget] 결제 요청 오류:', error);
          throw error;
        }
      },
      [widgets, ready, orderId, orderName, customerEmail, customerName]
    );

    // 추가 유틸리티 함수들 (메모이제이션)
    const isReady = useCallback(() => {
      return ready && !!widgets && mountedRef.current;
    }, [ready, widgets]);

    const getWidgetInstance = useCallback(() => {
      return widgets;
    }, [widgets]);

    // 위젯 새로고침
    const refreshWidget = useCallback(async () => {
      if (!widgets || !mountedRef.current) {
        throw new Error('위젯이 초기화되지 않았습니다');
      }

      try {
        setReady(false);
        setIsLoading(true);

        // 기존 위젯들을 다시 렌더링
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: `#${paymentMethodId}`,
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: `#${agreementId}`,
          }),
        ]);

        setReady(true);
        handleReady();
      } catch (error) {
        console.error('❌ [TossWidget] 위젯 새로고침 오류:', error);
        handleError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    }, [widgets, paymentMethodId, agreementId, handleReady, handleError]);

    // 결제 수단 목록 가져오기
    const getPaymentMethods = useCallback(() => {
      if (!widgets || !ready) {
        return [];
      }

      try {
        return widgets.getPaymentMethodsWidgets() || [];
      } catch (error) {
        console.error('❌ [TossWidget] 결제 수단 조회 오류:', error);
        return [];
      }
    }, [widgets, ready]);

    // 금액 업데이트 (외부 호출용)
    const updateAmount = useCallback(
      async (newAmount: number) => {
        if (!widgets || !ready || !mountedRef.current) {
          throw new Error('위젯이 준비되지 않았습니다');
        }

        try {
          await widgets.setAmount({
            currency: 'KRW',
            value: newAmount,
          });
        } catch (error) {
          console.error('❌ [TossWidget] 외부 금액 업데이트 오류:', error);
          throw error;
        }
      },
      [widgets, ready]
    );

    // 외부에서 사용할 수 있도록 함수를 노출
    useImperativeHandle(
      ref,
      () => ({
        requestPayment,
        isReady,
        getWidgetInstance,
        refreshWidget,
        getPaymentMethods,
        updateAmount,
      }),
      [
        requestPayment,
        isReady,
        getWidgetInstance,
        refreshWidget,
        getPaymentMethods,
        updateAmount,
      ]
    );

    // 로딩 컴포넌트 메모이제이션
    const LoadingComponent = useMemo(
      () => (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">결제 위젯 로딩 중...</p>
          {retryCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              재시도 중... ({retryCount}/3)
            </p>
          )}
        </div>
      ),
      [retryCount]
    );

    // 에러 컴포넌트 메모이제이션
    const ErrorComponent = useMemo(() => {
      if (!lastError) return null;

      return (
        <div className="text-center py-4 border border-red-200 rounded-lg bg-red-50">
          <div className="text-red-500 mb-2">
            <svg
              className="w-8 h-8 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-red-700 font-medium">결제 위젯 로드 실패</p>
          <p className="text-red-600 text-sm mt-1">{lastError.message}</p>
          <button
            onClick={() => {
              setLastError(null);
              setRetryCount(0);
              // 재초기화
              if (mountedRef.current) {
                initializationPromiseRef.current = null;
                // 다시 초기화 트리거
                setTimeout(() => {
                  if (mountedRef.current) {
                    const event = new CustomEvent('retryTossInitialization');
                    window.dispatchEvent(event);
                  }
                }, 100);
              }
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            type="button"
          >
            다시 시도
          </button>
        </div>
      );
    }, [lastError]);

    return (
      <div className="toss-payments-widget">
        {/* 결제 수단 위젯 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            결제 수단
          </h3>
          <div
            id={paymentMethodId}
            className="border border-gray-200 rounded-lg p-4 min-h-[200px]"
            style={{
              opacity: ready ? 1 : 0.5,
              transition: 'opacity 0.3s ease-in-out',
              position: 'relative',
            }}
          >
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">
                  결제 수단 로딩 중...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 약관 위젯 */}
        <div className="mb-6">
          <div
            id={agreementId}
            className="border border-gray-200 rounded-lg p-4 min-h-[100px]"
            style={{
              opacity: ready ? 1 : 0.5,
              transition: 'opacity 0.3s ease-in-out',
              position: 'relative',
            }}
          >
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">약관 로딩 중...</div>
              </div>
            )}
          </div>
        </div>

        {/* 상태에 따른 UI 표시 */}
        {lastError && !isLoading && ErrorComponent}
        {isLoading && !lastError && LoadingComponent}
      </div>
    );
  }
);

TossPaymentsWidget.displayName = 'TossPaymentsWidget';

export default TossPaymentsWidget;
export type { TossPaymentsWidgetProps, TossPaymentsWidgetRef };
