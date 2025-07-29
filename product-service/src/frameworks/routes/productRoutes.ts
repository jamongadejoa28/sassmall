// ========================================
// Product Routes - REST API 경로 설정
// src/frameworks/routes/productRoutes.ts
// ========================================

import { Router } from "express";
import { DIContainer } from "../../infrastructure/di/Container";
import { ProductController } from "../controllers/ProductController";
import { loggingMiddleware, requestIdMiddleware } from "../middlewares/common";
import {
  validateCreateProduct,
  validateGetProductDetail,
  validateGetProductList,
} from "../middlewares/validation";
import { requireAuth, optionalAuth, requireAdmin } from "../middlewares/authMiddleware";
import { TYPES } from "../../infrastructure/di/types";

/**
 * Product API Routes 설정
 *
 * 엔드포인트:
 * - POST   /api/v1/products        - 상품 생성
 * - GET    /api/v1/products/:id    - 상품 상세 조회
 * - GET    /api/v1/products        - 상품 목록 조회
 * - GET    /api/v1/products/:id/reviews - 상품 리뷰 목록 조회
 * - POST   /api/v1/products/:id/reviews - 상품 리뷰 작성
 * - GET    /api/v1/products/:id/qna - 상품 Q&A 목록 조회
 * - POST   /api/v1/products/:id/qna - 상품 Q&A 작성
 * - PUT    /api/v1/qna/:qnaId/answer - 상품 Q&A 답변
 *
 * 미들웨어 체인:
 * 1. requestIdMiddleware - 요청 ID 생성
 * 2. loggingMiddleware - 요청/응답 로깅
 * 3. validation - 입력 검증
 * 4. controller - 비즈니스 로직 처리
 */
export function createProductRoutes(): Router {
  const router = Router();

  // DI Container에서 Controller 가져오기
  const container = DIContainer.getContainer();
  const productController = container.get<ProductController>(TYPES.ProductController);

  // 모든 요청에 공통 미들웨어 적용
  router.use(requestIdMiddleware);
  router.use(loggingMiddleware);

  /**
   * POST /api/v1/products - 상품 생성
   *
   * @description 새로운 상품과 초기 재고를 생성합니다
   * @body CreateProductRequest
   * @returns CreateProductResponse
   * @status 201 - 생성 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 409 - SKU 중복
   * @status 404 - 카테고리를 찾을 수 없음
   */
  router.post(
    "/",
    validateCreateProduct,
    productController.createProduct.bind(productController)
  );

  /**
   * GET /api/v1/products/stats-test - 상품 통계 조회 (개발용 - 인증 없음)
   * 
   * @description 개발/테스트용 상품 통계 조회 (인증 없음)
   * @returns GetProductStatsResponse
   * @status 200 - 조회 성공
   */
  router.get(
    "/stats-test",
    productController.getProductStats.bind(productController)
  );

  /**
   * GET /api/v1/products/stats - 상품 통계 조회 (관리자 전용)
   * 
   * @description 관리자 대시보드용 상품 통계를 조회합니다
   * @returns GetProductStatsResponse
   * @status 200 - 조회 성공
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   */
  router.get(
    "/stats",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    productController.getProductStats.bind(productController)
  );

  /**
   * GET /api/v1/products - 일반 사용자용 상품 목록 조회
   *
   * @description 일반 사용자를 위한 활성 상품 목록만 조회합니다
   * @query page - 페이지 번호 (기본값: 1)
   * @query limit - 한 페이지당 항목 수 (기본값: 20, 최대: 100)
   * @query categoryId - 카테고리 ID 필터
   * @query brand - 브랜드 필터
   * @query minPrice - 최소 가격 필터
   * @query maxPrice - 최대 가격 필터
   * @query search - 검색어 (상품명, 설명, 태그 검색)
   * @query sortBy - 정렬 기준 (name|price|createdAt)
   * @query sortOrder - 정렬 순서 (asc|desc)
   * @returns GetProductListResponse (활성 상품만)
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 쿼리 파라미터
   */
  router.get(
    "/",
    validateGetProductList,
    productController.getProductList.bind(productController)
  );

  /**
   * GET /api/v1/products/admin - 관리자용 상품 목록 조회
   *
   * @description 관리자를 위한 모든 상품 목록 조회 (활성/비활성 포함)
   * @query page - 페이지 번호 (기본값: 1)
   * @query limit - 한 페이지당 항목 수 (기본값: 20, 최대: 100)
   * @query categoryId - 카테고리 ID 필터
   * @query brand - 브랜드 필터
   * @query minPrice - 최소 가격 필터
   * @query maxPrice - 최대 가격 필터
   * @query search - 검색어 (상품명, 설명, 태그 검색)
   * @query sortBy - 정렬 기준 (name|price|createdAt)
   * @query sortOrder - 정렬 순서 (asc|desc)
   * @query isActive - 활성화 상태 필터 (선택적)
   * @returns GetProductListResponse (모든 상품)
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 쿼리 파라미터
   * @status 401 - 인증 필요
   * @status 403 - 관리자 권한 필요
   */
  router.get(
    "/admin",
    requireAuth(), // 인증 필수
    requireAdmin(), // 관리자 권한 필요
    validateGetProductList,
    productController.getAdminProductList.bind(productController)
  );

  /**
   * GET /api/v1/products/:id - 상품 상세 조회
   *
   * @description 특정 상품의 상세 정보를 조회합니다
   * @param id - 상품 UUID
   * @query includeInventory - 재고 정보 포함 여부 (기본값: true)
   * @returns GetProductDetailResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 상품 ID
   * @status 404 - 상품을 찾을 수 없음
   * @status 403 - 비활성화된 상품
   */
  router.get(
    "/:id",
    validateGetProductDetail,
    productController.getProductDetail.bind(productController)
  );

  /**
   * GET /api/v1/products/:id/reviews - 상품 리뷰 목록 조회
   * 
   * @description 특정 상품의 리뷰 목록을 조회합니다
   * @param id - 상품 UUID
   * @query page - 페이지 번호 (기본값: 1)
   * @query limit - 한 페이지당 항목 수 (기본값: 10)
   * @query sortBy - 정렬 기준 (newest|oldest|rating_high|rating_low|helpful)
   * @returns GetProductReviewsResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 요청 파라미터
   * @status 404 - 상품을 찾을 수 없음
   */
  router.get(
    "/:id/reviews",
    validateGetProductDetail, // 상품 ID 검증 재사용
    productController.getProductReviews.bind(productController)
  );

  /**
   * POST /api/v1/products/:id/reviews - 상품 리뷰 작성
   * 
   * @description 특정 상품에 대한 리뷰를 작성합니다
   * @param id - 상품 UUID
   * @body CreateProductReviewRequest
   * @returns CreateProductReviewResponse
   * @status 201 - 작성 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요
   * @status 404 - 상품을 찾을 수 없음
   * @status 409 - 중복 리뷰 (이미 작성한 리뷰 존재)
   */
  router.post(
    "/:id/reviews",
    validateGetProductDetail, // 상품 ID 검증 재사용
    // TODO: 추후 validateCreateProductReview 미들웨어 추가
    productController.createProductReview.bind(productController)
  );

  /**
   * GET /api/v1/products/:id/qna - 상품 Q&A 목록 조회
   * 
   * @description 특정 상품의 Q&A 목록을 조회합니다
   * @param id - 상품 UUID
   * @query page - 페이지 번호 (기본값: 1)
   * @query limit - 한 페이지당 항목 수 (기본값: 10)
   * @query sortBy - 정렬 기준 (newest|oldest)
   * @query onlyAnswered - 답변 완료된 것만 조회 (true|false)
   * @returns GetProductQnAResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 요청 파라미터
   * @status 404 - 상품을 찾을 수 없음
   */
  router.get(
    "/:id/qna",
    optionalAuth(), // 선택적 인증 (로그인 사용자에게 추가 정보 제공)
    validateGetProductDetail, // 상품 ID 검증 재사용
    productController.getProductQnA.bind(productController)
  );

  /**
   * POST /api/v1/products/:id/qna - 상품 Q&A 작성
   * 
   * @description 특정 상품에 대한 Q&A를 작성합니다
   * @param id - 상품 UUID
   * @body CreateProductQnARequest
   * @returns CreateProductQnAResponse
   * @status 201 - 작성 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요
   * @status 404 - 상품을 찾을 수 없음
   */
  router.post(
    "/:id/qna",
    requireAuth(), // 필수 인증 (로그인 사용자만 Q&A 작성 가능)
    validateGetProductDetail, // 상품 ID 검증 재사용
    // TODO: 추후 validateCreateProductQnA 미들웨어 추가
    productController.createProductQnA.bind(productController)
  );

  /**
   * PUT /api/v1/qna/:qnaId/answer - 상품 Q&A 답변
   * 
   * @description 특정 Q&A에 답변을 작성합니다 (관리자 전용)
   * @param qnaId - Q&A UUID
   * @body AnswerProductQnARequest
   * @returns AnswerProductQnAResponse
   * @status 200 - 답변 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   * @status 404 - Q&A를 찾을 수 없음
   * @status 409 - 이미 답변된 Q&A
   */
  router.put(
    "/qna/:qnaId/answer",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    // TODO: 추후 validateAnswerProductQnA 미들웨어 추가
    productController.answerProductQnA.bind(productController)
  );

  /**
   * POST /api/v1/products/:productId/inventory/update - 재고 업데이트
   * 
   * @description 상품의 재고를 업데이트합니다 (감소/증가/보충)
   * @param productId - 상품 UUID
   * @body UpdateInventoryRequest
   * @returns UpdateInventoryResponse
   * @status 200 - 업데이트 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요 (서비스 간 통신용)
   * @status 404 - 상품을 찾을 수 없음
   */
  router.post(
    "/:productId/inventory/update",
    requireAuth(), // 서비스 간 통신을 위한 인증
    // TODO: 추후 validateUpdateInventory 미들웨어 추가
    productController.updateInventory.bind(productController)
  );

  /**
   * PUT /api/v1/products/:id - 상품 수정 (관리자)
   * 
   * @description 기존 상품 정보를 수정합니다
   * @param id - 상품 UUID
   * @body UpdateProductRequest
   * @returns UpdateProductResponse
   * @status 200 - 수정 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   * @status 404 - 상품을 찾을 수 없음
   */
  router.put(
    "/:id",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    validateGetProductDetail, // 상품 ID 검증 재사용
    // TODO: 추후 validateUpdateProduct 미들웨어 추가
    productController.updateProduct.bind(productController)
  );

  /**
   * DELETE /api/v1/products/:id - 상품 삭제 (관리자)
   * 
   * @description 상품을 삭제합니다 (소프트 삭제)
   * @param id - 상품 UUID
   * @returns DeleteProductResponse
   * @status 200 - 삭제 성공
   * @status 401 - 인증 필요
   * @status 403 - 권한 없음 (관리자만 가능)
   * @status 404 - 상품을 찾을 수 없음
   */
  router.delete(
    "/:id",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    validateGetProductDetail, // 상품 ID 검증 재사용
    productController.deleteProduct.bind(productController)
  );

  /**
   * PATCH /api/v1/products/:id/status - 상품 활성화/비활성화 토글 (관리자)
   * 
   * @description 상품의 활성화/비활성화 상태를 토글합니다
   * @param id - 상품 UUID
   * @body { isActive: boolean }
   * @returns ToggleProductStatusResponse
   * @status 200 - 상태 변경 성공
   * @status 400 - 잘못된 요청
   * @status 401 - 인증 필요
   * @status 403 - 관리자 권한 필요
   * @status 404 - 상품을 찾을 수 없음
   * @status 500 - 서버 오류
   */
  router.patch(
    "/:id/status",
    requireAuth(), // 필수 인증
    requireAdmin(), // 관리자 권한 필요
    validateGetProductDetail, // 상품 ID 검증 재사용
    // TODO: validateToggleProductStatus 미들웨어 추가
    productController.toggleProductStatus.bind(productController)
  );

  return router;
}
