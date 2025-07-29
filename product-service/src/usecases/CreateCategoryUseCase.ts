// ========================================
// Create Category UseCase - 비즈니스 로직 계층
// src/usecases/CreateCategoryUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { CategoryRepository } from "./types";
import { Category } from "../entities/Category";

/**
 * 카테고리 생성 요청 데이터
 */
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * 카테고리 생성 응답 데이터
 */
export interface CreateCategoryResponse {
  category: Category;
}

/**
 * 카테고리 생성 UseCase
 * 
 * 책임:
 * - 새로운 카테고리 생성 비즈니스 로직 처리
 * - 카테고리 이름 중복 검증
 * - 슬러그 자동 생성 (필요시)
 * - 기본값 설정
 */
@injectable()
export class CreateCategoryUseCase {
  constructor(
    @inject(TYPES.CategoryRepository)
    private categoryRepository: CategoryRepository
  ) {}

  /**
   * 카테고리 생성 실행
   */
  async execute(request: CreateCategoryRequest): Promise<CreateCategoryResponse> {
    try {
      console.log('[CreateCategoryUseCase] 카테고리 생성 시작:', request.name);

      // 입력 데이터 검증
      this.validateRequest(request);

      // 카테고리 이름 중복 검증
      await this.validateUniqueName(request.name);

      // 슬러그 생성 (제공되지 않은 경우)
      const slug = request.slug || this.generateSlug(request.name);

      // 슬러그 중복 검증
      await this.validateUniqueSlug(slug);

      // 카테고리 도메인 객체 생성
      const category = Category.create({
        name: request.name.trim(),
        slug,
        description: request.description?.trim() || '',
        sortOrder: request.sortOrder || 0,
      });

      // Repository를 통해 카테고리 저장
      const savedCategory = await this.categoryRepository.create(category);

      console.log('[CreateCategoryUseCase] 카테고리 생성 완료:', savedCategory.getId());

      return {
        category: savedCategory,
      };
    } catch (error) {
      console.error('[CreateCategoryUseCase] 카테고리 생성 실패:', error);
      throw error; // 에러를 그대로 전파하여 Controller에서 적절한 HTTP 상태 코드 설정
    }
  }

  /**
   * 요청 데이터 유효성 검증
   */
  private validateRequest(request: CreateCategoryRequest): void {
    if (!request.name || request.name.trim() === '') {
      throw new Error('카테고리 이름은 필수입니다');
    }

    if (request.name.trim().length < 2) {
      throw new Error('카테고리 이름은 최소 2자 이상이어야 합니다');
    }

    if (request.name.trim().length > 50) {
      throw new Error('카테고리 이름은 최대 50자까지 입력 가능합니다');
    }

    if (request.description && request.description.length > 500) {
      throw new Error('카테고리 설명은 최대 500자까지 입력 가능합니다');
    }

    if (request.sortOrder !== undefined && (request.sortOrder < 0 || request.sortOrder > 9999)) {
      throw new Error('정렬 순서는 0부터 9999까지 입력 가능합니다');
    }
  }

  /**
   * 카테고리 이름 중복 검증
   */
  private async validateUniqueName(name: string): Promise<void> {
    const existingCategory = await this.categoryRepository.findByName(name.trim());
    if (existingCategory) {
      throw new Error('이미 존재하는 카테고리 이름입니다');
    }
  }

  /**
   * 슬러그 중복 검증
   */
  private async validateUniqueSlug(slug: string): Promise<void> {
    const existingCategory = await this.categoryRepository.findBySlug(slug);
    if (existingCategory) {
      throw new Error('이미 존재하는 카테고리 슬러그입니다');
    }
  }

  /**
   * 카테고리 이름으로부터 슬러그 생성
   */
  private generateSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '') // 특수문자 제거
      .replace(/\s+/g, '-') // 공백을 하이픈으로 변경
      .replace(/-+/g, '-') // 연속된 하이픈 제거
      .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
  }
}