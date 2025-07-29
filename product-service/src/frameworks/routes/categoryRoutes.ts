// ========================================
// Category Routes - REST API 경로 설정
// src/frameworks/routes/categoryRoutes.ts
// ========================================

import { Router } from "express";
import { DIContainer } from "../../infrastructure/di/Container";
import { CategoryController } from "../controllers/CategoryController";
import { loggingMiddleware, requestIdMiddleware } from "../middlewares/common";
import {
  validateGetCategoryDetail,
  validateGetCategoryList,
  validateCreateCategory,
  validateUpdateCategory,
} from "../middlewares/validation";
import { requireAuth, requireAdmin } from "../middlewares/authMiddleware";
import { TYPES } from "../../infrastructure/di/types";

/**
 * Category API Routes 설정
 *
 * 엔드포인트:
 * - GET    /api/v1/categories        - 카테고리 목록 조회
 * - GET    /api/v1/categories/:id    - 카테고리 상세 조회
 * - POST   /api/v1/categories        - 카테고리 생성 (관리자)
 * - PUT    /api/v1/categories/:id    - 카테고리 수정 (관리자)
 * - DELETE /api/v1/categories/:id    - 카테고리 삭제 (관리자)
 *
 * 미들웨어 체인:
 * 1. requestIdMiddleware - 요청 ID 생성
 * 2. loggingMiddleware - 요청/응답 로깅
 * 3. validation - 입력 검증
 * 4. controller - 비즈니스 로직 처리
 */
export function createCategoryRoutes(): Router {
  const router = Router();

  // DI Container에서 Controller 가져오기
  const container = DIContainer.getContainer();
  const categoryController = container.get<CategoryController>(TYPES.CategoryController);

  // 모든 요청에 공통 미들웨어 적용
  router.use(requestIdMiddleware);
  router.use(loggingMiddleware);

  /**
   * GET /api/v1/categories - 카테고리 목록 조회
   *
   * @description 활성화된 카테고리 목록을 조회합니다
   * @query isActive - 활성화 상태 필터 (기본값: true)
   * @query sortBy - 정렬 기준 (sort_order|name|createdAt)
   * @query sortOrder - 정렬 순서 (asc|desc)
   * @returns GetCategoryListResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 쿼리 파라미터
   */
  router.get(
    "/",
    validateGetCategoryList,
    categoryController.getCategoryList.bind(categoryController)
  );

  /**
   * GET /api/v1/categories/:id - 카테고리 상세 조회
   *
   * @description 특정 카테고리의 상세 정보를 조회합니다
   * @param id - 카테고리 UUID
   * @returns GetCategoryDetailResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 카테고리 ID
   * @status 404 - 카테고리를 찾을 수 없음
   */
  router.get(
    "/:id",
    validateGetCategoryDetail,
    categoryController.getCategoryDetail.bind(categoryController)
  );

  /**
   * POST /api/v1/categories - 카테고리 생성 (관리자)
   *
   * @description 새로운 카테고리를 생성합니다
   * @body CreateCategoryRequest
   * @returns CreateCategoryResponse
   * @status 201 - 생성 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   * @status 409 - 카테고리 이름 중복
   */
  router.post(
    "/",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    validateCreateCategory,
    categoryController.createCategory.bind(categoryController)
  );

  /**
   * PUT /api/v1/categories/:id - 카테고리 수정 (관리자)
   *
   * @description 기존 카테고리 정보를 수정합니다
   * @param id - 카테고리 UUID
   * @body UpdateCategoryRequest
   * @returns UpdateCategoryResponse
   * @status 200 - 수정 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   * @status 404 - 카테고리를 찾을 수 없음
   * @status 409 - 카테고리 이름 중복
   */
  router.put(
    "/:id",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    validateGetCategoryDetail, // 카테고리 ID 검증
    validateUpdateCategory,
    categoryController.updateCategory.bind(categoryController)
  );

  /**
   * DELETE /api/v1/categories/:id - 카테고리 삭제 (관리자)
   *
   * @description 카테고리를 삭제합니다 (소프트 삭제)
   * @param id - 카테고리 UUID
   * @returns DeleteCategoryResponse
   * @status 200 - 삭제 성공
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   * @status 404 - 카테고리를 찾을 수 없음
   * @status 409 - 카테고리에 연결된 상품이 있어 삭제 불가
   */
  router.delete(
    "/:id",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    validateGetCategoryDetail, // 카테고리 ID 검증
    categoryController.deleteCategory.bind(categoryController)
  );

  return router;
}