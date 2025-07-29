// ========================================
// Category Entity - Domain 계층
// src/entities/Category.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * Category 생성 데이터 인터페이스
 */
export interface CreateCategoryData {
  name: string;
  description?: string;
  slug: string;
  sortOrder?: number;
}

/**
 * Category 복원 데이터 인터페이스
 */
export interface RestoreCategoryData {
  id: string;
  name: string;
  description?: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category 업데이트 데이터 인터페이스
 */
export interface UpdateCategoryData {
  name?: string;
  description?: string;
  sortOrder?: number;
}

/**
 * Category Entity - 단순화된 플랫 구조
 * 
 * 계층 구조 복잡성을 제거하고 핵심 기능에 집중
 */
export class Category {
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly SLUG_PATTERN = /^[a-zA-Z0-9\-]+$/;

  private constructor(
    private readonly id: string,
    private name: string,
    private description: string,
    private readonly slug: string,
    private sortOrder: number,
    private _isActive: boolean = true,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 새 카테고리 생성
   */
  static create(data: CreateCategoryData): Category {
    Category.validateCreateData(data);

    const now = new Date();
    return new Category(
      uuidv4(),
      data.name.trim(),
      data.description?.trim() || "",
      data.slug.trim().toLowerCase(),
      data.sortOrder || 0,
      true,
      now,
      now
    );
  }

  /**
   * 기존 카테고리 복원 (DB에서 로드)
   */
  static restore(data: RestoreCategoryData): Category {
    if (!data.id || !data.name || !data.slug) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new Category(
      data.id,
      data.name,
      data.description || "",
      data.slug,
      data.sortOrder,
      data.isActive,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증
  // ========================================

  private static validateCreateData(data: CreateCategoryData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("카테고리명은 필수입니다");
    }
    if (data.name.trim().length > Category.MAX_NAME_LENGTH) {
      throw new Error(`카테고리명은 ${Category.MAX_NAME_LENGTH}자를 초과할 수 없습니다`);
    }
    if (!data.slug || data.slug.trim().length === 0) {
      throw new Error("슬러그는 필수입니다");
    }
    if (!Category.SLUG_PATTERN.test(data.slug.trim())) {
      throw new Error("슬러그는 영문, 숫자, 하이픈만 허용됩니다");
    }
  }

  // ========================================
  // Getter 메서드
  // ========================================

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getSlug(): string {
    return this.slug;
  }

  getSortOrder(): number {
    return this.sortOrder;
  }

  isActive(): boolean {
    return this._isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ========================================
  // 상태 관리
  // ========================================

  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  updateDetails(data: UpdateCategoryData): void {
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("카테고리명은 필수입니다");
      }
      if (data.name.trim().length > Category.MAX_NAME_LENGTH) {
        throw new Error(`카테고리명은 ${Category.MAX_NAME_LENGTH}자를 초과할 수 없습니다`);
      }
      this.name = data.name.trim();
    }

    if (data.description !== undefined) {
      this.description = data.description.trim();
    }

    if (data.sortOrder !== undefined) {
      this.sortOrder = data.sortOrder;
    }

    this.updatedAt = new Date();
  }

  // ========================================
  // 검색 지원
  // ========================================

  matchesSearchQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const searchableText = [
      this.name.toLowerCase(),
      this.description.toLowerCase(),
      this.slug.toLowerCase(),
    ].join(" ");

    return searchableText.includes(lowerQuery);
  }

  // ========================================
  // 도메인 규칙
  // ========================================

  isDisplayable(): boolean {
    return this._isActive;
  }
}