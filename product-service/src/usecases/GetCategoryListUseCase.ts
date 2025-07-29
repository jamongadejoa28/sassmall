// ========================================
// Get Category List UseCase - 비즈니스 로직 계층
// src/usecases/GetCategoryListUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { CategoryRepository } from "./types";
import { Category } from "../entities/Category";

/**
 * 카테고리 목록 조회 요청 데이터
 */
export interface GetCategoryListRequest {
  isActive?: boolean;
  sortBy?: 'sort_order' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 카테고리 목록 조회 응답 데이터
 */
export interface GetCategoryListResponse {
  categories: Category[];
  totalCount: number;
}

/**
 * 카테고리 목록 조회 UseCase
 * 
 * 책임:
 * - 카테고리 목록 조회 비즈니스 로직 처리
 * - 정렬 및 필터링 조건 적용
 * - 활성화 상태에 따른 필터링
 */
@injectable()
export class GetCategoryListUseCase {
  constructor(
    @inject(TYPES.CategoryRepository)
    private categoryRepository: CategoryRepository
  ) {}

  /**
   * 카테고리 목록 조회 실행
   */
  async execute(request: GetCategoryListRequest): Promise<GetCategoryListResponse> {
    try {
      console.log('[GetCategoryListUseCase] 카테고리 목록 조회 시작:', request);

      // 기본값 설정
      const isActive = request.isActive !== false; // undefined면 true
      const sortBy = request.sortBy || 'sort_order';
      const sortOrder = request.sortOrder || 'asc';

      // Repository를 통해 카테고리 목록 조회
      const categories = await this.categoryRepository.findMany({
        isActive,
        sortBy,
        sortOrder,
      });

      console.log(`[GetCategoryListUseCase] 카테고리 ${categories.length}개 조회 완료`);

      return {
        categories,
        totalCount: categories.length,
      };
    } catch (error) {
      console.error('[GetCategoryListUseCase] 카테고리 목록 조회 실패:', error);
      throw new Error(`카테고리 목록 조회에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
}