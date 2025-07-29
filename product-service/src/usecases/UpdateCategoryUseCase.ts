// ========================================
// Update Category UseCase - 비즈니스 로직 계층
// src/usecases/UpdateCategoryUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { CategoryRepository } from "./types";
import { Category } from "../entities/Category";

/**
 * 카테고리 수정 요청 데이터
 */
export interface UpdateCategoryRequest {
  categoryId: string;
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * 카테고리 수정 응답 데이터
 */
export interface UpdateCategoryResponse {
  category: Category;
}

/**
 * 카테고리 수정 UseCase
 * 
 * 책임:
 * - 기존 카테고리 정보 수정 비즈니스 로직 처리
 * - 카테고리 존재 여부 검증
 * - 이름/슬러그 중복 검증 (변경 시)
 * - 부분 업데이트 지원
 */
@injectable()
export class UpdateCategoryUseCase {
  constructor(
    @inject(TYPES.CategoryRepository)
    private categoryRepository: CategoryRepository
  ) {}

  /**
   * 카테고리 수정 실행
   */
  async execute(request: UpdateCategoryRequest): Promise<UpdateCategoryResponse> {
    try {
      console.log('[UpdateCategoryUseCase] 카테고리 수정 시작:', request.categoryId);

      // 카테고리 ID 유효성 검증
      if (!request.categoryId || request.categoryId.trim() === '') {
        throw new Error('카테고리 ID가 제공되지 않았습니다');
      }

      // 기존 카테고리 조회
      const existingCategory = await this.categoryRepository.findById(request.categoryId);
      if (!existingCategory) {
        throw new Error('수정할 카테고리를 찾을 수 없습니다');
      }

      // 입력 데이터 검증
      this.validateRequest(request);

      // 이름 변경 시 중복 검증
      if (request.name !== undefined && request.name.trim() !== existingCategory.getName()) {
        await this.validateUniqueName(request.name.trim(), request.categoryId);
      }

      // 슬러그 변경 시 중복 검증
      if (request.slug !== undefined && request.slug !== existingCategory.getSlug()) {
        await this.validateUniqueSlug(request.slug, request.categoryId);
      }

      // 도메인 객체에 변경 사항 적용
      const updateData: any = {};
      let hasChanges = false;
      
      if (request.name !== undefined) {
        updateData.name = request.name;
        hasChanges = true;
      }
      if (request.description !== undefined) {
        updateData.description = request.description;
        hasChanges = true;
      }
      if (request.sortOrder !== undefined) {
        updateData.sortOrder = request.sortOrder;
        hasChanges = true;
      }
      
      if (hasChanges) {
        existingCategory.updateDetails(updateData);
      }

      // 활성 상태 변경
      if (request.isActive !== undefined) {
        if (request.isActive) {
          existingCategory.activate();
        } else {
          existingCategory.deactivate();
        }
      }

      // 변경사항이 없으면 기존 카테고리 반환
      if (!hasChanges && request.isActive === undefined) {
        console.log('[UpdateCategoryUseCase] 변경사항이 없어 기존 카테고리 반환');
        return { category: existingCategory };
      }

      // Repository를 통해 카테고리 수정
      const updatedCategory = await this.categoryRepository.update(existingCategory);

      console.log('[UpdateCategoryUseCase] 카테고리 수정 완료:', updatedCategory.getId());

      return {
        category: updatedCategory,
      };
    } catch (error) {
      console.error('[UpdateCategoryUseCase] 카테고리 수정 실패:', error);
      throw error; // 에러를 그대로 전파하여 Controller에서 적절한 HTTP 상태 코드 설정
    }
  }

  /**
   * 요청 데이터 유효성 검증
   */
  private validateRequest(request: UpdateCategoryRequest): void {
    if (request.name !== undefined) {
      if (request.name.trim() === '') {
        throw new Error('카테고리 이름은 공백일 수 없습니다');
      }

      if (request.name.trim().length < 2) {
        throw new Error('카테고리 이름은 최소 2자 이상이어야 합니다');
      }

      if (request.name.trim().length > 50) {
        throw new Error('카테고리 이름은 최대 50자까지 입력 가능합니다');
      }
    }

    if (request.description !== undefined && request.description.length > 500) {
      throw new Error('카테고리 설명은 최대 500자까지 입력 가능합니다');
    }

    if (request.sortOrder !== undefined && (request.sortOrder < 0 || request.sortOrder > 9999)) {
      throw new Error('정렬 순서는 0부터 9999까지 입력 가능합니다');
    }
  }

  /**
   * 카테고리 이름 중복 검증 (자기 자신 제외)
   */
  private async validateUniqueName(name: string, excludeCategoryId: string): Promise<void> {
    const existingCategory = await this.categoryRepository.findByName(name);
    if (existingCategory && existingCategory.getId() !== excludeCategoryId) {
      throw new Error('이미 존재하는 카테고리 이름입니다');
    }
  }

  /**
   * 슬러그 중복 검증 (자기 자신 제외)
   */
  private async validateUniqueSlug(slug: string, excludeCategoryId: string): Promise<void> {
    const existingCategory = await this.categoryRepository.findBySlug(slug);
    if (existingCategory && existingCategory.getId() !== excludeCategoryId) {
      throw new Error('이미 존재하는 카테고리 슬러그입니다');
    }
  }
}