// 지연 로딩 및 코드 스플리팅 유틸리티
// 위치: client/src/frameworks/ui/components/utils/lazyLoading.tsx

import React, {
  Suspense,
  lazy,
  ComponentType,
  ReactElement,
  useEffect,
  useState,
} from 'react';
import { PerformanceMonitor } from './performance';

// 로딩 컴포넌트 인터페이스
interface LoadingComponentProps {
  error?: Error;
  retry?: () => void;
  isLoading?: boolean;
}

// 지연 로딩 옵션
interface LazyLoadOptions {
  fallback?: ReactElement;
  retryCount?: number;
  timeout?: number;
  preload?: boolean;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

// 기본 로딩 컴포넌트
const DefaultLoadingComponent: React.FC<LoadingComponentProps> = ({
  error,
  retry,
  isLoading = true,
}) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
        <div className="text-red-500 mb-4">
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
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          컴포넌트 로드 실패
        </h3>
        <p className="text-red-600 text-sm mb-4 text-center">
          {error.message || '컴포넌트를 불러오는 중 오류가 발생했습니다.'}
        </p>
        {retry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">컴포넌트 로딩 중...</p>
      </div>
    );
  }

  return null;
};

// 향상된 지연 로딩 HOC
export function createLazyComponent<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  const {
    fallback = <DefaultLoadingComponent />,
    retryCount = 3,
    timeout = 10000,
    preload = false,
    onError,
    onLoad,
  } = options;

  // 재시도 로직이 포함된 import 함수
  const importWithRetry = async (
    attempt = 1
  ): Promise<{ default: ComponentType<T> }> => {
    const measureName = `LazyLoad_${importFn.name}_attempt_${attempt}`;

    try {
      return await PerformanceMonitor.measureAsync(measureName, async () => {
        // 타임아웃 설정
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('컴포넌트 로딩 타임아웃')),
            timeout
          );
        });

        const result = await Promise.race([importFn(), timeoutPromise]);
        onLoad?.();
        return result;
      });
    } catch (error) {
      console.error(
        `컴포넌트 로딩 실패 (시도 ${attempt}/${retryCount}):`,
        error
      );

      if (attempt < retryCount) {
        // 지수 백오프 적용
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return importWithRetry(attempt + 1);
      }

      onError?.(error as Error);
      throw error;
    }
  };

  const LazyComponent = lazy(importWithRetry);

  // preload 옵션이 true인 경우 즉시 로딩 시작
  if (preload) {
    importWithRetry().catch(() => {
      // preload 실패는 무시 (실제 렌더링 시 다시 시도됨)
    });
  }

  // 에러 바운더리가 포함된 래퍼 컴포넌트
  return React.forwardRef<any, T>((props, ref) => {
    const [error, setError] = useState<Error | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    const handleRetry = () => {
      setError(null);
      setRetryKey(prev => prev + 1);
    };

    if (error) {
      return <DefaultLoadingComponent error={error} retry={handleRetry} />;
    }

    return (
      <Suspense fallback={fallback}>
        <LazyComponent
          key={retryKey}
          ref={ref}
          {...props}
          onError={(err: Error) => {
            setError(err);
            onError?.(err);
          }}
        />
      </Suspense>
    );
  });
}

// 이미지 지연 로딩 컴포넌트
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  onLoad,
  onError,
  threshold = 0.1,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Intersection Observer를 사용한 뷰포트 감지
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, [threshold]);

  // 이미지 로딩
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();

    img.onload = () => {
      PerformanceMonitor.endMeasure(`LazyImage_${src}`);
      setIsLoaded(true);
      onLoad?.();
    };

    img.onerror = () => {
      PerformanceMonitor.endMeasure(`LazyImage_${src}`);
      setHasError(true);
      onError?.();
    };

    PerformanceMonitor.startMeasure(`LazyImage_${src}`);
    img.src = src;
  }, [isInView, src, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : placeholder}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'} ${className}`}
      style={{
        filter: isLoaded ? 'none' : 'blur(2px)',
      }}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          onError?.();
        }
      }}
    />
  );
};

// 컴포넌트 그룹 지연 로딩
interface LazyComponentGroupProps {
  components: (() => Promise<{ default: ComponentType<any> }>)[];
  batchSize?: number;
  delay?: number;
  onBatchLoad?: (batchIndex: number) => void;
}

export const LazyComponentGroup: React.FC<LazyComponentGroupProps> = ({
  components,
  batchSize = 3,
  delay = 100,
  onBatchLoad,
}) => {
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [currentBatch, setCurrentBatch] = useState(0);

  useEffect(() => {
    const loadBatch = async (batchIndex: number) => {
      if (loadedBatches.has(batchIndex)) return;

      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, components.length);
      const batchComponents = components.slice(startIndex, endIndex);

      try {
        await Promise.all(batchComponents.map(comp => comp()));
        setLoadedBatches(prev => new Set(prev).add(batchIndex));
        onBatchLoad?.(batchIndex);
      } catch (error) {
        console.error(`배치 ${batchIndex} 로딩 실패:`, error);
      }
    };

    const timer = setTimeout(() => {
      loadBatch(currentBatch);
      if ((currentBatch + 1) * batchSize < components.length) {
        setCurrentBatch(prev => prev + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentBatch, batchSize, delay, components, loadedBatches, onBatchLoad]);

  const totalBatches = Math.ceil(components.length / batchSize);
  const progress = (loadedBatches.size / totalBatches) * 100;

  return (
    <div className="lazy-group-loader">
      <div className="progress-bar bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-600">
        컴포넌트 로딩 중... ({loadedBatches.size}/{totalBatches})
      </p>
    </div>
  );
};

// 코드 스플리팅 유틸리티
export const createRouteComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  return createLazyComponent(importFn, {
    fallback: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">페이지 로딩 중...</p>
        </div>
      </div>
    ),
    timeout: 15000,
    retryCount: 2,
  });
};

// 성능 최적화된 모달 컴포넌트
export const createLazyModal = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  return createLazyComponent(importFn, {
    fallback: (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">모달 로딩 중...</p>
          </div>
        </div>
      </div>
    ),
    timeout: 5000,
    retryCount: 2,
    preload: false, // 모달은 필요할 때만 로딩
  });
};

// 타입 정의
export type LazyComponentType<T = {}> = ComponentType<
  T & { onError?: (error: Error) => void }
>;
export type LazyLoadOptionsType = LazyLoadOptions;
