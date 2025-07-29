// ========================================
// Swagger 미들웨어 설정 (타입 오류 수정)
// src/infrastructure/swagger/swaggerMiddleware.ts
// ========================================

import { Application } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swaggerConfig";

/**
 * Swagger UI 미들웨어 설정
 */

/**
 * Swagger UI 커스텀 옵션
 */
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: "none",
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    layout: "StandaloneLayout",
    deepLinking: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    defaultModelRendering: "example",
    showExtensions: true,
    showCommonExtensions: true,
    persistAuthorization: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 20px; border-radius: 4px; }
    .swagger-ui .info .title { color: #3b4151; font-size: 36px; }
    .swagger-ui .info .description { color: #3b4151; font-size: 14px; }
    .swagger-ui .servers { margin-bottom: 20px; }
    .swagger-ui .opblock.opblock-get { border-color: #61affe; background: rgba(97, 175, 254, 0.1); }
    .swagger-ui .opblock.opblock-post { border-color: #49cc90; background: rgba(73, 204, 144, 0.1); }
    .swagger-ui .opblock.opblock-put { border-color: #fca130; background: rgba(252, 161, 48, 0.1); }
    .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; background: rgba(249, 62, 62, 0.1); }
    .swagger-ui .btn.authorize { background-color: #4990e2; border-color: #4990e2; }
    .swagger-ui .btn.execute { background-color: #4990e2; border-color: #4990e2; }
  `,
  customSiteTitle: "Product Service API Documentation",
};

/**
 * Express 앱에 Swagger 미들웨어 설정
 */
export function setupSwagger(app: Application): void {
  // Swagger JSON 스펙 제공
  app.get("/api/docs/json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(swaggerSpec);
  });

  // Swagger UI 인터페이스 제공
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerOptions)
  );

  // 개발환경에서만 활성화
  if (process.env.NODE_ENV === "development") {
    console.log(`
🚀 ========================================
📚 Swagger API Documentation is running!
🌐 Swagger UI: http://localhost:${process.env.PORT || 3003}/api/docs
📄 JSON Spec: http://localhost:${process.env.PORT || 3003}/api/docs/json
========================================
    `);
  }
}

/**
 * Swagger 스펙 유효성 검증
 */
export function validateSwaggerSpec(): boolean {
  try {
    // 타입 안전한 검증
    const spec = swaggerSpec as any;

    if (!spec || !spec.openapi) {
      console.error("❌ Swagger specification is invalid or missing");
      return false;
    }

    if (!spec.info || !spec.info.title) {
      console.error("❌ Swagger info section is missing or invalid");
      return false;
    }

    console.log("✅ Swagger specification is valid");
    return true;
  } catch (error) {
    console.error("❌ Error validating Swagger specification:", error);
    return false;
  }
}

/**
 * 개발 환경에서 Swagger 설정 정보 출력
 */
export function logSwaggerInfo(): void {
  if (process.env.NODE_ENV === "development") {
    const spec = swaggerSpec as any;
    console.log(`
📋 Swagger Configuration:
- Title: ${spec.info?.title || "Product Service API"}
- Version: ${spec.info?.version || "1.0.0"}
- Available at: /api/docs
    `);
  }
}
