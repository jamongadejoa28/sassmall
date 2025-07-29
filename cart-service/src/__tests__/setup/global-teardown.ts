// cart-service/src/__tests__/setup/global-teardown.ts
// ========================================

import { execSync } from "child_process"; // 🔧 수정: import 추가

export default async (): Promise<void> => {
  console.log("🧹 [Global Teardown] 테스트 환경 정리 시작...");

  try {
    // Docker Compose로 테스트 환경 정리
    console.log("📦 [Docker] 테스트 컨테이너 정리 중...");
    execSync("docker-compose -f docker-compose.test.yml down -v", {
      stdio: "inherit",
      timeout: 30000,
    });

    console.log("✅ [Global Teardown] 테스트 환경 정리 완료!");
  } catch (error) {
    console.error("❌ [Global Teardown] 정리 실패:", error);
    // teardown 실패는 경고만 표시
  }
};
