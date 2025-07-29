// ========================================
// CreateProductReview UseCase
// src/usecases/CreateProductReviewUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductReview, CreateProductReviewData } from "../entities/ProductReview";
import { ProductReviewRepository } from "../repositories/ProductReviewRepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { Result } from "../shared/types/Result";

/**
 * 상품평 생성 요청 DTO
 */
export interface CreateProductReviewRequest {
  productId: string;
  userName: string;
  rating: number;
  content: string;
  isVerifiedPurchase?: boolean;
}

/**
 * 상품평 생성 응답 DTO
 */
export interface CreateProductReviewResponse {
  review: {
    id: string;
    productId: string;
    userName: string;
    rating: number;
    content: string;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * CreateProductReview UseCase
 * 새로운 상품평을 생성하는 비즈니스 로직
 */
@injectable()
export class CreateProductReviewUseCase {
  constructor(
    @inject(TYPES.ProductReviewRepository)
    private readonly productReviewRepository: ProductReviewRepository,

    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository
  ) {}

  /**
   * 상품평 생성 실행
   */
  async execute(request: CreateProductReviewRequest): Promise<Result<CreateProductReviewResponse>> {
    try {
      // 1. 입력 데이터 기본 검증
      if (!request.productId || request.productId.trim().length === 0) {
        return Result.fail(new Error("상품 ID는 필수입니다."));
      }

      if (!request.userName || request.userName.trim().length === 0) {
        return Result.fail(new Error("사용자명은 필수입니다."));
      }

      // 2. 상품 존재 여부 확인
      const product = await this.productRepository.findById(request.productId);
      if (!product) {
        return Result.fail(new Error("상품을 찾을 수 없습니다."));
      }

      // 3. ProductReview 도메인 객체 생성 (도메인에서 상세 검증)
      const createData: CreateProductReviewData = {
        productId: request.productId,
        userName: request.userName,
        rating: request.rating,
        content: request.content,
        isVerifiedPurchase: request.isVerifiedPurchase || false,
      };

      let review: ProductReview;
      try {
        review = ProductReview.create(createData);
      } catch (domainError: any) {
        return Result.fail(new Error(domainError.message));
      }

      // 4. 리뷰 저장
      const savedReview = await this.productReviewRepository.save(review);

      // 5. 응답 데이터 구성
      const response: CreateProductReviewResponse = {
        review: {
          id: savedReview.getId(),
          productId: savedReview.getProductId(),
          userName: savedReview.getUserName(),
          rating: savedReview.getRating(),
          content: savedReview.getContent(),
          isVerifiedPurchase: savedReview.isVerified(),
          helpfulCount: savedReview.getHelpfulCount(),
          createdAt: savedReview.getCreatedAt(),
          updatedAt: savedReview.getUpdatedAt(),
        },
      };

      // 6. (향후) 도메인 이벤트 발행
      // await this.eventPublisher.publish(savedReview.getCreatedEvent());

      return Result.ok(response);
    } catch (error: any) {
      console.error("[CreateProductReviewUseCase] 실행 오류:", error);
      return Result.fail(new Error("상품평 생성 중 오류가 발생했습니다."));
    }
  }
}