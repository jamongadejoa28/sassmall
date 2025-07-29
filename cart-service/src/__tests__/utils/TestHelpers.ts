// ========================================
// 테스트 헬퍼 유틸리티 (수정됨)
// cart-service/src/__tests__/utils/TestHelpers.ts
// ========================================

/**
 * 비동기 함수 실행 시간 측정
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;

  return { result, executionTime };
}

/**
 * 지정된 시간만큼 대기
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 조건이 만족될 때까지 대기 (폴링)
 */
export async function waitUntil(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await delay(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * 랜덤 정수 생성
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 배열에서 랜덤 요소 선택
 */
export function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * 에러가 특정 타입인지 확인
 */
export function isErrorOfType(
  error: any,
  expectedType: new (...args: any[]) => Error
): boolean {
  return error instanceof expectedType;
}

/**
 * 🔧 추가: 메모리 사용량 측정
 */
export function measureMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * 🔧 추가: 메모리 사용량을 읽기 쉬운 형태로 포맷
 */
export function formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
} {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    rss: formatBytes(memoryUsage.rss),
    heapTotal: formatBytes(memoryUsage.heapTotal),
    heapUsed: formatBytes(memoryUsage.heapUsed),
    external: formatBytes(memoryUsage.external),
  };
}

/**
 * 🔧 추가: 성능 벤치마크 헬퍼
 */
export interface BenchmarkResult {
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

export async function benchmark<T>(
  fn: () => Promise<T>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { executionTime } = await measureExecutionTime(fn);
    times.push(executionTime);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = (iterations / totalTime) * 1000;

  return {
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    opsPerSecond,
  };
}

/**
 * 🔧 추가: UUID 유효성 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 🔧 추가: 테스트용 ID 생성기
 */
export function generateTestId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 🔧 추가: 대용량 테스트 데이터 생성
 */
export function generateLargeTestData(sizeInKB: number): any {
  const targetSize = sizeInKB * 1024;
  const baseData = {
    id: generateTestId(),
    timestamp: new Date().toISOString(),
    data: "",
  };

  // 목표 크기까지 데이터 채우기
  const currentSize = JSON.stringify(baseData).length;
  const remainingSize = Math.max(0, targetSize - currentSize);
  baseData.data = "x".repeat(remainingSize);

  return baseData;
}

/**
 * 🔧 추가: 테스트용 ProductInfo 생성 헬퍼
 */
export interface CreateTestProductOptions {
  id?: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  availableQuantity?: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
  inventoryStatus?: "in_stock" | "low_stock" | "out_of_stock";
}

export function createTestProduct(options: CreateTestProductOptions = {}): any {
  const {
    id = generateTestId("product"),
    name = "Test Product",
    description = "Test product description",
    price = 10000,
    currency = "KRW",
    availableQuantity = 100,
    category = "test",
    imageUrl = "https://example.com/test-product.jpg",
    isActive = true,
    inventoryStatus = "in_stock",
  } = options;

  return {
    id,
    name,
    description,
    price,
    currency,
    availableQuantity,
    category,
    imageUrl,
    inventory: {
      quantity: availableQuantity,
      status: inventoryStatus,
    },
    isActive,
  };
}

/**
 * 🔧 추가: 대량 테스트 상품 생성
 */
export function createTestProducts(
  count: number,
  baseOptions: CreateTestProductOptions = {}
): any[] {
  return Array.from({ length: count }, (_, i) =>
    createTestProduct({
      ...baseOptions,
      id: baseOptions.id
        ? `${baseOptions.id}-${i}`
        : generateTestId(`product-${i}`),
      name: baseOptions.name ? `${baseOptions.name} ${i}` : `Test Product ${i}`,
      price: (baseOptions.price || 10000) + i * 1000,
      availableQuantity: (baseOptions.availableQuantity || 100) + i * 10,
    })
  );
}

/**
 * 🔧 추가: 배치 작업 헬퍼
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  delayBetweenBatches: number = 0
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);

    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await delay(delayBetweenBatches);
    }
  }

  return results;
}
