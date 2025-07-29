// ========================================
// Category Controller - Framework 계층
// src/frameworks/controllers/CategoryController.ts
// ========================================

import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../../infrastructure/di/types";
import { GetCategoryListUseCase } from "../../usecases/GetCategoryListUseCase";
import { GetCategoryDetailUseCase } from "../../usecases/GetCategoryDetailUseCase";
import { CreateCategoryUseCase } from "../../usecases/CreateCategoryUseCase";
import { UpdateCategoryUseCase } from "../../usecases/UpdateCategoryUseCase";
import { DeleteCategoryUseCase } from "../../usecases/DeleteCategoryUseCase";
import { ApiResponse } from "../../shared/types";
import { 
  GetCategoryListRequest,
  GetCategoryDetailRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  DeleteCategoryRequest
} from "../../shared/types/category";

/**
 * Category Controller - REST API 요청 처리
 *
 * 역할:
 * - HTTP 요청/응답 처리
 * - 파라미터 추출 및 변환
 * - UseCase 호출 및 결과 반환
 * - 에러 처리 및 적절한 HTTP 상태 코드 설정
 *
 * 의존성:
 * - CategoryListUseCase: 카테고리 목록 조회
 * - CategoryDetailUseCase: 카테고리 상세 조회
 * - CreateCategoryUseCase: 카테고리 생성
 * - UpdateCategoryUseCase: 카테고리 수정
 * - DeleteCategoryUseCase: 카테고리 삭제
 */
@injectable()
export class CategoryController {
  constructor(
    @inject(TYPES.GetCategoryListUseCase)
    private getCategoryListUseCase: GetCategoryListUseCase,
    @inject(TYPES.GetCategoryDetailUseCase)
    private getCategoryDetailUseCase: GetCategoryDetailUseCase,
    @inject(TYPES.CreateCategoryUseCase)
    private createCategoryUseCase: CreateCategoryUseCase,
    @inject(TYPES.UpdateCategoryUseCase)
    private updateCategoryUseCase: UpdateCategoryUseCase,
    @inject(TYPES.DeleteCategoryUseCase)
    private deleteCategoryUseCase: DeleteCategoryUseCase
  ) {}

  /**
   * GET /api/v1/categories - 카테고리 목록 조회
   */
  async getCategoryList(req: Request, res: Response): Promise<void> {
    try {
      const request: GetCategoryListRequest = {
        isActive: req.query.isActive === 'false' ? false : true,
        sortBy: req.query.sortBy as 'sort_order' | 'name' | 'createdAt' || 'sort_order',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'asc',
      };

      const result = await this.getCategoryListUseCase.execute(request);

      const response: ApiResponse<any> = {
        success: true,
        message: "카테고리 목록을 성공적으로 조회했습니다",
        data: result.categories,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[CategoryController] getCategoryList 오류:', error);

      const response: ApiResponse<null> = {
        success: false,
        message: error instanceof Error ? error.message : "카테고리 목록 조회 중 오류가 발생했습니다",
        error: {
          code: 'CATEGORY_LIST_ERROR',
          details: error instanceof Error ? error.stack : undefined,
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(500).json(response);
    }
  }

  /**
   * GET /api/v1/categories/:id - 카테고리 상세 조회
   */
  async getCategoryDetail(req: Request, res: Response): Promise<void> {
    try {
      const request: GetCategoryDetailRequest = {
        categoryId: req.params.id as string,
      };

      const result = await this.getCategoryDetailUseCase.execute(request);

      const response: ApiResponse<any> = {
        success: true,
        message: "카테고리를 성공적으로 조회했습니다",
        data: result.category,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[CategoryController] getCategoryDetail 오류:', error);

      const statusCode = error instanceof Error && error.message.includes('찾을 수 없음') ? 404 : 500;
      
      const response: ApiResponse<null> = {
        success: false,
        message: error instanceof Error ? error.message : "카테고리 조회 중 오류가 발생했습니다",
        error: {
          code: statusCode === 404 ? 'CATEGORY_NOT_FOUND' : 'CATEGORY_DETAIL_ERROR',
          details: error instanceof Error ? error.stack : undefined,
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * POST /api/v1/categories - 카테고리 생성
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateCategoryRequest = {
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
        sortOrder: req.body.sortOrder || 0,
        isActive: req.body.isActive !== false, // 기본값 true
      };

      const result = await this.createCategoryUseCase.execute(request);

      const response: ApiResponse<any> = {
        success: true,
        message: "카테고리를 성공적으로 생성했습니다",
        data: result.category,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('[CategoryController] createCategory 오류:', error);

      const statusCode = error instanceof Error && error.message.includes('중복') ? 409 : 400;

      const response: ApiResponse<null> = {
        success: false,
        message: error instanceof Error ? error.message : "카테고리 생성 중 오류가 발생했습니다",
        error: {
          code: statusCode === 409 ? 'CATEGORY_DUPLICATE' : 'CATEGORY_CREATE_ERROR',
          details: error instanceof Error ? error.stack : undefined,
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * PUT /api/v1/categories/:id - 카테고리 수정
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const request: UpdateCategoryRequest = {
        categoryId: req.params.id as string,
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
        sortOrder: req.body.sortOrder,
        isActive: req.body.isActive,
      };

      const result = await this.updateCategoryUseCase.execute(request);

      const response: ApiResponse<any> = {
        success: true,
        message: "카테고리를 성공적으로 수정했습니다",
        data: result.category,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[CategoryController] updateCategory 오류:', error);

      let statusCode = 400;
      let errorCode = 'CATEGORY_UPDATE_ERROR';

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없음')) {
          statusCode = 404;
          errorCode = 'CATEGORY_NOT_FOUND';
        } else if (error.message.includes('중복')) {
          statusCode = 409;
          errorCode = 'CATEGORY_DUPLICATE';
        }
      }

      const response: ApiResponse<null> = {
        success: false,
        message: error instanceof Error ? error.message : "카테고리 수정 중 오류가 발생했습니다",
        error: {
          code: errorCode,
          details: error instanceof Error ? error.stack : undefined,
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * DELETE /api/v1/categories/:id - 카테고리 삭제
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const request: DeleteCategoryRequest = {
        categoryId: req.params.id as string,
      };

      await this.deleteCategoryUseCase.execute(request);

      const response: ApiResponse<null> = {
        success: true,
        message: "카테고리를 성공적으로 삭제했습니다",
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[CategoryController] deleteCategory 오류:', error);

      let statusCode = 400;
      let errorCode = 'CATEGORY_DELETE_ERROR';

      if (error instanceof Error) {
        if (error.message.includes('찾을 수 없음')) {
          statusCode = 404;
          errorCode = 'CATEGORY_NOT_FOUND';
        } else if (error.message.includes('삭제할 수 없습니다') || error.message.includes('연결된 상품')) {
          statusCode = 409;
          errorCode = 'CATEGORY_HAS_PRODUCTS';
        }
      }

      const response: ApiResponse<null> = {
        success: false,
        message: error instanceof Error ? error.message : "카테고리 삭제 중 오류가 발생했습니다",
        error: {
          code: errorCode,
          details: error instanceof Error ? error.stack : undefined,
        },
        data: null,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };

      res.status(statusCode).json(response);
    }
  }
}