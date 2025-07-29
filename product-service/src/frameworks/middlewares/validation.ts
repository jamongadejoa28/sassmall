// ========================================
// Request Validation Middleware
// src/frameworks/middlewares/validation.ts
// ========================================

import { body, param, query } from "express-validator";

/**
 * 상품 생성 API 검증 규칙
 * POST /api/v1/products
 */
export const validateCreateProduct = [
  // 기본 상품 정보 검증
  body("name")
    .isString()
    .withMessage("상품명은 문자열이어야 합니다")
    .isLength({ min: 1, max: 200 })
    .withMessage("상품명은 1자 이상 200자 이하여야 합니다")
    .trim(),

  body("description")
    .isString()
    .withMessage("상품 설명은 문자열이어야 합니다")
    .isLength({ min: 1, max: 2000 })
    .withMessage("상품 설명은 1자 이상 2000자 이하여야 합니다")
    .trim(),

  body("price")
    .isFloat({ min: 0 })
    .withMessage("가격은 0 이상의 숫자여야 합니다")
    .toFloat(),

  body("categoryId")
    .isUUID()
    .withMessage("카테고리 ID는 유효한 UUID여야 합니다"),

  body("brand")
    .isString()
    .withMessage("브랜드는 문자열이어야 합니다")
    .isLength({ min: 1, max: 100 })
    .withMessage("브랜드는 1자 이상 100자 이하여야 합니다")
    .trim(),

  body("sku")
    .isString()
    .withMessage("SKU는 문자열이어야 합니다")
    .isLength({ min: 1, max: 50 })
    .withMessage("SKU는 1자 이상 50자 이하여야 합니다")
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage("SKU는 대문자, 숫자, 하이픈, 언더스코어만 허용됩니다")
    .trim(),

  // 선택적 필드 검증
  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("무게는 0 이상의 숫자여야 합니다")
    .toFloat(),

  body("dimensions")
    .optional()
    .isObject()
    .withMessage("치수는 객체여야 합니다"),

  body("dimensions.width")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("너비는 0 이상의 숫자여야 합니다")
    .toFloat(),

  body("dimensions.height")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("높이는 0 이상의 숫자여야 합니다")
    .toFloat(),

  body("dimensions.depth")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("깊이는 0 이상의 숫자여야 합니다")
    .toFloat(),

  body("tags").optional().isArray().withMessage("태그는 배열이어야 합니다"),

  body("tags.*")
    .optional()
    .isString()
    .withMessage("각 태그는 문자열이어야 합니다")
    .isLength({ min: 1, max: 50 })
    .withMessage("각 태그는 1자 이상 50자 이하여야 합니다")
    .trim(),

  // 초기 재고 정보 검증
  body("initialStock")
    .isObject()
    .withMessage("초기 재고 정보는 객체여야 합니다"),

  body("initialStock.quantity")
    .isInt({ min: 0 })
    .withMessage("재고 수량은 0 이상의 정수여야 합니다")
    .toInt(),

  body("initialStock.location")
    .optional()
    .isString()
    .withMessage("창고 위치는 문자열이어야 합니다")
    .isLength({ min: 1, max: 100 })
    .withMessage("창고 위치는 1자 이상 100자 이하여야 합니다")
    .trim(),

  body("initialStock.lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("최소 재고 임계값은 0 이상의 정수여야 합니다")
    .toInt(),
];

/**
 * 상품 상세 조회 API 검증 규칙
 * GET /api/v1/products/:id
 */
export const validateGetProductDetail = [
  param("id").isUUID().withMessage("상품 ID는 유효한 UUID여야 합니다"),

  query("includeInventory")
    .optional()
    .isBoolean()
    .withMessage("includeInventory는 boolean 값이어야 합니다")
    .toBoolean(),
];

/**
 * 상품 목록 조회 API 검증 규칙
 * GET /api/v1/products
 */
export const validateGetProductList = [
  // 페이지네이션 검증
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("페이지는 1 이상의 정수여야 합니다")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("한 페이지당 항목 수는 1 이상 100 이하여야 합니다")
    .toInt(),

  // 필터링 검증
  query("categoryId")
    .optional()
    .isUUID()
    .withMessage("카테고리 ID는 유효한 UUID여야 합니다"),
  
  query("category")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        // 단일 카테고리 또는 쉼표로 구분된 다중 카테고리 허용
        const categories = value.split(',').map(c => c.trim());
        return categories.every(cat => cat.length <= 50) && categories.length <= 10;
      }
      return false;
    })
    .withMessage("카테고리는 유효한 문자열이어야 합니다 (최대 10개, 각 50자 이하)"),

  query("brand")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        return value.length <= 100;
      }
      if (Array.isArray(value)) {
        return value.every((brand) => typeof brand === "string" && brand.length <= 100) && value.length <= 10;
      }
      return false;
    })
    .withMessage("브랜드는 문자열이거나 문자열 배열(최대 10개, 각각 100자 이하)이어야 합니다"),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("최소 가격은 0 이상의 숫자여야 합니다")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("최대 가격은 0 이상의 숫자여야 합니다")
    .toFloat(),

  query("search")
    .optional()
    .isString()
    .withMessage("검색어는 문자열이어야 합니다")
    .isLength({ max: 200 })
    .withMessage("검색어는 200자 이하여야 합니다"),

  // 정렬 검증
  query("sortBy")
    .optional()
    .isIn(["name", "price", "createdAt", "price_asc", "price_desc", "name_asc", "name_desc", "created_asc", "created_desc"])
    .withMessage("정렬 기준은 name, price, createdAt, price_asc, price_desc, name_asc, name_desc, created_desc 중 하나여야 합니다"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("정렬 순서는 asc 또는 desc여야 합니다"),

  query("isActive")
    .optional()
    .custom((value) => {
      // 'all' 값은 관리자용으로 모든 상품 조회를 위해 허용
      if (value === 'all') {
        return true;
      }
      // boolean 문자열 ('true', 'false') 허용
      if (value === 'true' || value === 'false' || typeof value === 'boolean') {
        return true;
      }
      return false;
    })
    .withMessage("isActive는 boolean 값이거나 'all'이어야 합니다"),

  // 가격 범위 논리 검증 (커스텀 검증)
  query("maxPrice").custom((maxPrice, { req }) => {
    if (maxPrice && req.query?.minPrice) {
      const minPrice = parseFloat(req.query.minPrice as string);
      const maxPriceValue = parseFloat(maxPrice);
      if (!isNaN(minPrice) && !isNaN(maxPriceValue) && maxPriceValue <= minPrice) {
        throw new Error("최대 가격은 최소 가격보다 커야 합니다");
      }
    }
    return true;
  }),
];

/**
 * 카테고리 목록 조회 API 검증 규칙
 * GET /api/v1/categories
 */
export const validateGetCategoryList = [
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive는 boolean 값이어야 합니다")
    .toBoolean(),

  query("sortBy")
    .optional()
    .isIn(["sort_order", "name", "createdAt"])
    .withMessage("정렬 기준은 sort_order, name, createdAt 중 하나여야 합니다"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("정렬 순서는 asc 또는 desc여야 합니다"),
];

/**
 * 카테고리 상세 조회 API 검증 규칙
 * GET /api/v1/categories/:id
 */
export const validateGetCategoryDetail = [
  param("id").isUUID().withMessage("카테고리 ID는 유효한 UUID여야 합니다"),
];

/**
 * 카테고리 생성 API 검증 규칙
 * POST /api/v1/categories
 */
export const validateCreateCategory = [
  body("name")
    .isString()
    .withMessage("카테고리 이름은 문자열이어야 합니다")
    .isLength({ min: 2, max: 50 })
    .withMessage("카테고리 이름은 2자 이상 50자 이하여야 합니다")
    .trim(),

  body("slug")
    .optional()
    .isString()
    .withMessage("슬러그는 문자열이어야 합니다")
    .isLength({ min: 2, max: 50 })
    .withMessage("슬러그는 2자 이상 50자 이하여야 합니다")
    .matches(/^[a-z0-9가-힣\-_]+$/)
    .withMessage("슬러그는 소문자, 숫자, 한글, 하이픈, 언더스코어만 허용됩니다")
    .trim(),

  body("description")
    .optional()
    .isString()
    .withMessage("설명은 문자열이어야 합니다")
    .isLength({ max: 500 })
    .withMessage("설명은 500자 이하여야 합니다")
    .trim(),

  body("sortOrder")
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage("정렬 순서는 0 이상 9999 이하의 정수여야 합니다")
    .toInt(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("활성화 상태는 boolean 값이어야 합니다")
    .toBoolean(),
];

/**
 * 카테고리 수정 API 검증 규칙
 * PUT /api/v1/categories/:id
 */
export const validateUpdateCategory = [
  param("id").isUUID().withMessage("카테고리 ID는 유효한 UUID여야 합니다"),

  body("name")
    .optional()
    .isString()
    .withMessage("카테고리 이름은 문자열이어야 합니다")
    .isLength({ min: 2, max: 50 })
    .withMessage("카테고리 이름은 2자 이상 50자 이하여야 합니다")
    .trim(),

  body("slug")
    .optional()
    .isString()
    .withMessage("슬러그는 문자열이어야 합니다")
    .isLength({ min: 2, max: 50 })
    .withMessage("슬러그는 2자 이상 50자 이하여야 합니다")
    .matches(/^[a-z0-9가-힣\-_]+$/)
    .withMessage("슬러그는 소문자, 숫자, 한글, 하이픈, 언더스코어만 허용됩니다")
    .trim(),

  body("description")
    .optional()
    .isString()
    .withMessage("설명은 문자열이어야 합니다")
    .isLength({ max: 500 })
    .withMessage("설명은 500자 이하여야 합니다")
    .trim(),

  body("sortOrder")
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage("정렬 순서는 0 이상 9999 이하의 정수여야 합니다")
    .toInt(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("활성화 상태는 boolean 값이어야 합니다")
    .toBoolean(),
];
