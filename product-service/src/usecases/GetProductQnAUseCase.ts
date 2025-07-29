// ========================================
// GetProductQnA UseCase
// src/usecases/GetProductQnAUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductQnARepository } from "../repositories/ProductQnARepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { Result } from "../shared/types/Result";

/**
 * 상품 Q&A 조회 요청 DTO
 */
export interface GetProductQnARequest {
  productId: string;
  page?: number;
  limit?: number;
  includePrivate?: boolean; // 관리자용
  sortBy?: string; // newest, oldest, answered, unanswered
  onlyAnswered?: boolean; // 답변된 것만 조회
}

/**
 * 상품 Q&A 조회 응답 DTO
 */
export interface GetProductQnAResponse {
  qnas: Array<{
    id: string;
    userName: string;
    question: string;
    answer?: string;
    isAnswered: boolean;
    answeredBy?: string;
    answeredAt?: Date;
    isPublic: boolean;
    responseTimeHours?: number;
    isUrgent: boolean;
    hasQualityAnswer: boolean;
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
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    averageResponseTimeHours: number;
  };
}

/**
 * GetProductQnA UseCase
 * 특정 상품의 Q&A 목록을 조회하는 비즈니스 로직
 */
@injectable()
export class GetProductQnAUseCase {
  constructor(
    @inject(TYPES.ProductQnARepository)
    private readonly productQnARepository: ProductQnARepository,

    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository
  ) {}

  /**
   * 상품 Q&A 목록 조회 실행
   */
  async execute(request: GetProductQnARequest): Promise<Result<GetProductQnAResponse>> {
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
      const includePrivate = request.includePrivate || false;
      const sortBy = request.sortBy || "newest";

      // 4. Q&A 목록 조회
      const qnaResult = await this.productQnARepository.findByProductId(
        request.productId,
        page,
        limit,
        includePrivate,
        sortBy,
        request.onlyAnswered
      );

      // 5. Q&A 통계 조회
      const statistics = await this.productQnARepository.getStatsByProductId(
        request.productId
      );

      // 6. 페이지네이션 정보 계산
      const totalPages = Math.ceil(qnaResult.totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 7. 응답 데이터 구성
      const response: GetProductQnAResponse = {
        qnas: qnaResult.qnas.map(qna => {
          const qnaData: any = {
            id: qna.getId(),
            userName: qna.getUserName(),
            question: qna.getQuestion(),
            isAnswered: qna.isQuestionAnswered(),
            isPublic: qna.isQuestionPublic(),
            responseTimeHours: qna.getResponseTimeInHours(),
            isUrgent: qna.isUrgent(),
            hasQualityAnswer: qna.hasQualityAnswer(),
            createdAt: qna.getCreatedAt(),
            updatedAt: qna.getUpdatedAt(),
          };

          // 선택적 필드는 값이 있을 때만 추가
          const answer = qna.getAnswer();
          if (answer !== undefined) qnaData.answer = answer;

          const answeredBy = qna.getAnsweredBy();
          if (answeredBy !== undefined) qnaData.answeredBy = answeredBy;

          const answeredAt = qna.getAnsweredAt();
          if (answeredAt !== undefined) qnaData.answeredAt = answeredAt;

          return qnaData;
        }),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: qnaResult.totalCount,
          hasNextPage,
          hasPreviousPage,
        },
        statistics: {
          totalQuestions: statistics.totalQuestions,
          answeredQuestions: statistics.answeredQuestions,
          unansweredQuestions: statistics.unansweredQuestions,
          averageResponseTimeHours: statistics.averageResponseTimeHours,
        },
      };

      return Result.ok(response);
    } catch (error: any) {
      console.error("[GetProductQnAUseCase] 실행 오류:", error);
      return Result.fail(new Error("상품 Q&A 조회 중 오류가 발생했습니다."));
    }
  }
}