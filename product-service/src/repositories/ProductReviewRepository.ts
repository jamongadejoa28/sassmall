// ========================================
// ProductReview Repository Interface
// src/repositories/ProductReviewRepository.ts
// ========================================

import { ProductReview } from "../entities/ProductReview";

/**
 * ProductReview Repository 인터페이스
 * Clean Architecture의 Repository Pattern 구현
 */
export interface ProductReviewRepository {
  /**
   * 특정 상품의 리뷰 목록 조회
   * @param productId 상품 ID
   * @param page 페이지 번호 (1부터 시작)
   * @param limit 페이지당 항목 수
   * @param sortBy 정렬 기준 (newest, oldest, rating_high, rating_low, helpful)
   * @returns 리뷰 목록과 페이지네이션 정보
   */
  findByProductId(
    productId: string,
    page: number,
    limit: number,
    sortBy?: string
  ): Promise<{
    reviews: ProductReview[];
    totalCount: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }>;

  /**
   * 리뷰 ID로 단일 리뷰 조회
   * @param reviewId 리뷰 ID
   * @returns 리뷰 객체 또는 null
   */
  findById(reviewId: string): Promise<ProductReview | null>;

  /**
   * 새로운 리뷰 저장
   * @param review 리뷰 도메인 객체
   * @returns 저장된 리뷰 객체
   */
  save(review: ProductReview): Promise<ProductReview>;

  /**
   * 기존 리뷰 업데이트
   * @param review 업데이트할 리뷰 도메인 객체
   * @returns 업데이트된 리뷰 객체
   */
  update(review: ProductReview): Promise<ProductReview>;

  /**
   * 리뷰 삭제
   * @param reviewId 삭제할 리뷰 ID
   * @returns 삭제 성공 여부
   */
  delete(reviewId: string): Promise<boolean>;

  /**
   * 특정 상품의 리뷰 통계 조회
   * @param productId 상품 ID
   * @returns 리뷰 통계 정보
   */
  getStatsByProductId(productId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    verifiedPurchaseCount: number;
  }>;

  /**
   * 사용자별 리뷰 조회 (관리 목적)
   * @param userName 사용자명
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @returns 사용자의 리뷰 목록
   */
  findByUserName(
    userName: string,
    page: number,
    limit: number
  ): Promise<{
    reviews: ProductReview[];
    totalCount: number;
  }>;

  /**
   * 도움됨 카운트 증가
   * @param reviewId 리뷰 ID
   * @returns 업데이트 성공 여부
   */
  incrementHelpfulCount(reviewId: string): Promise<boolean>;
}