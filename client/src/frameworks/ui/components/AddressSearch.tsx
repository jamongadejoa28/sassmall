// AddressSearch Component - 다음 우편번호 서비스 연동 (최적화 버전)
// 위치: client/src/frameworks/ui/components/AddressSearch.tsx

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { PerformanceMonitor, usePerformanceMonitor } from './utils/performance';

// ========================================
// Types & Interfaces
// ========================================

interface AddressData {
  zonecode: string; // 우편번호
  address: string; // 기본주소 (도로명주소 우선)
  addressEnglish?: string; // 영문주소
  addressType: 'R' | 'J'; // R: 도로명, J: 지번
  bname?: string; // 법정동명
  buildingName?: string; // 건물명
  userSelectedType?: 'R' | 'J'; // 사용자가 선택한 주소 타입
}

interface AddressSearchProps {
  onAddressSelect: (address: AddressData) => void;
  onClose?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

// ========================================
// Daum Postcode API 타입 정의
// ========================================

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: any) => void;
        onclose?: () => void;
        width?: number;
        height?: number;
        theme?: {
          bgColor?: string;
          searchBgColor?: string;
          contentBgColor?: string;
          pageBgColor?: string;
          textColor?: string;
          queryTextColor?: string;
          postcodeTextColor?: string;
          emphTextColor?: string;
          outlineColor?: string;
        };
      }) => {
        embed: (element: HTMLElement | null) => void;
        open: () => void;
      };
    };
  }
}

// ========================================
// 전역 스크립트 로더 (싱글톤 패턴)
// ========================================

class DaumPostcodeLoader {
  private static instance: DaumPostcodeLoader;
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;
  private isLoading = false;
  private scriptElement: HTMLScriptElement | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): DaumPostcodeLoader {
    if (!DaumPostcodeLoader.instance) {
      DaumPostcodeLoader.instance = new DaumPostcodeLoader();
    }
    return DaumPostcodeLoader.instance;
  }

  async loadScript(): Promise<void> {
    // 이미 로드된 경우
    if (this.isLoaded && window.daum?.Postcode) {
      return Promise.resolve();
    }

    // 로딩 중인 경우 기존 Promise 반환 (최대 10초 대기)
    if (this.loadPromise) {
      return Promise.race([
        this.loadPromise,
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('스크립트 로딩 타임아웃')), 10000);
        }),
      ]);
    }

    // 새로운 로딩 시작
    this.loadPromise = PerformanceMonitor.measureAsync(
      'DaumPostcodeLoader_loadScript',
      () => this.createLoadPromise()
    );
    return this.loadPromise;
  }

  private createLoadPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 이미 로드된 스크립트가 있는지 확인
      const existingScript = document.querySelector(
        'script[src*="postcode.v2.js"]'
      ) as HTMLScriptElement;

      if (existingScript) {
        if (window.daum?.Postcode) {
          this.isLoaded = true;
          resolve();
          return;
        }

        // 스크립트는 있지만 API가 아직 로드되지 않은 경우 - 타임아웃 추가
        // eslint-disable-next-line prefer-const
        let timeoutId: NodeJS.Timeout;
        let isResolved = false;

        const onLoad = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            this.isLoaded = true;
            resolve();
          }
        };

        const onError = (error: Event) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            this.loadPromise = null;
            reject(error);
          }
        };

        existingScript.addEventListener('load', onLoad);
        existingScript.addEventListener('error', onError);

        // 5초 타임아웃
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            existingScript.removeEventListener('load', onLoad);
            existingScript.removeEventListener('error', onError);
            this.loadPromise = null;
            reject(new Error('기존 스크립트 로딩 타임아웃'));
          }
        }, 5000);

        return;
      }

      // 새 스크립트 생성
      const script = document.createElement('script');
      script.src =
        'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      script.defer = true;

      let isScriptResolved = false;
      // eslint-disable-next-line prefer-const
      let scriptTimeoutId: NodeJS.Timeout;

      const onScriptLoad = () => {
        if (!isScriptResolved) {
          isScriptResolved = true;
          clearTimeout(scriptTimeoutId);
          this.isLoaded = true;
          this.isLoading = false;
          resolve();
        }
      };

      const onScriptError = (event: Event) => {
        if (!isScriptResolved) {
          isScriptResolved = true;
          clearTimeout(scriptTimeoutId);
          this.isLoading = false;
          this.loadPromise = null;
          this.scriptElement = null;
          reject(
            new Error(
              `Daum Postcode API 로드 실패: ${event.type || 'Script load error'}`
            )
          );
        }
      };

      script.onload = onScriptLoad;
      script.addEventListener('error', onScriptError);

      // 8초 타임아웃
      scriptTimeoutId = setTimeout(() => {
        if (!isScriptResolved) {
          isScriptResolved = true;
          this.isLoading = false;
          this.loadPromise = null;
          this.scriptElement = null;
          script.remove();
          reject(new Error('새 스크립트 로딩 타임아웃 (8초)'));
        }
      }, 8000);

      this.isLoading = true;
      this.scriptElement = script;
      document.head.appendChild(script);
    });
  }

  isApiLoaded(): boolean {
    return this.isLoaded && Boolean(window.daum?.Postcode);
  }

  // 안전한 정리 메서드
  cleanup(): void {
    if (this.scriptElement && this.scriptElement.parentNode) {
      try {
        this.scriptElement.parentNode.removeChild(this.scriptElement);
      } catch (error) {
        console.warn('스크립트 제거 중 오류 (무시 가능):', error);
      }
      this.scriptElement = null;
    }
    this.loadPromise = null;
  }
}

// ========================================
// AddressSearch Component
// ========================================

const AddressSearch: React.FC<AddressSearchProps> = ({
  onAddressSelect,
  onClose,
  width = 500,
  height = 600,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const postcodeInstanceRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 성능 모니터링 훅
  const { startMeasure, endMeasure } = usePerformanceMonitor('AddressSearch');

  // 고정된 컨테이너 ID 생성 (리렌더링 방지)
  const elementId = useMemo(() => `daum-postcode-${Date.now()}`, []);

  // 주소 선택 핸들러 최적화
  const handleAddressComplete = useCallback(
    (data: any) => {
      try {
        const addressData: AddressData = {
          zonecode: data.zonecode,
          address:
            data.userSelectedType === 'R'
              ? data.roadAddress
              : data.jibunAddress,
          addressEnglish: data.addressEnglish,
          addressType: data.userSelectedType || 'R',
          bname: data.bname,
          buildingName: data.buildingName,
          userSelectedType: data.userSelectedType,
        };

        onAddressSelect(addressData);
        onClose?.();
      } catch (error) {
        console.error('주소 처리 중 오류:', error);
        onClose?.();
      }
    },
    [onAddressSelect, onClose]
  );

  // 닫기 핸들러 최적화
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // 테마 설정 메모이제이션
  const theme = useMemo(
    () => ({
      bgColor: '#FFFFFF',
      searchBgColor: '#F8F9FA',
      contentBgColor: '#FFFFFF',
      pageBgColor: '#FAFAFA',
      textColor: '#333333',
      queryTextColor: '#222222',
      postcodeTextColor: '#FA4256',
      emphTextColor: '#008BD3',
      outlineColor: '#E0E0E0',
    }),
    []
  );

  // Postcode 인스턴스 생성 및 임베드
  const initializePostcode = useCallback(async () => {
    if (!containerRef.current || !window.daum?.Postcode) {
      return;
    }

    startMeasure('initializePostcode');

    try {
      // 기존 인스턴스 정리
      if (postcodeInstanceRef.current) {
        postcodeInstanceRef.current = null;
      }

      // 새 인스턴스 생성
      const postcode = new window.daum.Postcode({
        oncomplete: handleAddressComplete,
        onclose: handleClose,
        width,
        height,
        theme,
      });

      postcodeInstanceRef.current = postcode;

      // DOM에 임베드 (requestAnimationFrame 사용으로 렌더링 최적화)
      requestAnimationFrame(() => {
        if (containerRef.current && postcodeInstanceRef.current) {
          startMeasure('embedPostcode');
          postcodeInstanceRef.current.embed(containerRef.current);
          endMeasure('embedPostcode');
          setIsLoading(false);
          setLoadError(null);
        }
      });

      endMeasure('initializePostcode');
    } catch (error) {
      endMeasure('initializePostcode');
      console.error('Daum Postcode 초기화 오류:', error);
      setIsLoading(false);
      setLoadError('주소 검색 서비스 초기화에 실패했습니다.');
    }
  }, [
    handleAddressComplete,
    handleClose,
    width,
    height,
    theme,
    startMeasure,
    endMeasure,
  ]);

  // 재시도 핸들러
  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      setLoadError('최대 재시도 횟수를 초과했습니다.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setRetryCount(prev => prev + 1);

    try {
      const loader = DaumPostcodeLoader.getInstance();

      // 이전 로딩 상태 초기화
      loader.cleanup();

      // 스크립트 재로드
      await loader.loadScript();
      await initializePostcode();
    } catch (error) {
      console.error('재시도 실패:', error);
      setIsLoading(false);
      setLoadError('주소 검색 서비스 로딩에 실패했습니다.');
    }
  }, [retryCount, initializePostcode]);

  // 스크립트 로드 및 초기화
  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const loadAndInitialize = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const loader = DaumPostcodeLoader.getInstance();

        // 이미 로드되어 있으면 바로 초기화
        if (loader.isApiLoaded()) {
          await initializePostcode();
          return;
        }

        // 스크립트 로드 (타임아웃 포함)
        await loader.loadScript();

        // 컴포넌트가 언마운트되지 않았으면 초기화
        if (!abortController.signal.aborted) {
          await initializePostcode();
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Daum Postcode API 로드 실패:', error);
          setIsLoading(false);
          setLoadError('주소 검색 서비스 로딩에 실패했습니다.');
        }
      }
    };

    loadAndInitialize();

    // 정리 함수
    return () => {
      abortController.abort();

      // Postcode 인스턴스 정리
      if (postcodeInstanceRef.current) {
        postcodeInstanceRef.current = null;
      }

      // DOM 정리는 하지 않음 - React가 자동으로 처리
      // 외부 스크립트가 생성한 DOM 요소는 React가 관리하지 않으므로
      // 직접 정리하지 않고 컴포넌트 언마운트 시 React가 처리하도록 함
    };
  }, [initializePostcode]);

  // 에러 바운더리 역할을 하는 에러 핸들러 (향후 사용 예정)
  // const _handleError = useCallback(
  //   (error: Error) => {
  //     console.error('AddressSearch 컴포넌트 에러:', error);
  //     onClose?.();
  //   },
  //   [onClose]
  // );

  // 로딩 상태 표시
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">주소 검색 서비스를 로딩 중...</p>
        {retryCount > 0 && (
          <p className="text-xs text-gray-500">재시도 중... ({retryCount}/3)</p>
        )}
      </div>
    </div>
  );

  // 에러 상태 표시
  const renderErrorState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="text-red-500">
          <svg
            className="w-12 h-12"
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
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          type="button"
        >
          다시 시도
        </button>
      </div>
    </div>
  );

  return (
    <div className={`address-search-container ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">우편번호 찾기</h3>
        {onClose && (
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
            aria-label="닫기"
            type="button"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 다음 우편번호 서비스 컨테이너 */}
      <div
        ref={containerRef}
        id={elementId}
        style={{
          width: '100%',
          height: `${height}px`,
          minHeight: '400px',
        }}
        className="bg-white relative"
      >
        {/* 상태에 따른 UI 표시 */}
        {loadError
          ? renderErrorState()
          : isLoading
            ? renderLoadingState()
            : null}
      </div>

      {/* 안내 텍스트 */}
      <div className="p-4 bg-blue-50 text-sm text-blue-700">
        <p>• 도로명주소를 우선으로 표시됩니다.</p>
        <p>• 지번주소도 선택 가능합니다.</p>
        <p>• 주소를 선택하면 자동으로 입력됩니다.</p>
      </div>
    </div>
  );
};

export default React.memo(AddressSearch);
export type { AddressData, AddressSearchProps };
