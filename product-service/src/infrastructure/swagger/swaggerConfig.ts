// ========================================
// Swagger 설정 파일
// src/infrastructure/swagger/swaggerConfig.ts
// ========================================

import swaggerJSDoc from "swagger-jsdoc";
import { SwaggerDefinition } from "swagger-jsdoc";

/**
 * Swagger API 문서 설정
 *
 * 기능:
 * - REST API 자동 문서화
 * - 인터랙티브 테스트 환경 제공
 * - API 스펙 표준화
 * - 프론트엔드 개발자와의 협업 지원
 */

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Product Service API",
    version: "1.0.0",
    description: `
# 🛒 마이크로서비스 온라인 쇼핑몰 - Product Service

## 📋 개요
Clean Architecture 패턴을 적용한 상품 관리 마이크로서비스입니다.

## 🏗️ 아키텍처 특징
- **Clean Architecture**: 4계층 구조 (Domain, Application, Infrastructure, Framework)
- **SOLID 원칙**: 확장 가능하고 유지보수 용이한 설계
- **TDD 개발**: 120+ 테스트 케이스로 검증된 안정성
- **DDD 패턴**: 도메인 중심 설계

## ⚡ 핵심 기능
- 상품 CRUD 관리
- 카테고리 계층 구조 관리
- 재고 관리 (실시간 재고 추적)
- 고급 검색 및 필터링
- 페이지네이션 지원

## 🔧 기술 스택
- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Testing**: Jest, Supertest
- **Architecture**: Clean Architecture + DI Container
    `,
    contact: {
      name: "개발자",
      email: "developer@shopping-mall.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3003",
      description: "개발 서버",
    },
    {
      url: "https://api.shopping-mall.com",
      description: "프로덕션 서버",
    },
  ],
  tags: [
    {
      name: "Products",
      description: "상품 관리 API",
    },
    {
      name: "Categories",
      description: "카테고리 관리 API",
    },
    {
      name: "Health",
      description: "서비스 상태 확인 API",
    },
  ],
  components: {
    schemas: {
      // 성공 응답 스키마
      ApiResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "요청 성공 여부",
          },
          message: {
            type: "string",
            description: "응답 메시지",
          },
          data: {
            type: "object",
            description: "응답 데이터",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "응답 시간",
          },
          requestId: {
            type: "string",
            description: "요청 추적 ID",
          },
        },
      },

      // 에러 응답 스키마
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            description: "에러 메시지",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  description: "에러 발생 필드",
                },
                message: {
                  type: "string",
                  description: "에러 상세 메시지",
                },
              },
            },
          },
          data: {
            type: "object",
            nullable: true,
            example: null,
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
          requestId: {
            type: "string",
          },
        },
      },

      // 상품 스키마
      Product: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "상품 고유 ID",
          },
          name: {
            type: "string",
            description: "상품명",
            example: "MacBook Pro 16인치 M3 Pro",
          },
          description: {
            type: "string",
            description: "상품 설명",
          },
          price: {
            type: "string",
            description: "정가",
            example: "3299000.00",
          },
          discountPrice: {
            type: "string",
            nullable: true,
            description: "할인가",
          },
          sku: {
            type: "string",
            description: "상품 코드",
            example: "MBP16-M3PRO-18-512",
          },
          brand: {
            type: "string",
            description: "브랜드",
            example: "Apple",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            description: "상품 태그",
          },
          slug: {
            type: "string",
            description: "SEO 친화적 URL",
          },
          category: {
            $ref: "#/components/schemas/Category",
          },
          inventory: {
            $ref: "#/components/schemas/Inventory",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      // 카테고리 스키마
      Category: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
            example: "노트북",
          },
          slug: {
            type: "string",
            example: "노트북",
          },
        },
      },

      // 재고 스키마
      Inventory: {
        type: "object",
        properties: {
          availableQuantity: {
            type: "integer",
            description: "사용 가능한 재고 수량",
          },
          status: {
            type: "string",
            enum: ["sufficient", "low_stock", "out_of_stock"],
            description: "재고 상태",
          },
        },
      },

      // 페이지네이션 스키마
      Pagination: {
        type: "object",
        properties: {
          currentPage: {
            type: "integer",
            description: "현재 페이지",
          },
          totalPages: {
            type: "integer",
            description: "전체 페이지 수",
          },
          totalItems: {
            type: "integer",
            description: "전체 아이템 수",
          },
          hasNextPage: {
            type: "boolean",
            description: "다음 페이지 존재 여부",
          },
          hasPreviousPage: {
            type: "boolean",
            description: "이전 페이지 존재 여부",
          },
        },
      },

      // 상품 생성 요청 스키마
      CreateProductRequest: {
        type: "object",
        required: [
          "name",
          "description",
          "price",
          "categoryId",
          "brand",
          "sku",
          "initialStock",
        ],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            description: "상품명",
            example: "iPhone 15 Pro Max",
          },
          description: {
            type: "string",
            description: "상품 설명",
            example: "A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰",
          },
          price: {
            type: "number",
            minimum: 0,
            description: "상품 가격",
            example: 1550000,
          },
          categoryId: {
            type: "string",
            format: "uuid",
            description: "카테고리 ID",
          },
          brand: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "브랜드명",
            example: "Apple",
          },
          sku: {
            type: "string",
            pattern: "^[A-Z0-9-_]+$",
            description: "상품 코드 (대문자, 숫자, 하이픈, 언더스코어만 허용)",
            example: "IPH-15-PM-256-NT",
          },
          weight: {
            type: "number",
            minimum: 0,
            description: "무게(kg)",
            example: 0.221,
          },
          dimensions: {
            type: "object",
            properties: {
              width: { type: "number", description: "가로(cm)" },
              height: { type: "number", description: "세로(cm)" },
              depth: { type: "number", description: "깊이(cm)" },
            },
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "상품 태그",
            example: ["스마트폰", "아이폰", "A17Pro", "티타늄"],
          },
          discountPrice: {
            type: "number",
            minimum: 0,
            description: "할인가",
          },
          initialStock: {
            type: "object",
            required: ["quantity", "lowStockThreshold", "location"],
            properties: {
              quantity: {
                type: "integer",
                minimum: 0,
                description: "초기 재고 수량",
              },
              lowStockThreshold: {
                type: "integer",
                minimum: 0,
                description: "재고 부족 기준값",
              },
              location: {
                type: "string",
                description: "재고 위치",
                example: "WAREHOUSE-A",
              },
            },
          },
        },
      },
    },

    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT 토큰을 이용한 인증",
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [
    "./src/frameworks/routes/*.ts",
    "./src/frameworks/controllers/*.ts",
    "./src/**/*.ts",
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
