// ========================================
// GetProductReviews UseCase
// src/usecases/GetProductReviewsUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductReviewRepository } from "../repositories/ProductReviewRepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { Result } from "../shared/types/Result";

/**
 * 상품평 조회 요청 DTO
 */
export interface GetProductReviewsRequest {
  productId: string;
  page?: number;
  limit?: number;
  sortBy?: string; // newest, oldest, rating_high, rating_low, helpful
}

/**
 * 상품평 조회 응답 DTO
 */
export interface GetProductReviewsResponse {
  reviews: Array<{
    id: string;
    userName: string;
    rating: number;
    content: string;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    isPositive: boolean;
    isDetailed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  statistics: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    verifiedPurchaseCount: number;
  };
}

/**
 * GetProductReviews UseCase
 * 특정 상품의 리뷰 목록을 조회하는 비즈니스 로직
 */
@injectable()
export class GetProductReviewsUseCase {
  constructor(
    @inject(TYPES.ProductReviewRepository)
    private readonly productReviewRepository: ProductReviewRepository,

    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository
  ) {}

  /**
   * 상품평 목록 조회 실행
   */
  async execute(request: GetProductReviewsRequest): Promise<Result<GetProductReviewsResponse>> {
    try {
      // 1. 입력 데이터 검증
      if (!request.productId || request.productId.trim().length === 0) {
        return Result.fail(new Error("상품 ID는 필수입니다."));
      }

      // 2. 상품 존재 여부 확인
      const product = await this.productRepository.findById(request.productId);
      if (!product) {
        return Result.fail(new Error("상품을 찾을 수 없습니다."));
      }

      // 3. 페이지네이션 설정
      const page = Math.max(1, request.page || 1);
      const limit = Math.min(50, Math.max(1, request.limit || 10));
      const sortBy = request.sortBy || "newest";

      // 4. 리뷰 목록 조회
      const reviewsResult = await this.productReviewRepository.findByProductId(
        request.productId,
        page,
        limit,
        sortBy
      );

      // 5. 리뷰 통계 조회
      const statistics = await this.productReviewRepository.getStatsByProductId(
        request.productId
      );

      // 6. 페이지네이션 정보 계산
      const totalPages = Math.ceil(reviewsResult.totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 7. 응답 데이터 구성
      const response: GetProductReviewsResponse = {
        reviews: reviewsResult.reviews.map(review => ({
          id: review.getId(),
          userName: review.getUserName(),
          rating: review.getRating(),
          content: review.getContent(),
          isVerifiedPurchase: review.isVerified(),
          helpfulCount: review.getHelpfulCount(),
          isPositive: review.isPositive(),
          isDetailed: review.isDetailedReview(),
          createdAt: review.getCreatedAt(),
          updatedAt: review.getUpdatedAt(),
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: reviewsResult.totalCount,
          hasNextPage,
          hasPreviousPage,
        },
        statistics: {
          totalReviews: statistics.totalReviews,
          averageRating: statistics.averageRating,
          ratingDistribution: statistics.ratingDistribution,
          verifiedPurchaseCount: statistics.verifiedPurchaseCount,
        },
      };

      return Result.ok(response);
    } catch (error: any) {
      console.error("[GetProductReviewsUseCase] 실행 오류:", error);
      return Result.fail(new Error("상품평 조회 중 오류가 발생했습니다."));
    }
  }
}