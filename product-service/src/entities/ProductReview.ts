// ========================================
// ProductReview Entity - Domain 계층
// src/entities/ProductReview.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * ProductReview 생성 데이터 인터페이스
 */
export interface CreateProductReviewData {
  productId: string;
  userName: string;
  rating: number;
  content: string;
  isVerifiedPurchase?: boolean;
}

/**
 * ProductReview 복원 데이터 인터페이스
 */
export interface RestoreProductReviewData extends CreateProductReviewData {
  id: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductReview 업데이트 데이터 인터페이스
 */
export interface UpdateProductReviewData {
  content?: string;
  rating?: number;
}

/**
 * ProductReview Entity - 상품평 도메인 객체
 *
 * 책임:
 * 1. 상품평 정보 관리 (평점, 내용, 작성자)
 * 2. 구매 인증 상태 관리
 * 3. 도움됨 카운트 관리
 * 4. 상품평 유효성 검증
 */
export class ProductReview {
  private constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly userName: string,
    private rating: number,
    private content: string,
    private isVerifiedPurchase: boolean,
    private helpfulCount: number = 0,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 새로운 ProductReview 생성
   */
  static create(data: CreateProductReviewData): ProductReview {
    // 1. 입력 데이터 검증
    ProductReview.validateCreateData(data);

    // 2. ProductReview 인스턴스 생성
    const now = new Date();
    return new ProductReview(
      uuidv4(),
      data.productId.trim(),
      data.userName.trim(),
      data.rating,
      data.content.trim(),
      data.isVerifiedPurchase || false,
      0, // 초기 도움됨 카운트
      now,
      now
    );
  }

  /**
   * 기존 ProductReview 복원 (DB에서 불러올 때)
   */
  static restore(data: RestoreProductReviewData): ProductReview {
    // 기본 검증만 수행
    if (!data.id || !data.productId || !data.userName) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new ProductReview(
      data.id,
      data.productId,
      data.userName,
      data.rating,
      data.content,
      data.isVerifiedPurchase || false,
      data.helpfulCount,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증 메서드
  // ========================================

  private static validateCreateData(data: CreateProductReviewData): void {
    // 상품 ID 검증
    if (!data.productId || data.productId.trim().length === 0) {
      throw new Error("상품 ID는 필수입니다");
    }

    // 사용자명 검증
    if (!data.userName || data.userName.trim().length === 0) {
      throw new Error("사용자명은 필수입니다");
    }
    if (data.userName.trim().length > 100) {
      throw new Error("사용자명은 100자를 초과할 수 없습니다");
    }

    // 평점 검증
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
      throw new Error("평점은 1-5 사이의 정수여야 합니다");
    }

    // 내용 검증
    if (!data.content || data.content.trim().length === 0) {
      throw new Error("리뷰 내용은 필수입니다");
    }
    if (data.content.trim().length > 2000) {
      throw new Error("리뷰 내용은 2000자를 초과할 수 없습니다");
    }
  }

  // ========================================
  // Getter 메서드
  // ========================================

  getId(): string {
    return this.id;
  }

  getProductId(): string {
    return this.productId;
  }

  getUserName(): string {
    return this.userName;
  }

  getRating(): number {
    return this.rating;
  }

  getContent(): string {
    return this.content;
  }

  isVerified(): boolean {
    return this.isVerifiedPurchase;
  }

  getHelpfulCount(): number {
    return this.helpfulCount;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ========================================
  // 비즈니스 로직 메서드
  // ========================================

  /**
   * 리뷰 내용 수정
   */
  updateContent(newContent: string): void {
    if (!newContent || newContent.trim().length === 0) {
      throw new Error("리뷰 내용은 필수입니다");
    }
    if (newContent.trim().length > 2000) {
      throw new Error("리뷰 내용은 2000자를 초과할 수 없습니다");
    }

    this.content = newContent.trim();
    this.updatedAt = new Date();
  }

  /**
   * 평점 수정
   */
  updateRating(newRating: number): void {
    if (!Number.isInteger(newRating) || newRating < 1 || newRating > 5) {
      throw new Error("평점은 1-5 사이의 정수여야 합니다");
    }

    this.rating = newRating;
    this.updatedAt = new Date();
  }

  /**
   * 도움됨 카운트 증가
   */
  incrementHelpfulCount(): void {
    this.helpfulCount += 1;
    this.updatedAt = new Date();
  }

  /**
   * 구매 인증 설정
   */
  setVerifiedPurchase(isVerified: boolean): void {
    this.isVerifiedPurchase = isVerified;
    this.updatedAt = new Date();
  }

  /**
   * 리뷰가 긍정적인지 확인 (4점 이상)
   */
  isPositive(): boolean {
    return this.rating >= 4;
  }

  /**
   * 리뷰가 부정적인지 확인 (2점 이하)
   */
  isNegative(): boolean {
    return this.rating <= 2;
  }

  /**
   * 상세 리뷰인지 확인 (100자 이상)
   */
  isDetailedReview(): boolean {
    return this.content.length >= 100;
  }

  // ========================================
  // 요약 정보 반환
  // ========================================

  /**
   * 리뷰 요약 정보 반환
   */
  getSummary() {
    return {
      id: this.id,
      productId: this.productId,
      userName: this.userName,
      rating: this.rating,
      content: this.content,
      isVerifiedPurchase: this.isVerifiedPurchase,
      helpfulCount: this.helpfulCount,
      isPositive: this.isPositive(),
      isDetailed: this.isDetailedReview(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ========================================
  // 도메인 이벤트
  // ========================================

  /**
   * 리뷰 생성 이벤트
   */
  getCreatedEvent() {
    return {
      type: "ProductReviewCreated",
      reviewId: this.id,
      productId: this.productId,
      userName: this.userName,
      rating: this.rating,
      isVerifiedPurchase: this.isVerifiedPurchase,
      createdAt: this.createdAt,
    };
  }

  /**
   * 리뷰 수정 이벤트
   */
  getUpdatedEvent() {
    return {
      type: "ProductReviewUpdated",
      reviewId: this.id,
      productId: this.productId,
      rating: this.rating,
      updatedAt: this.updatedAt,
    };
  }
}