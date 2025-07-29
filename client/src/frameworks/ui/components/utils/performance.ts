// 성능 모니터링 유틸리티
// 위치: client/src/frameworks/ui/components/utils/performance.ts

/**
 * 성능 메트릭을 측정하는 유틸리티 클래스
 */
// React import 추가
import React from 'react';

export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();
  private static isEnabled = process.env.NODE_ENV === 'development';

  /**
   * 측정 시작
   */
  static startMeasure(name: string): void {
    if (!this.isEnabled) return;

    this.measurements.set(name, performance.now());
  }

  /**
   * 측정 종료 및 결과 반환
   */
  static endMeasure(name: string): number {
    if (!this.isEnabled) return 0;

    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`Performance measurement '${name}' was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.measurements.delete(name);

    return duration;
  }

  /**
   * 메모리 사용량 측정
   */
  static measureMemory(): MemoryInfo | null {
    if (!this.isEnabled || !window.performance.memory) return null;

    return {
      usedJSHeapSize: window.performance.memory.usedJSHeapSize,
      totalJSHeapSize: window.performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
    };
  }

  /**
   * 네트워크 요청 성능 측정
   */
  static measureNetworkRequest(url: string): Promise<PerformanceEntry | null> {
    if (!this.isEnabled) return Promise.resolve(null);

    return new Promise(resolve => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const entry = entries.find(e => e.name.includes(url));

        if (entry) {
          observer.disconnect();
          resolve(entry);
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      // 5초 후 타임아웃
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 5000);
    });
  }

  /**
   * 컴포넌트 렌더링 성능 측정
   */
  static measureComponentRender<T>(
    componentName: string,
    renderFunction: () => T
  ): T {
    if (!this.isEnabled) return renderFunction();

    this.startMeasure(`${componentName}_render`);
    const result = renderFunction();
    this.endMeasure(`${componentName}_render`);

    return result;
  }

  /**
   * 비동기 작업 성능 측정
   */
  static async measureAsync<T>(
    name: string,
    asyncFunction: () => Promise<T>
  ): Promise<T> {
    if (!this.isEnabled) return asyncFunction();

    this.startMeasure(name);
    try {
      const result = await asyncFunction();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * 성능 보고서 생성
   */
  static generateReport(): PerformanceReport {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    const memory = this.measureMemory();

    return {
      timestamp: Date.now(),
      navigation: navigation
        ? {
            domContentLoaded:
              navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart,
            load: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint(),
          }
        : null,
      memory,
      resources: this.getResourceTimings(),
    };
  }

  private static getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private static getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(
      entry => entry.name === 'first-contentful-paint'
    );
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  private static getResourceTimings(): ResourceTiming[] {
    const resourceEntries = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];

    return resourceEntries.map(entry => ({
      name: entry.name,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
    }));
  }
}

/**
 * 성능 데코레이터
 */
export function measurePerformance(_name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const measureName = `${target.constructor.name}.${propertyKey}`;
      PerformanceMonitor.startMeasure(measureName);

      try {
        const result = originalMethod.apply(this, args);

        // Promise인 경우 처리
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            PerformanceMonitor.endMeasure(measureName);
          });
        }

        PerformanceMonitor.endMeasure(measureName);
        return result;
      } catch (error) {
        PerformanceMonitor.endMeasure(measureName);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * React Hook을 위한 성능 측정
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = React.useRef<number>(0);

  React.useEffect(() => {
    startTime.current = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      // 성능 측정 결과 로깅 (개발환경에서만)
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} 렌더링 시간: ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  const startMeasure = React.useCallback(
    (name: string) =>
      PerformanceMonitor.startMeasure(`${componentName}_${name}`),
    [componentName]
  );

  const endMeasure = React.useCallback(
    (name: string) => PerformanceMonitor.endMeasure(`${componentName}_${name}`),
    [componentName]
  );

  return {
    startMeasure,
    endMeasure,
  };
}

// 타입 정의
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface NavigationTiming {
  domContentLoaded: number;
  load: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

export interface ResourceTiming {
  name: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
}

export interface PerformanceReport {
  timestamp: number;
  navigation: NavigationTiming | null;
  memory: MemoryInfo | null;
  resources: ResourceTiming[];
}
