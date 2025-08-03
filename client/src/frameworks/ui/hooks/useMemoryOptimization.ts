// 메모리 최적화 훅
// 위치: client/src/frameworks/ui/hooks/useMemoryOptimization.ts

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { PerformanceMonitor } from '../components/utils/performance';

// 메모리 사용량 임계값 (바이트)
const MEMORY_WARNING_THRESHOLD = 50 * 1024 * 1024; // 50MB
const MEMORY_CRITICAL_THRESHOLD = 100 * 1024 * 1024; // 100MB

// 정리 대상 타입
type CleanupTarget = {
  id: string;
  cleanup: () => void;
  priority: 'low' | 'medium' | 'high';
  lastAccessed: number;
  memorySize?: number;
};

// 메모리 최적화 설정
interface MemoryOptimizationOptions {
  enableAutoCleanup?: boolean;
  cleanupInterval?: number;
  memoryCheckInterval?: number;
  maxInactiveTime?: number;
  onMemoryWarning?: (usage: number) => void;
  onMemoryCritical?: (usage: number) => void;
}

// 전역 메모리 관리자
class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTargets: Map<string, CleanupTarget> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private memoryCheckTimer: NodeJS.Timeout | null = null;
  private isCleanupRunning = false;

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // 정리 대상 등록
  registerCleanupTarget(target: CleanupTarget): void {
    this.cleanupTargets.set(target.id, target);
  }

  // 정리 대상 제거
  unregisterCleanupTarget(id: string): void {
    this.cleanupTargets.delete(id);
  }

  // 메모리 사용량 확인
  private getCurrentMemoryUsage(): number {
    const memory = PerformanceMonitor.measureMemory();
    return memory ? memory.usedJSHeapSize : 0;
  }

  // 메모리 모니터링 시작 - 적응형 모니터링으로 최적화
  private startMemoryMonitoring(): void {
    let checkInterval = 60000; // 기본 1분
    let consecutiveNormalChecks = 0;

    const adaptiveMemoryCheck = () => {
      this.checkMemoryUsage();

      const memoryUsage = this.getCurrentMemoryUsage();

      if (memoryUsage > MEMORY_CRITICAL_THRESHOLD) {
        checkInterval = 10000; // 임계치 초과시 10초
        consecutiveNormalChecks = 0;
      } else if (memoryUsage > MEMORY_WARNING_THRESHOLD) {
        checkInterval = 30000; // 경고시 30초
        consecutiveNormalChecks = 0;
      } else {
        consecutiveNormalChecks++;
        // 연속으로 정상이면 간격을 늘림 (최대 5분)
        if (consecutiveNormalChecks > 3) {
          checkInterval = Math.min(300000, checkInterval * 1.5);
        }
      }

      // 다음 체크 스케줄링
      if (this.memoryCheckTimer) {
        clearTimeout(this.memoryCheckTimer);
      }
      this.memoryCheckTimer = setTimeout(adaptiveMemoryCheck, checkInterval);
    };

    // 초기 체크 시작
    adaptiveMemoryCheck();
  }

  // 메모리 사용량 체크 및 경고
  private checkMemoryUsage(): void {
    const memoryUsage = this.getCurrentMemoryUsage();

    if (memoryUsage > MEMORY_CRITICAL_THRESHOLD) {
      this.forceCleanup('critical');
    } else if (memoryUsage > MEMORY_WARNING_THRESHOLD) {
      this.scheduleCleanup('medium');
    }
  }

  // 정리 작업 스케줄링
  private scheduleCleanup(
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    if (this.isCleanupRunning) return;

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    const delay =
      priority === 'critical' ? 0 : priority === 'high' ? 100 : 1000;

    this.cleanupTimer = setTimeout(() => {
      this.performCleanup(priority);
    }, delay);
  }

  // 강제 정리
  private forceCleanup(priority: 'low' | 'medium' | 'high' | 'critical'): void {
    this.performCleanup(priority);
  }

  // 실제 정리 작업 수행
  private performCleanup(
    minPriority: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    if (this.isCleanupRunning) return;

    this.isCleanupRunning = true;

    const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minPriorityLevel = priorityOrder[minPriority];

    try {
      // 정리 대상들을 우선순위와 마지막 접근 시간 기준으로 정렬
      const targetsToClean = Array.from(this.cleanupTargets.values())
        .filter(target => priorityOrder[target.priority] >= minPriorityLevel)
        .sort((a, b) => {
          // 우선순위가 높고 오래된 것부터 정리
          const priorityDiff =
            priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.lastAccessed - b.lastAccessed;
        });

      const maxCleanupCount = Math.min(
        targetsToClean.length,
        minPriority === 'critical' ? Infinity : 10
      );

      for (const target of targetsToClean.slice(0, maxCleanupCount)) {
        try {
          target.cleanup();
          this.cleanupTargets.delete(target.id);
        } catch (error) {
          console.error(`정리 작업 실패 (${target.id}):`, error);
        }
      }
    } finally {
      this.isCleanupRunning = false;
    }
  }

  // 메모리 관리자 종료
  destroy(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }
    this.cleanupTargets.clear();
  }
}

// 메모리 최적화 훅
export function useMemoryOptimization(
  componentName: string,
  options: MemoryOptimizationOptions = {}
) {
  const {
    enableAutoCleanup = true,
    cleanupInterval = 60000, // 1분
    memoryCheckInterval = 30000, // 30초
    maxInactiveTime = 300000, // 5분
    onMemoryWarning,
    onMemoryCritical,
  } = options;

  const memoryManager = useMemo(() => MemoryManager.getInstance(), []);
  const cleanupTargetsRef = useRef<Map<string, CleanupTarget>>(new Map());
  const lastActivityRef = useRef<number>(Date.now());
  const componentIdRef = useRef<string>(
    `${componentName}_${Date.now()}_${Math.random()}`
  );

  // 정리 대상 등록
  const registerForCleanup = useCallback(
    (
      id: string,
      cleanup: () => void,
      priority: 'low' | 'medium' | 'high' = 'medium',
      memorySize?: number
    ) => {
      const target: CleanupTarget = {
        id: `${componentIdRef.current}_${id}`,
        cleanup,
        priority,
        lastAccessed: Date.now(),
        memorySize,
      };

      cleanupTargetsRef.current.set(target.id, target);
      memoryManager.registerCleanupTarget(target);

      // 정리 함수 반환
      return () => {
        cleanupTargetsRef.current.delete(target.id);
        memoryManager.unregisterCleanupTarget(target.id);
      };
    },
    [memoryManager]
  );

  // 활동 기록
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // 등록된 정리 대상들의 lastAccessed 업데이트
    cleanupTargetsRef.current.forEach(target => {
      target.lastAccessed = Date.now();
    });
  }, []);

  // 메모리 사용량 측정
  const measureMemoryUsage = useCallback(() => {
    return PerformanceMonitor.measureMemory();
  }, []);

  // 강제 정리
  const forceCleanup = useCallback(() => {
    cleanupTargetsRef.current.forEach(target => {
      try {
        target.cleanup();
      } catch (error) {
        console.error(`강제 정리 실패 (${target.id}):`, error);
      }
    });
    cleanupTargetsRef.current.clear();
  }, []);

  // 자동 정리 설정
  useEffect(() => {
    if (!enableAutoCleanup) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;

      // 비활성 시간이 임계값을 초과하면 정리
      if (inactiveTime > maxInactiveTime) {
        const inactiveTargets = Array.from(
          cleanupTargetsRef.current.values()
        ).filter(target => now - target.lastAccessed > maxInactiveTime);

        inactiveTargets.forEach(target => {
          try {
            target.cleanup();
            cleanupTargetsRef.current.delete(target.id);
            memoryManager.unregisterCleanupTarget(target.id);
          } catch (error) {
            console.error(`자동 정리 실패 (${target.id}):`, error);
          }
        });
      }
    }, cleanupInterval);

    return () => clearInterval(interval);
  }, [enableAutoCleanup, cleanupInterval, maxInactiveTime, memoryManager]);

  // 메모리 모니터링 - 전역 관리자에 위임하여 중복 제거
  useEffect(() => {
    if (!onMemoryWarning && !onMemoryCritical) {
      return; // 콜백이 없으면 개별 모니터링 안함
    }

    const checkMemory = () => {
      const memory = measureMemoryUsage();
      if (!memory) return;

      const usage = memory.usedJSHeapSize;

      if (usage > MEMORY_CRITICAL_THRESHOLD) {
        onMemoryCritical?.(usage);
      } else if (usage > MEMORY_WARNING_THRESHOLD) {
        onMemoryWarning?.(usage);
      }
    };

    // 전역 관리자가 있으므로 개별 컴포넌트에서는 더 긴 간격으로 체크
    const interval = setInterval(
      checkMemory,
      Math.max(memoryCheckInterval * 2, 120000)
    ); // 최소 2분
    return () => clearInterval(interval);
  }, [
    memoryCheckInterval,
    onMemoryWarning,
    onMemoryCritical,
    measureMemoryUsage,
  ]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  return {
    registerForCleanup,
    recordActivity,
    measureMemoryUsage,
    forceCleanup,
    componentId: componentIdRef.current,

    // 메모리 상태 정보
    getMemoryInfo: useCallback(() => {
      const memory = measureMemoryUsage();
      const registeredTargets = cleanupTargetsRef.current.size;
      const lastActivity = lastActivityRef.current;

      return {
        memoryUsage: memory,
        registeredTargets,
        lastActivity,
        inactiveTime: Date.now() - lastActivity,
        isMemoryWarning: memory
          ? memory.usedJSHeapSize > MEMORY_WARNING_THRESHOLD
          : false,
        isMemoryCritical: memory
          ? memory.usedJSHeapSize > MEMORY_CRITICAL_THRESHOLD
          : false,
      };
    }, [measureMemoryUsage]),
  };
}

// 대용량 데이터 처리를 위한 청크 처리 훅
export function useChunkedProcessing<T>(
  data: T[],
  chunkSize: number = 100,
  processingDelay: number = 10
) {
  const [processedChunks, setProcessedChunks] = useState<T[][]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef<boolean>(false);

  // 데이터를 청크로 분할
  const chunks = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      result.push(data.slice(i, i + chunkSize));
    }
    return result;
  }, [data, chunkSize]);

  // 청크 단위 처리
  useEffect(() => {
    if (processingRef.current || currentChunkIndex >= chunks.length) return;

    processingRef.current = true;
    setIsProcessing(true);

    const timer = setTimeout(() => {
      if (currentChunkIndex < chunks.length) {
        setProcessedChunks(prev => [...prev, chunks[currentChunkIndex]]);
        setCurrentChunkIndex(prev => prev + 1);
      }

      processingRef.current = false;

      if (currentChunkIndex + 1 >= chunks.length) {
        setIsProcessing(false);
      }
    }, processingDelay);

    return () => {
      clearTimeout(timer);
      processingRef.current = false;
    };
  }, [chunks, currentChunkIndex, processingDelay]);

  // 리셋
  const reset = useCallback(() => {
    setProcessedChunks([]);
    setCurrentChunkIndex(0);
    setIsProcessing(false);
    processingRef.current = false;
  }, []);

  return {
    processedChunks,
    flattenedData: processedChunks.flat(),
    progress: chunks.length > 0 ? (currentChunkIndex / chunks.length) * 100 : 0,
    isProcessing,
    totalChunks: chunks.length,
    currentChunk: currentChunkIndex,
    reset,
  };
}

// 타입 정의
export interface MemoryInfo {
  memoryUsage: ReturnType<typeof PerformanceMonitor.measureMemory>;
  registeredTargets: number;
  lastActivity: number;
  inactiveTime: number;
  isMemoryWarning: boolean;
  isMemoryCritical: boolean;
}

export type CleanupFunction = () => void;
export type MemoryOptimizationReturn = ReturnType<typeof useMemoryOptimization>;
export type ChunkedProcessingReturn<T> = ReturnType<
  typeof useChunkedProcessing<T>
>;
