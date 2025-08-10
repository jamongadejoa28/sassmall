// ========================================
// Category Types - 공유 타입 정의
// src/shared/types/category.ts
// ========================================

/**
 * 카테고리 목록 조회 요청 타입
 */
export interface GetCategoryListRequest {
  isActive?: boolean;
  sortBy?: 'sort_order' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 카테고리 상세 조회 요청 타입
 */
export interface GetCategoryDetailRequest {
  categoryId: string;
}

/**
 * 카테고리 생성 요청 타입
 */
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * 카테고리 수정 요청 타입
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
 * 카테고리 삭제 요청 타입
 */
export interface DeleteCategoryRequest {
  categoryId: string;
}