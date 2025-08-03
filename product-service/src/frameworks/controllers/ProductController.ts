// ========================================
// ProductController - REST API Controller
// src/frameworks/controllers/ProductController.ts
// ========================================

import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../../infrastructure/di/types";
import { CreateProductUseCase } from "../../usecases/CreateProductUseCase";
import { GetProductDetailUseCase } from "../../usecases/GetProductDetailUseCase";
import {
  GetProductListUseCase,
  GetProductListRequest,
} from "../../usecases/GetProductListUseCase"; // [수정] GetProductListRequest도 가져옵니다.
import { UpdateProductUseCase } from "../../usecases/UpdateProductUseCase";
import { DeleteProductUseCase, DeleteProductRequest } from "../../usecases/DeleteProductUseCase";
import { ToggleProductStatusUseCase, ToggleProductStatusRequest } from "../../usecases/ToggleProductStatusUseCase";
import { GetProductStatsUseCase, GetProductStatsRequest } from "../../usecases/GetProductStatsUseCase";
import { CreateProductRequest, UpdateProductRequest } from "../../usecases/types";
import { DomainError } from "../../shared/errors/DomainError";
import { validationResult } from "express-validator";

// 새로운 Review/QnA UseCase imports
import { 
  GetProductReviewsUseCase,
  GetProductReviewsRequest 
} from "../../usecases/GetProductReviewsUseCase";
import { 
  CreateProductReviewUseCase,
  CreateProductReviewRequest 
} from "../../usecases/CreateProductReviewUseCase";
import { 
  GetProductQnAUseCase,
  GetProductQnARequest 
} from "../../usecases/GetProductQnAUseCase";
import { 
  CreateProductQnAUseCase,
  CreateProductQnARequest 
} from "../../usecases/CreateProductQnAUseCase";
import { 
  AnswerProductQnAUseCase,
  AnswerProductQnARequest 
} from "../../usecases/AnswerProductQnAUseCase";
import { 
  UpdateInventoryUseCase,
  UpdateInventoryRequest,
  UpdateInventoryResponse 
} from "../../usecases/UpdateInventoryUseCase";

// 컨트롤러에서 사용할 표준 API 응답 타입을 정의합니다.
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: any[];
  timestamp: string;
  requestId: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 상품 고유 ID
 *           example: "660e8400-e29b-41d4-a716-446655440001"
 *         name:
 *           type: string
 *           description: 상품명
 *           example: "MacBook Pro 16인치 M3 Pro"
 *         description:
 *           type: string
 *           description: 상품 설명
 *           example: "Apple의 최신 M3 Pro 칩을 탑재한 고성능 노트북"
 *         price:
 *           type: string
 *           description: 정가
 *           example: "3299000.00"
 *         discountPrice:
 *           type: string
 *           nullable: true
 *           description: 할인가
 *           example: "2999000.00"
 *         sku:
 *           type: string
 *           description: 상품 코드
 *           example: "MBP16-M3PRO-18-512"
 *         brand:
 *           type: string
 *           description: 브랜드
 *           example: "Apple"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 상품 태그
 *           example: ["노트북", "맥북", "M3", "고성능"]
 *         slug:
 *           type: string
 *           description: SEO 친화적 URL
 *           example: "macbook-pro-16인치-m3-pro"
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               example: "노트북"
 *             slug:
 *               type: string
 *               example: "노트북"
 *         inventory:
 *           type: object
 *           properties:
 *             availableQuantity:
 *               type: integer
 *               description: 사용 가능한 재고 수량
 *               example: 45
 *             status:
 *               type: string
 *               enum: [sufficient, low_stock, out_of_stock]
 *               description: 재고 상태
 *               example: "sufficient"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-13T02:12:10.266Z"
 *
 *     CreateProductRequest:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - categoryId
 *         - brand
 *         - sku
 *         - initialStock
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: 상품명
 *           example: "iPhone 15 Pro Max"
 *         description:
 *           type: string
 *           description: 상품 설명
 *           example: "A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰"
 *         price:
 *           type: number
 *           minimum: 0
 *           description: 상품 가격
 *           example: 1550000
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: 카테고리 ID
 *           example: "550e8400-e29b-41d4-a716-446655440122"
 *         brand:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: 브랜드명
 *           example: "Apple"
 *         sku:
 *           type: string
 *           pattern: "^[A-Z0-9-_]+$"
 *           description: 상품 코드 (대문자, 숫자, 하이픈, 언더스코어만 허용)
 *           example: "IPH-15-PM-256-NT"
 *         weight:
 *           type: number
 *           minimum: 0
 *           description: 무게(kg)
 *           example: 0.221
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *               description: 가로(cm)
 *               example: 7.69
 *             height:
 *               type: number
 *               description: 세로(cm)
 *               example: 15.95
 *             depth:
 *               type: number
 *               description: 깊이(cm)
 *               example: 0.83
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 상품 태그
 *           example: ["스마트폰", "아이폰", "A17Pro", "티타늄"]
 *         discountPrice:
 *           type: number
 *           minimum: 0
 *           description: 할인가
 *           example: 1450000
 *         initialStock:
 *           type: object
 *           required:
 *             - quantity
 *             - lowStockThreshold
 *             - location
 *           properties:
 *             quantity:
 *               type: integer
 *               minimum: 0
 *               description: 초기 재고 수량
 *               example: 100
 *             lowStockThreshold:
 *               type: integer
 *               minimum: 0
 *               description: 재고 부족 기준값
 *               example: 20
 *             location:
 *               type: string
 *               description: 재고 위치
 *               example: "WAREHOUSE-A"
 *
 *     ProductListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "상품 목록을 성공적으로 조회했습니다"
 *         data:
 *           type: object
 *           properties:
 *             products:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalItems:
 *                   type: integer
 *                   example: 9
 *                 hasNextPage:
 *                   type: boolean
 *                   example: false
 *                 hasPreviousPage:
 *                   type: boolean
 *                   example: false
 *             filters:
 *               type: object
 *               description: 적용된 필터 정보
 *         timestamp:
 *           type: string
 *           format: date-time
 *         requestId:
 *           type: string
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "입력 데이터가 올바르지 않습니다"
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: "name"
 *               message:
 *                 type: string
 *                 example: "상품명은 필수 항목입니다"
 *         data:
 *           type: object
 *           nullable: true
 *           example: null
 *         timestamp:
 *           type: string
 *           format: date-time
 *         requestId:
 *           type: string
 */

/**
 * ProductController - 상품 관련 REST API Controller
 */
@injectable()
export class ProductController {
  constructor(
    @inject(TYPES.CreateProductUseCase)
    private readonly createProductUseCase: CreateProductUseCase,

    @inject(TYPES.GetProductDetailUseCase)
    private readonly getProductDetailUseCase: GetProductDetailUseCase,

    @inject(TYPES.GetProductListUseCase)
    private readonly getProductListUseCase: GetProductListUseCase,

    @inject(TYPES.UpdateProductUseCase)
    private readonly updateProductUseCase: UpdateProductUseCase,

    @inject(TYPES.DeleteProductUseCase)
    private readonly deleteProductUseCase: DeleteProductUseCase,

    @inject(TYPES.ToggleProductStatusUseCase)
    private readonly toggleProductStatusUseCase: ToggleProductStatusUseCase,

    @inject(TYPES.GetProductStatsUseCase)
    private readonly getProductStatsUseCase: GetProductStatsUseCase,

    // 새로운 Review/QnA UseCase 의존성
    @inject(TYPES.GetProductReviewsUseCase)
    private readonly getProductReviewsUseCase: GetProductReviewsUseCase,

    @inject(TYPES.CreateProductReviewUseCase)
    private readonly createProductReviewUseCase: CreateProductReviewUseCase,

    @inject(TYPES.GetProductQnAUseCase)
    private readonly getProductQnAUseCase: GetProductQnAUseCase,

    @inject(TYPES.CreateProductQnAUseCase)
    private readonly createProductQnAUseCase: CreateProductQnAUseCase,

    @inject(TYPES.AnswerProductQnAUseCase)
    private readonly answerProductQnAUseCase: AnswerProductQnAUseCase,

    @inject(TYPES.UpdateInventoryUseCase)
    private readonly updateInventoryUseCase: UpdateInventoryUseCase
  ) {}

  /**
   * @swagger
   * /api/v1/products:
   *   post:
   *     tags: [Products]
   *     summary: 새로운 상품 생성
   *     description: |
   *       새로운 상품과 초기 재고를 생성합니다.
   *
   *       **주요 기능:**
   *       - 상품 정보 등록 (이름, 설명, 가격, 브랜드 등)
   *       - 카테고리 연결
   *       - 초기 재고 설정
   *       - 자동 슬러그 생성 (SEO 최적화)
   *       - SKU 중복 검사
   *
   *       **비즈니스 규칙:**
   *       - SKU는 시스템 내에서 고유해야 함
   *       - 카테고리는 기존에 존재해야 함
   *       - 가격은 0 이상이어야 함
   *       - 재고 수량은 0 이상이어야 함
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProductRequest'
   *           examples:
   *             iPhone:
   *               summary: iPhone 15 Pro Max 예시
   *               value:
   *                 name: "iPhone 15 Pro Max"
   *                 description: "A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰"
   *                 price: 1550000
   *                 categoryId: "550e8400-e29b-41d4-a716-446655440122"
   *                 brand: "Apple"
   *                 sku: "IPH-15-PM-256-NT"
   *                 weight: 0.221
   *                 dimensions:
   *                   width: 7.69
   *                   height: 15.95
   *                   depth: 0.83
   *                 tags: ["스마트폰", "아이폰", "A17Pro", "티타늄"]
   *                 discountPrice: 1450000
   *                 initialStock:
   *                   quantity: 100
   *                   lowStockThreshold: 20
   *                   location: "WAREHOUSE-A"
   *             MacBook:
   *               summary: MacBook Pro 예시
   *               value:
   *                 name: "MacBook Pro 16인치 M3 Pro"
   *                 description: "Apple M3 Pro 칩, 18GB 통합 메모리, 512GB SSD"
   *                 price: 3299000
   *                 categoryId: "550e8400-e29b-41d4-a716-446655440111"
   *                 brand: "Apple"
   *                 sku: "MBP16-M3PRO-18-512"
   *                 weight: 2.1
   *                 dimensions:
   *                   width: 35.57
   *                   height: 24.81
   *                   depth: 1.68
   *                 tags: ["노트북", "맥북", "M3", "고성능"]
   *                 initialStock:
   *                   quantity: 50
   *                   lowStockThreshold: 10
   *                   location: "WAREHOUSE-A"
   *     responses:
   *       201:
   *         description: 상품이 성공적으로 생성되었습니다
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "상품이 성공적으로 생성되었습니다"
   *                 data:
   *                   type: object
   *                   properties:
   *                     product:
   *                       $ref: '#/components/schemas/Product'
   *                     inventory:
   *                       type: object
   *                       description: 생성된 재고 정보
   *       400:
   *         description: 잘못된 입력 데이터
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               validation_error:
   *                 summary: 유효성 검사 실패
   *                 value:
   *                   success: false
   *                   message: "입력 데이터가 올바르지 않습니다"
   *                   errors:
   *                     - field: "name"
   *                       message: "상품명은 필수 항목입니다"
   *                     - field: "price"
   *                       message: "가격은 0 이상이어야 합니다"
   *                   data: null
   *       404:
   *         description: 카테고리를 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: SKU 중복
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "이미 존재하는 SKU입니다"
   *               data: null
   */

  /**
   * POST /api/v1/products - 상품 생성
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const { generateImageUrls, generateThumbnailUrl } = await import("../../infrastructure/upload/imageUtils");

      // Parse productData from form-data if it exists
      let productData: any = {};
      if (req.body.productData) {
        try {
          productData = JSON.parse(req.body.productData);
        } catch (parseError) {
          const response: ApiResponse<null> = {
            success: false,
            message: "상품 데이터 파싱 오류",
            data: null,
            timestamp: new Date().toISOString(),
            requestId: (req.headers["x-request-id"] as string) || "unknown",
          };
          res.status(400).json(response);
          return;
        }
      } else {
        productData = req.body;
      }

      // Debug received data temporarily
      console.log('[DEBUG] Request details:', {
        contentType: req.get('Content-Type'),
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {}),
        hasProductData: !!req.body.productData,
        hasFiles: !!(req.files && (req.files as any[]).length > 0),
        fileCount: req.files ? (req.files as any[]).length : 0
      });
      console.log('[DEBUG] productData keys:', Object.keys(productData));
      console.log('[DEBUG] productData values:', JSON.stringify(productData, null, 2));

      // Handle uploaded images
      const files = req.files as Express.Multer.File[];
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let imageUrls: string[] = [];
      let thumbnailUrl: string | undefined;

      if (files && files.length > 0) {
        imageUrls = generateImageUrls(files, baseUrl);
        const thumbnailIndex = parseInt(req.body.thumbnailIndex) || 0;
        thumbnailUrl = generateThumbnailUrl(imageUrls, thumbnailIndex);
      }

      const createRequest: CreateProductRequest = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        categoryId: productData.categoryId,
        brand: productData.brand,
        sku: productData.sku,
        weight: productData.weight,
        dimensions: productData.dimensions,
        tags: productData.tags || [],
        discountPercent: productData.discountPercent,
        imageUrls,
        thumbnailUrl,
        initialStock: {
          quantity: productData.initialStock?.quantity,
          location: productData.initialStock?.location || "MAIN_WAREHOUSE",
          lowStockThreshold: productData.initialStock?.lowStockThreshold || 10,
        },
      };

      const result = await this.createProductUseCase.execute(createRequest);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품이 성공적으로 생성되었습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(201).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products/{id}:
   *   get:
   *     tags: [Products]
   *     summary: 상품 상세 정보 조회
   *     description: |
   *       특정 상품의 상세 정보를 조회합니다.
   *
   *       **포함 정보:**
   *       - 상품 기본 정보 (이름, 설명, 가격 등)
   *       - 카테고리 정보
   *       - 현재 재고 상태
   *       - 할인 정보 (있는 경우)
   *       - 상품 태그
   *       - 물리적 정보 (무게, 크기)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 상품 고유 ID
   *         example: "660e8400-e29b-41d4-a716-446655440001"
   *       - in: query
   *         name: includeInventory
   *         schema:
   *           type: boolean
   *           default: true
   *         description: 재고 정보 포함 여부
   *     responses:
   *       200:
   *         description: 상품 상세 정보 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "상품 상세 정보를 성공적으로 조회했습니다"
   *                 data:
   *                   type: object
   *                   properties:
   *                     product:
   *                       $ref: '#/components/schemas/Product'
   *             example:
   *               success: true
   *               message: "상품 상세 정보를 성공적으로 조회했습니다"
   *               data:
   *                 product:
   *                   id: "660e8400-e29b-41d4-a716-446655440001"
   *                   name: "MacBook Pro 16인치 M3 Pro"
   *                   description: "Apple의 최신 M3 Pro 칩을 탑재한 고성능 노트북"
   *                   price: "3299000.00"
   *                   discountPrice: "2999000.00"
   *                   sku: "MBP16-M3PRO-18-512"
   *                   brand: "Apple"
   *                   tags: ["노트북", "맥북", "M3", "고성능"]
   *                   category:
   *                     id: "550e8400-e29b-41d4-a716-446655440111"
   *                     name: "노트북"
   *                     slug: "노트북"
   *                   inventory:
   *                     availableQuantity: 45
   *                     status: "sufficient"
   *       400:
   *         description: 잘못된 상품 ID 형식
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: 상품을 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "상품을 찾을 수 없습니다"
   *               data: null
   */

  /**
   * GET /api/v1/products/:id - 상품 상세 조회
   */
  async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "상품 ID가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      // [수정] GetProductDetailUseCase.ts의 execute는 productId(string)를 직접 인자로 받습니다.
      const result = await this.getProductDetailUseCase.execute(req.params.id!);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 상세 정보를 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products:
   *   get:
   *     tags: [Products]
   *     summary: 상품 목록 조회
   *     description: |
   *       필터링, 검색, 정렬이 가능한 상품 목록을 조회합니다.
   *
   *       **주요 기능:**
   *       - 페이지네이션 지원
   *       - 브랜드별 필터링
   *       - 가격 범위 필터링
   *       - 카테고리별 필터링
   *       - 키워드 검색 (상품명, 설명, 태그)
   *       - 다양한 정렬 옵션
   *
   *       **검색 옵션:**
   *       - 상품명 검색
   *       - 브랜드명 검색
   *       - 태그 검색
   *       - 상품 설명 검색
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 페이지 번호
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: 한 페이지당 항목 수
   *         example: 10
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 카테고리 ID로 필터링
   *         example: "550e8400-e29b-41d4-a716-446655440111"
   *       - in: query
   *         name: brand
   *         schema:
   *           type: string
   *         description: 브랜드명으로 필터링
   *         example: "Apple"
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *           minimum: 0
   *         description: 최소 가격
   *         example: 1000000
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *           minimum: 0
   *         description: 최대 가격
   *         example: 5000000
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 검색어 (상품명, 설명, 태그 검색)
   *         example: "MacBook"
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, price, createdAt]
   *           default: createdAt
   *         description: 정렬 기준
   *         example: "price"
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: 정렬 순서
   *         example: "desc"
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *           default: true
   *         description: 활성화된 상품만 조회
   *     responses:
   *       200:
   *         description: 상품 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProductListResponse'
   *             examples:
   *               default:
   *                 summary: 기본 상품 목록
   *                 value:
   *                   success: true
   *                   message: "상품 목록을 성공적으로 조회했습니다"
   *                   data:
   *                     products:
   *                       - id: "660e8400-e29b-41d4-a716-446655440001"
   *                         name: "MacBook Pro 16인치 M3 Pro"
   *                         price: "3299000.00"
   *                         discountPrice: "2999000.00"
   *                         brand: "Apple"
   *                         category:
   *                           name: "노트북"
   *                         inventory:
   *                           availableQuantity: 45
   *                           status: "sufficient"
   *                       - id: "660e8400-e29b-41d4-a716-446655440003"
   *                         name: "iPhone 15 Pro Max"
   *                         price: "1550000.00"
   *                         brand: "Apple"
   *                         category:
   *                           name: "아이폰"
   *                         inventory:
   *                           availableQuantity: 95
   *                           status: "sufficient"
   *                     pagination:
   *                       currentPage: 1
   *                       totalPages: 1
   *                       totalItems: 9
   *                       hasNextPage: false
   *                       hasPreviousPage: false
   *                     filters: {}
   *               filtered:
   *                 summary: Apple 브랜드 필터링 결과
   *                 value:
   *                   success: true
   *                   message: "상품 목록을 성공적으로 조회했습니다"
   *                   data:
   *                     products:
   *                       - id: "660e8400-e29b-41d4-a716-446655440001"
   *                         name: "MacBook Pro 16인치 M3 Pro"
   *                         brand: "Apple"
   *                       - id: "660e8400-e29b-41d4-a716-446655440003"
   *                         name: "iPhone 15 Pro Max"
   *                         brand: "Apple"
   *                     pagination:
   *                       currentPage: 1
   *                       totalPages: 1
   *                       totalItems: 2
   *                       hasNextPage: false
   *                       hasPreviousPage: false
   *                     filters:
   *                       appliedBrand: "Apple"
   *       400:
   *         description: 잘못된 쿼리 파라미터
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "쿼리 파라미터가 올바르지 않습니다"
   *               errors:
   *                 - field: "page"
   *                   message: "페이지 번호는 1 이상이어야 합니다"
   *                 - field: "limit"
   *                   message: "한 페이지당 항목 수는 1-100 사이여야 합니다"
   */

  /**
   * GET /api/v1/products - 상품 목록 조회
   */
  async getProductList(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "쿼리 파라미터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const {
        page,
        limit,
        categoryId,
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy,
        sortOrder,
        isActive,
      } = req.query;

      // [수정] GetProductListUseCase.ts에 정의된 GetProductListRequest 타입에 맞게 객체를 구성합니다.
      const getRequest: GetProductListRequest = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      };

      // 일반 사용자용 엔드포인트: isActive 파라미터 값에 관계없이 항상 활성 상품만 조회
      console.log('[ProductController] 일반 사용자용 엔드포인트 - 무조건 활성 상품만 조회');
      getRequest.isActive = true; // 일반 사용자는 항상 활성 상품만 볼 수 있음

      if (categoryId) getRequest.categoryId = categoryId as string;
      // 프론트엔드에서 category 파라미터로 카테고리 이름을 전송하는 경우
      if (category && !categoryId) {
        console.log('카테고리 이름으로 검색:', category);
        // 다중 카테고리 처리: 쉼표로 구분된 문자열을 배열로 변환
        if (typeof category === 'string' && category.includes(',')) {
          const categoryNames = category.split(',').map(c => c.trim()).filter(c => c);
          getRequest.categoryNames = categoryNames;
        } else {
          getRequest.categoryName = category as string;
        }
      }
      if (brand) {
        // 다중 브랜드 필터링 지원 - 콤마로 구분된 문자열 또는 배열 처리
        if (Array.isArray(brand)) {
          getRequest.brand = brand as string[];
        } else {
          // 콤마로 구분된 문자열을 배열로 변환
          const brandString = brand as string;
          getRequest.brand = brandString.includes(',') 
            ? brandString.split(',').map(b => b.trim()).filter(Boolean)
            : [brandString];
        }
        console.log(`[ProductController] 브랜드 필터 처리: ${JSON.stringify(getRequest.brand)}`);
      }
      if (minPrice) getRequest.minPrice = parseFloat(minPrice as string);
      if (maxPrice) getRequest.maxPrice = parseFloat(maxPrice as string);
      if (search) getRequest.search = search as string;

      // [수정] 프론트엔드에서 이미 결합된 형태(예: 'price_asc', 'created_desc')로 전송되므로 직접 사용
      if (sortBy && typeof sortBy === "string") {
        // 유효한 정렬 옵션인지 확인
        const validSortOptions = [
          "price_asc", "price_desc", 
          "name_asc", "name_desc", 
          "created_asc", "created_desc"
        ];
        
        if (validSortOptions.includes(sortBy)) {
          getRequest.sortBy = sortBy as any;
        } else {
          // 기본값으로 최신순 설정
          getRequest.sortBy = "created_desc" as any;
        }
      }

      const result = await this.getProductListUseCase.execute(getRequest);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 목록을 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * GET /api/v1/products/admin - 관리자용 상품 목록 조회
   */
  async getAdminProductList(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "쿼리 파라미터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const {
        page,
        limit,
        categoryId,
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy,
        sortOrder,
        isActive,
      } = req.query;

      // 관리자용 요청 구성 - isActive 필터링 없이 모든 상품 조회
      const getRequest: GetProductListRequest = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        // isActive는 명시적으로 설정하지 않음 (undefined 상태 유지) -> 모든 상품 조회
      };

      console.log('[ProductController] 관리자 모드 - 모든 상품 조회 (isActive 필터링 없음)');

      // 나머지 필터 조건들은 동일하게 적용
      if (categoryId) getRequest.categoryId = categoryId as string;
      if (category && !categoryId) {
        console.log('카테고리 이름으로 검색:', category);
        if (typeof category === 'string' && category.includes(',')) {
          const categoryNames = category.split(',').map(c => c.trim()).filter(c => c);
          getRequest.categoryNames = categoryNames;
        } else {
          getRequest.categoryName = category as string;
        }
      }
      if (brand) {
        if (Array.isArray(brand)) {
          getRequest.brand = brand as string[];
        } else {
          const brandString = brand as string;
          getRequest.brand = brandString.includes(',') 
            ? brandString.split(',').map(b => b.trim()).filter(Boolean)
            : [brandString];
        }
        console.log(`[ProductController] 관리자 모드 - 브랜드 필터 처리: ${JSON.stringify(getRequest.brand)}`);
      }
      if (minPrice) getRequest.minPrice = parseFloat(minPrice as string);
      if (maxPrice) getRequest.maxPrice = parseFloat(maxPrice as string);
      if (search) getRequest.search = search as string;

      // 정렬 처리
      if (sortBy && typeof sortBy === "string") {
        const validSortOptions = [
          "price_asc", "price_desc", 
          "name_asc", "name_desc", 
          "created_asc", "created_desc"
        ];
        
        if (validSortOptions.includes(sortBy)) {
          getRequest.sortBy = sortBy as any;
        } else {
          getRequest.sortBy = "created_desc" as any;
        }
      }

      // 관리자가 명시적으로 isActive 필터를 요청한 경우에만 적용
      if (isActive !== undefined) {
        if (isActive === 'true') {
          getRequest.isActive = true;
        } else if (isActive === 'false') {
          getRequest.isActive = false;
        }
        console.log('[ProductController] 관리자 모드 - 명시적 isActive 필터:', getRequest.isActive);
      }

      const result = await this.getProductListUseCase.execute(getRequest);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "관리자용 상품 목록을 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  // ========================================
  // Product Review API Methods
  // ========================================

  /**
   * @swagger
   * /api/v1/products/{id}/reviews:
   *   get:
   *     tags: [Product Reviews]
   *     summary: 상품 리뷰 목록 조회
   *     description: 특정 상품의 리뷰 목록을 조회합니다.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 상품 ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 페이지 번호
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: 페이지당 리뷰 수
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [newest, oldest, rating_high, rating_low, helpful]
   *           default: newest
   *         description: 정렬 기준
   *     responses:
   *       200:
   *         description: 리뷰 목록 조회 성공
   */
  async getProductReviews(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const request: GetProductReviewsRequest = {
        productId: req.params.id!,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string || "newest",
      };

      const result = await this.getProductReviewsUseCase.execute(request);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 리뷰 목록을 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products/{id}/reviews:
   *   post:
   *     tags: [Product Reviews]
   *     summary: 상품 리뷰 작성
   *     description: 특정 상품에 대한 리뷰를 작성합니다.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 상품 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userName
   *               - rating
   *               - content
   *             properties:
   *               userName:
   *                 type: string
   *                 description: 사용자명
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 description: 평점 (1-5)
   *               content:
   *                 type: string
   *                 description: 리뷰 내용
   *               isVerifiedPurchase:
   *                 type: boolean
   *                 description: 구매 인증 여부
   *     responses:
   *       201:
   *         description: 리뷰 작성 성공
   */
  async createProductReview(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const request: CreateProductReviewRequest = {
        productId: req.params.id!,
        userName: req.body.userName,
        rating: req.body.rating,
        content: req.body.content,
        isVerifiedPurchase: req.body.isVerifiedPurchase || false,
      };

      const result = await this.createProductReviewUseCase.execute(request);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 리뷰가 성공적으로 작성되었습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(201).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  // ========================================
  // Product Q&A API Methods
  // ========================================

  /**
   * @swagger
   * /api/v1/products/{id}/qna:
   *   get:
   *     tags: [Product Q&A]
   *     summary: 상품 Q&A 목록 조회
   *     description: 특정 상품의 Q&A 목록을 조회합니다.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 상품 ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 페이지 번호
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: 페이지당 Q&A 수
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [newest, oldest, answered, unanswered]
   *           default: newest
   *         description: 정렬 기준
   *     responses:
   *       200:
   *         description: Q&A 목록 조회 성공
   */
  async getProductQnA(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const request: GetProductQnARequest = {
        productId: req.params.id!,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        includePrivate: false, // 일반 사용자는 공개 질문만 조회
        sortBy: req.query.sortBy as string || "newest",
        ...(req.query.onlyAnswered === 'true' ? { onlyAnswered: true } : {}),
      };

      const result = await this.getProductQnAUseCase.execute(request);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 Q&A 목록을 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products/{id}/qna:
   *   post:
   *     tags: [Product Q&A]
   *     summary: 상품 Q&A 작성
   *     description: 특정 상품에 대한 질문을 작성합니다.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 상품 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userName
   *               - question
   *             properties:
   *               userName:
   *                 type: string
   *                 description: 사용자명
   *               question:
   *                 type: string
   *                 description: 질문 내용
   *               isPublic:
   *                 type: boolean
   *                 default: true
   *                 description: 공개 질문 여부
   *     responses:
   *       201:
   *         description: 질문 작성 성공
   */
  async createProductQnA(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      // 인증된 사용자 정보 확인
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          message: "인증이 필요합니다",
          error: { code: "AUTHENTICATION_REQUIRED" },
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(401).json(response);
        return;
      }

      const request: CreateProductQnARequest = {
        productId: req.params.id!,
        question: req.body.question,
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
        // 인증된 사용자 정보 사용
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.body.userName, // 옵셔널 - 클라이언트에서 제공하면 사용, 아니면 이메일 사용
      };

      const result = await this.createProductQnAUseCase.execute(request);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 Q&A가 성공적으로 작성되었습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(201).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products/qna/{qnaId}/answer:
   *   post:
   *     tags: [Product Q&A]
   *     summary: Q&A 답변 작성 (관리자용)
   *     description: 상품 Q&A에 답변을 작성합니다.
   *     parameters:
   *       - in: path
   *         name: qnaId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Q&A ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - answer
   *               - answeredBy
   *             properties:
   *               answer:
   *                 type: string
   *                 description: 답변 내용
   *               answeredBy:
   *                 type: string
   *                 description: 답변자
   *     responses:
   *       200:
   *         description: 답변 작성 성공
   */
  async answerProductQnA(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const request: AnswerProductQnARequest = {
        qnaId: req.params.qnaId!,
        answer: req.body.answer,
        answeredBy: req.body.answeredBy,
      };

      const result = await this.answerProductQnAUseCase.execute(request);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "Q&A 답변이 성공적으로 작성되었습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * 에러 처리 - 도메인 에러를 HTTP 상태 코드로 변환
   */
  private handleError(
    res: Response,
    error: string | Error,
    requestId: string
  ): void {
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let message = "서버 내부 오류가 발생했습니다";

    if (error instanceof DomainError) {
      statusCode = error.statusCode;
      errorCode = error.code;
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    }

    // [수정] exactOptionalPropertyTypes 규칙을 준수하도록 error 객체를 구성합니다.
    const errorResponsePart: { code: string; details?: string } = {
      code: errorCode,
    };

    if (error instanceof Error && error.stack) {
      errorResponsePart.details = error.stack;
    }

    const response: ApiResponse<null> = {
      success: false,
      message,
      error: errorResponsePart,
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(statusCode).json(response);
  }

  /**
   * 예상치 못한 에러 처리
   */
  private handleUnexpectedError(
    res: Response,
    error: any,
    requestId: string
  ): void {
    console.error("[ProductController] 예상치 못한 에러:", {
      error: error?.message || error,
      stack: error?.stack,
      requestId,
      timestamp: new Date().toISOString(),
    });

    const errorResponsePart: { code: string; details?: string } = {
      code: "INTERNAL_ERROR",
    };

    if (process.env.NODE_ENV === "development" && error?.stack) {
      errorResponsePart.details = error.stack;
    }

    const response: ApiResponse<null> = {
      success: false,
      message: "서버 내부 오류가 발생했습니다",
      error: errorResponsePart,
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(500).json(response);
  }

  /**
   * 상품 활성화/비활성화 토글 (관리자 전용)
   */
  public async toggleProductStatus(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || "unknown";

    try {
      console.log("[ProductController] 상품 상태 토글 요청:", {
        productId: req.params.id,
        isActive: req.body.isActive,
        requestId,
        timestamp: new Date().toISOString(),
      });

      // 입력 검증
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array(),
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(400).json(response);
        return;
      }

      const toggleRequest: ToggleProductStatusRequest = {
        productId: req.params.id as string,
        isActive: req.body.isActive as boolean,
      };

      // UseCase 실행
      const result = await this.toggleProductStatusUseCase.execute(toggleRequest);

      if (result.isSuccess()) {
        const responseData = result.getValue();
        const response: ApiResponse<typeof responseData> = {
          success: true,
          message: responseData.message,
          data: responseData,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(200).json(response);
      } else {
        const error = result.getError();
        if (error instanceof DomainError) {
          const statusCode = error.statusCode || 400;
          const response: ApiResponse<null> = {
            success: false,
            message: error.message,
            data: null,
            timestamp: new Date().toISOString(),
            requestId,
          };
          res.status(statusCode).json(response);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("[ProductController] 상품 상태 토글 오류:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
        timestamp: new Date().toISOString(),
      });

      const response: ApiResponse<null> = {
        success: false,
        message: "상품 상태 변경 중 서버 오류가 발생했습니다",
        data: null,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(500).json(response);
    }
  }

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
  async updateInventory(req: Request, res: Response): Promise<void> {
    const requestId = (req as any).requestId || "unknown";

    try {
      const productId = req.params.productId;
      const { quantity, operation, reason, orderNumber } = req.body;

      console.log(`[ProductController] 재고 업데이트 요청 - 상품: ${productId}, 작업: ${operation}, 수량: ${quantity}`);

      // 입력 유효성 검증
      if (!productId) {
        const response: ApiResponse<null> = {
          success: false,
          message: "상품 ID가 필요합니다",
          error: {
            code: "INVALID_PRODUCT_ID"
          },
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(400).json(response);
        return;
      }

      const request: UpdateInventoryRequest = {
        productId,
        quantity: Number(quantity),
        operation,
        reason,
        orderNumber,
      };

      const result = await this.updateInventoryUseCase.execute(request);

      if (result.success) {
        const response: ApiResponse<UpdateInventoryResponse['data']> = {
          success: true,
          message: result.message || "재고가 성공적으로 업데이트되었습니다",
          data: result.data || null,
          timestamp: new Date().toISOString(),
          requestId,
        };

        res.status(200).json(response);
      } else {
        const statusCode = result.error?.includes('찾을 수 없습니다') ? 404 : 400;
        
        const response: ApiResponse<null> = {
          success: false,
          message: result.error || "재고 업데이트에 실패했습니다",
          error: {
            code: statusCode === 404 ? "PRODUCT_NOT_FOUND" : "INVENTORY_UPDATE_FAILED"
          },
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };

        res.status(statusCode).json(response);
      }

    } catch (error) {
      console.error("[ProductController] 재고 업데이트 API 오류:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
        timestamp: new Date().toISOString(),
      });

      this.handleUnexpectedError(res, error, requestId);
    }
  }

  /**
   * 상품 수정 (관리자 전용)
   */
  public async updateProduct(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || "unknown";

    try {
      // 디버깅 로그 추가
      console.log('[ProductController] updateProduct 시작:', {
        productId: req.params.id,
        contentType: req.get('Content-Type'),
        hasFiles: !!(req.files && (req.files as any[]).length > 0),
        bodyKeys: Object.keys(req.body || {}),
        bodyData: req.body,
        requestId
      });
      const { generateImageUrls, generateThumbnailUrl, deleteImageFiles } = await import("../../infrastructure/upload/imageUtils");

      // 기존 상품 정보 조회 (이미지 삭제를 위해)
      let existingProduct = null;
      try {
        const existingResult = await this.getProductDetailUseCase.execute(req.params.id as string);
        if (existingResult.success && existingResult.data) {
          existingProduct = existingResult.data;
          console.log('[ProductController] 기존 상품 정보 조회 성공:', {
            productId: existingProduct.id,
            hasImages: !!(existingProduct.image_urls && existingProduct.image_urls.length > 0),
            imageCount: existingProduct.image_urls?.length || 0
          });
        } else {
          console.log('[ProductController] 기존 상품 정보 조회 실패:', existingResult);
        }
      } catch (error) {
        console.error('[ProductController] 기존 상품 정보 조회 에러:', error);
        // 상품이 존재하지 않는 경우는 나중에 UseCase에서 처리
      }

      // Parse productData from form-data if it exists
      let productData: any = {};
      if (req.body.productData) {
        try {
          productData = JSON.parse(req.body.productData);
        } catch (parseError) {
          const response: ApiResponse<null> = {
            success: false,
            message: "상품 데이터 파싱 오류",
            data: null,
            timestamp: new Date().toISOString(),
            requestId,
          };
          res.status(400).json(response);
          return;
        }
      } else {
        // If no productData in form, use req.body directly (JSON request)
        productData = req.body;
      }

      // Handle uploaded images
      const files = req.files as Express.Multer.File[];
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let imageUrls: string[] = [];
      let thumbnailUrl: string | undefined;

      console.log('[ProductController] 이미지 처리 상황:', {
        hasFiles: !!(files && files.length > 0),
        fileCount: files?.length || 0,
        hasExistingProduct: !!existingProduct,
        existingImageCount: existingProduct?.image_urls?.length || 0
      });

      if (files && files.length > 0) {
        // 새로운 이미지가 업로드된 경우, 기존 이미지 파일들 삭제
        if (existingProduct && existingProduct.image_urls && existingProduct.image_urls.length > 0) {
          try {
            deleteImageFiles(existingProduct.image_urls);
          } catch (deleteError) {
            console.error('기존 이미지 삭제 실패:', deleteError);
            // 삭제 실패해도 업데이트는 계속 진행
          }
        }

        imageUrls = generateImageUrls(files, baseUrl);
        const thumbnailIndex = parseInt(req.body.thumbnailIndex) || 0;
        thumbnailUrl = generateThumbnailUrl(imageUrls, thumbnailIndex);
      } else if (existingProduct) {
        // 새로운 이미지가 없으면 기존 이미지 유지
        imageUrls = existingProduct.image_urls || [];
        thumbnailUrl = existingProduct.thumbnail_url;
        console.log('[ProductController] 기존 이미지 유지:', {
          imageUrls: imageUrls.length,
          thumbnailUrl: !!thumbnailUrl
        });
      } else {
        // 기존 상품이 없는 경우 (에러 상황)
        console.log('[ProductController] 기존 상품 정보 없음 - 빈 이미지로 설정');
        imageUrls = [];
        thumbnailUrl = undefined;
      }

      // 입력 검증
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[ProductController] Validation 에러:', {
          errors: errors.array(),
          productData,
          requestId
        });
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array(),
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(400).json(response);
        return;
      }

      // 요청 데이터 구성
      const updateRequest: UpdateProductRequest = {
        productId: req.params.id as string,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        discountPercent: productData.discountPercent,
        sku: productData.sku,
        brand: productData.brand,
        categoryId: productData.categoryId,
        tags: productData.tags,
        isActive: productData.isActive,
        stockQuantity: productData.stockQuantity,
        lowStockThreshold: productData.lowStockThreshold,
        dimensions: productData.dimensions,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        thumbnailUrl: thumbnailUrl,
      };

      console.log('[ProductController] UseCase 실행 요청:', {
        productId: updateRequest.productId,
        hasName: updateRequest.name !== undefined,
        hasDescription: updateRequest.description !== undefined,
        hasPrice: updateRequest.price !== undefined,
        hasStockQuantity: updateRequest.stockQuantity !== undefined,
        stockQuantityValue: updateRequest.stockQuantity,
        hasIsActive: updateRequest.isActive !== undefined,
        isActiveValue: updateRequest.isActive,
        requestId,
        updateRequestKeys: Object.keys(updateRequest).filter(key => (updateRequest as any)[key] !== undefined)
      });

      // UseCase 실행
      const result = await this.updateProductUseCase.execute(updateRequest);

      const response: ApiResponse<any> = {
        success: true,
        message: "상품을 성공적으로 수정했습니다",
        data: result.product,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("[ProductController] 상품 수정 오류:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          const response: ApiResponse<null> = {
            success: false,
            message: error.message,
            error: { code: 'PRODUCT_NOT_FOUND' },
            data: null,
            timestamp: new Date().toISOString(),
            requestId,
          };
          res.status(404).json(response);
          return;
        }

        if (error.message.includes('중복') || error.message.includes('이미 존재')) {
          const response: ApiResponse<null> = {
            success: false,
            message: error.message,
            error: { code: 'DUPLICATE_DATA' },
            data: null,
            timestamp: new Date().toISOString(),
            requestId,
          };
          res.status(409).json(response);
          return;
        }

        // 일반적인 비즈니스 에러
        const response: ApiResponse<null> = {
          success: false,
          message: error.message,
          error: { code: 'BUSINESS_ERROR' },
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(400).json(response);
        return;
      }

      this.handleUnexpectedError(res, error, requestId);
    }
  }

  /**
   * 상품 삭제 (관리자 전용)
   */
  public async deleteProduct(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || "unknown";

    try {
      console.log("[ProductController] 상품 삭제 요청:", {
        productId: req.params.id,
        requestId,
        timestamp: new Date().toISOString(),
      });

      // 입력 검증
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array(),
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(400).json(response);
        return;
      }

      // 요청 데이터 구성
      const deleteRequest: DeleteProductRequest = {
        productId: req.params.id as string,
      };

      // UseCase 실행
      const result = await this.deleteProductUseCase.execute(deleteRequest);

      const response: ApiResponse<null> = {
        success: true,
        message: "상품을 성공적으로 삭제했습니다",
        data: null,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("[ProductController] 상품 삭제 오류:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없습니다')) {
          const response: ApiResponse<null> = {
            success: false,
            message: error.message,
            error: { code: 'PRODUCT_NOT_FOUND' },
            data: null,
            timestamp: new Date().toISOString(),
            requestId,
          };
          res.status(404).json(response);
          return;
        }

        if (error.message.includes('삭제할 수 없습니다') || error.message.includes('진행 중인')) {
          const response: ApiResponse<null> = {
            success: false,
            message: error.message,
            error: { code: 'DELETE_CONFLICT' },
            data: null,
            timestamp: new Date().toISOString(),
            requestId,
          };
          res.status(409).json(response);
          return;
        }

        // 일반적인 비즈니스 에러
        const response: ApiResponse<null> = {
          success: false,
          message: error.message,
          error: { code: 'BUSINESS_ERROR' },
          data: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(400).json(response);
        return;
      }

      this.handleUnexpectedError(res, error, requestId);
    }
  }

  /**
   * 상품 통계 조회 (관리자 전용)
   */
  public async getProductStats(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || "unknown";

    try {
      console.log("[ProductController] 상품 통계 조회 요청:", {
        requestId,
        timestamp: new Date().toISOString(),
      });

      // 요청 데이터 구성
      const statsRequest: GetProductStatsRequest = {};

      // UseCase 실행
      const result = await this.getProductStatsUseCase.execute(statsRequest);

      const response: ApiResponse<any> = {
        success: true,
        message: "상품 통계 조회가 완료되었습니다",
        data: result,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("[ProductController] 상품 통계 조회 오류:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
        timestamp: new Date().toISOString(),
      });

      this.handleUnexpectedError(res, error, requestId);
    }
  }
}
