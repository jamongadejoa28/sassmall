// ========================================
// Get Category Detail UseCase - 비즈니스 로직 계층
// src/usecases/GetCategoryDetailUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { CategoryRepository } from "./types";
import { Category } from "../entities/Category";

/**
 * 카테고리 상세 조회 요청 데이터
 */
export interface GetCategoryDetailRequest {
  categoryId: string;
}

/**
 * 카테고리 상세 조회 응답 데이터
 */
export interface GetCategoryDetailResponse {
  category: Category;
}

/**
 * 카테고리 상세 조회 UseCase
 * 
 * 책임:
 * - 특정 카테고리 상세 정보 조회
 * - 카테고리 존재 여부 검증
 * - 비활성화된 카테고리 처리
 */
@injectable()
export class GetCategoryDetailUseCase {
  constructor(
    @inject(TYPES.CategoryRepository)
    private categoryRepository: CategoryRepository
  ) {}

  /**
   * 카테고리 상세 조회 실행
   */
  async execute(request: GetCategoryDetailRequest): Promise<GetCategoryDetailResponse> {
    try {
      console.log('[GetCategoryDetailUseCase] 카테고리 상세 조회 시작:', request.categoryId);

      // 카테고리 ID 유효성 검증
      if (!request.categoryId || request.categoryId.trim() === '') {
        throw new Error('카테고리 ID가 제공되지 않았습니다');
      }

      // Repository를 통해 카테고리 조회
      const category = await this.categoryRepository.findById(request.categoryId);

      if (!category) {
        throw new Error('요청한 카테고리를 찾을 수 없습니다');
      }

      console.log('[GetCategoryDetailUseCase] 카테고리 상세 조회 완료:', category.getName());

      return {
        category,
      };
    } catch (error) {
      console.error('[GetCategoryDetailUseCase] 카테고리 상세 조회 실패:', error);
      
      if (error instanceof Error && error.message.includes('찾을 수 없습니다')) {
        throw error; // 404 에러 유지
      }
      
      throw new Error(`카테고리 상세 조회에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
}