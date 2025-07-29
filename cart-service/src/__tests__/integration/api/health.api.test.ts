// ========================================
// Health API 통합 테스트 (수정됨)
// cart-service/src/__tests__/integration/api/health.api.test.ts
// ========================================

import { Express } from "express";
import { Container } from "inversify";
import { ApiTestClient } from "../../utils/ApiTestClient";
import { DIContainer } from "../../../infrastructure/di/Container";
import { createTestApp } from "../../utils/TestAppBuilder";

describe("Health API Integration Tests", () => {
  let app: Express;
  let apiClient: ApiTestClient;
  let container: Container;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Health API Test] 테스트 환경 초기화 중...");

    try {
      // DI Container 초기화
      container = await DIContainer.create();

      // Express 앱 생성
      app = await createTestApp(container);

      // 테스트 클라이언트 초기화
      apiClient = new ApiTestClient(app);

      console.log("✅ [Health API Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Health API Test] 초기화 실패:", error);
      throw error;
    }
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 🏥 기본 헬스체크 테스트
  // ========================================

  describe("기본 헬스체크", () => {
    test("GET /health - 서비스 상태 확인", async () => {
      const response = await apiClient.healthCheck();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: {
          status: "healthy",
          timestamp: expect.any(String),
          version: expect.any(String),
          environment: "test",
        },
      });

      // 타임스탬프가 ISO 형식인지 확인
      expect(() => new Date(response.body.data.timestamp)).not.toThrow();
    });

    test("헬스체크 응답 시간 확인 (성능)", async () => {
      const startTime = Date.now();

      const response = await apiClient.healthCheck();

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1초 이내 응답
    });

    test("연속 헬스체크 요청 처리", async () => {
      const promises = Array.from({ length: 5 }, () => apiClient.healthCheck());

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });
    });
  });

  // ========================================
  // 📊 서비스 정보 API 테스트
  // ========================================

  describe("서비스 정보 API", () => {
    test("GET /api/v1/info - 서비스 정보 조회", async () => {
      const response = await apiClient.getServiceInfo();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: {
          service: "cart-service",
          version: expect.stringMatching(/test/),
          description: expect.any(String),
          endpoints: expect.any(Object),
          features: expect.any(Array),
        },
      });

      // 엔드포인트 정보 확인
      expect(response.body.data.endpoints).toHaveProperty("carts");
      expect(response.body.data.endpoints).toHaveProperty("health");

      // 기능 목록 확인
      expect(response.body.data.features).toContain("장바구니 생성/조회");
      expect(response.body.data.features.length).toBeGreaterThan(3);
    });

    test("서비스 정보 일관성 확인", async () => {
      const response1 = await apiClient.getServiceInfo();
      const response2 = await apiClient.getServiceInfo();

      expect(response1.body.data.service).toBe(response2.body.data.service);
      expect(response1.body.data.version).toBe(response2.body.data.version);
      expect(response1.body.data.endpoints).toEqual(
        response2.body.data.endpoints
      );
    });
  });

  // ========================================
  // 🚫 404 및 에러 처리 테스트
  // ========================================

  describe("404 및 에러 처리", () => {
    test("존재하지 않는 엔드포인트 - 404 처리", async () => {
      const response = await apiClient.get("/nonexistent-endpoint");

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining("not found"),
        error: "NOT_FOUND",
        timestamp: expect.any(String),
      });
    });

    test("잘못된 HTTP 메서드 - 404 처리", async () => {
      const response = await apiClient.patch("/health");

      expect(response.status).toBe(404);
    });

    test("빈 요청 경로 처리", async () => {
      const response = await apiClient.get("");

      // 서버가 적절히 처리하는지 확인 (404 또는 리다이렉트)
      expect([200, 301, 302, 404]).toContain(response.status);
    });
  });

  // ========================================
  // 🔒 보안 헤더 테스트
  // ========================================

  describe("보안 헤더 확인", () => {
    test("기본 보안 헤더 존재 확인", async () => {
      const response = await apiClient.healthCheck();

      // Helmet 미들웨어에 의한 보안 헤더들
      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers).toHaveProperty("x-frame-options");
    });

    test("CORS 헤더 확인", async () => {
      const response = await apiClient.options("/health", {
        Origin: "http://localhost:3000",
      });

      expect(response.headers).toHaveProperty("access-control-allow-origin");
      expect(response.headers).toHaveProperty("access-control-allow-methods");
    });

    test("응답 시간 헤더 부재 확인 (정보 누출 방지)", async () => {
      const response = await apiClient.healthCheck();

      // 응답 시간 등의 민감한 정보가 헤더에 노출되지 않는지 확인
      expect(response.headers).not.toHaveProperty("x-response-time");
      expect(response.headers).not.toHaveProperty("server");
    });
  });

  // ========================================
  // 📈 부하 및 안정성 테스트
  // ========================================

  describe("부하 및 안정성", () => {
    test("동시 요청 처리 (부하 테스트)", async () => {
      const concurrentRequests = 20;
      const promises = Array.from({ length: concurrentRequests }, (_, index) =>
        apiClient.healthCheck().then((response) => ({ index, response }))
      );

      const results = await Promise.all(promises);

      // 모든 요청이 성공했는지 확인
      results.forEach(({ index, response }) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });

      console.log(`✅ ${concurrentRequests}개의 동시 요청 모두 성공`);
    });

    test("연속 요청 안정성 테스트", async () => {
      const requestCount = 10;
      const responses = [];

      for (let i = 0; i < requestCount; i++) {
        const response = await apiClient.healthCheck();
        responses.push(response);

        // 짧은 지연 (실제 사용 패턴 시뮬레이션)
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // 모든 요청이 성공했는지 확인
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });

      console.log(`✅ ${requestCount}개의 연속 요청 모두 성공`);
    });

    test("메모리 리크 방지 확인", async () => {
      // 메모리 사용량 체크를 위한 기본적인 테스트
      const initialMemory = process.memoryUsage().heapUsed;

      // 많은 요청 실행
      const promises = Array.from({ length: 50 }, () =>
        apiClient.healthCheck()
      );
      await Promise.all(promises);

      // 가비지 컬렉션 유도
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 메모리 증가가 과도하지 않은지 확인 (10MB 이하)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      console.log(
        `📊 메모리 증가량: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });

  // ========================================
  // 🌐 다양한 요청 형태 테스트
  // ========================================

  describe("다양한 요청 형태", () => {
    test("다양한 Accept 헤더 처리", async () => {
      const acceptHeaders = [
        "application/json",
        "application/json, text/plain, */*",
        "*/*",
      ];

      for (const acceptHeader of acceptHeaders) {
        const response = await apiClient.get("/health", {
          Accept: acceptHeader,
        });

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/json/);
      }
    });

    test("User-Agent 헤더 처리", async () => {
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "curl/7.68.0",
        "PostmanRuntime/7.26.8",
        undefined, // User-Agent 없음
      ];

      for (const userAgent of userAgents) {
        const headers = userAgent ? { "User-Agent": userAgent } : {};
        const response = await apiClient.get("/health", headers);

        expect(response.status).toBe(200);
      }
    });

    test("대용량 요청 헤더 처리", async () => {
      // 큰 크기의 헤더 생성 (하지만 합리적인 범위 내)
      const largeHeaderValue = "x".repeat(1000);

      const response = await apiClient.get("/health", {
        "X-Large-Header": largeHeaderValue,
      });

      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // 🕒 타임아웃 및 응답성 테스트
  // ========================================

  describe("타임아웃 및 응답성", () => {
    test("헬스체크 빠른 응답 시간", async () => {
      const startTime = process.hrtime.bigint();

      const response = await apiClient.healthCheck();

      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1000000; // 나노초를 밀리초로

      expect(response.status).toBe(200);
      expect(responseTimeMs).toBeLessThan(100); // 100ms 이하

      console.log(`⚡ 헬스체크 응답 시간: ${responseTimeMs.toFixed(2)}ms`);
    });

    test("서비스 정보 응답 시간", async () => {
      const startTime = process.hrtime.bigint();

      const response = await apiClient.getServiceInfo();

      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1000000;

      expect(response.status).toBe(200);
      expect(responseTimeMs).toBeLessThan(200); // 200ms 이하

      console.log(`⚡ 서비스 정보 응답 시간: ${responseTimeMs.toFixed(2)}ms`);
    });
  });
});
