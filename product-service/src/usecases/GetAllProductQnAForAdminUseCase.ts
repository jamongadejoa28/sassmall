// ========================================
// GetAllProductQnAForAdmin UseCase
// src/usecases/GetAllProductQnAForAdminUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductQnARepository, AdminQnASearchOptions, AdminQnAStatistics, ProductQnAWithProduct } from "../repositories/ProductQnARepository";
import { Result } from "../shared/types/Result";

/**
 * 관리자용 전체 Q&A 조회 요청 DTO
 */
export interface GetAllProductQnAForAdminRequest {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined; // 상품명, 질문 내용, 사용자명에서 검색
  status?: 'all' | 'answered' | 'unanswered'; // 답변 상태 필터
  sortBy?: 'newest' | 'oldest' | 'urgent' | 'responseTime'; // 정렬 기준
  productId?: string | undefined; // 특정 상품 필터
}

/**
 * 관리자용 전체 Q&A 조회 응답 DTO
 */
export interface GetAllProductQnAForAdminResponse {
  qnas: Array<{
    id: string;
    productId: string;
    productName: string;
    userName: string;
    question: string;
    answer?: string | undefined;
    isAnswered: boolean;
    answeredBy?: string | undefined;
    answeredAt?: Date | undefined;
    isPublic: boolean;
    responseTimeHours?: number | undefined;
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
    urgentQuestions: number;
    todayQuestions: number;
    qualityAnswers: number;
  };
}

/**
 * GetAllProductQnAForAdmin UseCase
 * 관리자용 전체 Q&A 목록 조회 비즈니스 로직
 */
@injectable()
export class GetAllProductQnAForAdminUseCase {
  constructor(
    @inject(TYPES.ProductQnARepository)
    private readonly productQnARepository: ProductQnARepository
  ) {}

  /**
   * 관리자용 전체 Q&A 목록 조회 실행
   */
  async execute(request: GetAllProductQnAForAdminRequest): Promise<Result<GetAllProductQnAForAdminResponse>> {
    try {
      // 1. 입력 데이터 검증 및 기본값 설정
      const page = Math.max(1, request.page || 1);
      const limit = Math.min(100, Math.max(1, request.limit || 20));

      if (page < 1) {
        return Result.fail(new Error("페이지 번호는 1 이상이어야 합니다."));
      }

      if (limit < 1 || limit > 100) {
        return Result.fail(new Error("페이지당 항목 수는 1-100 사이여야 합니다."));
      }

      // 2. 검색 옵션 구성
      const searchOptions: AdminQnASearchOptions = {
        page,
        limit,
        search: request.search?.trim() || undefined,
        status: request.status || 'all',
        sortBy: request.sortBy || 'newest',
        productId: request.productId?.trim() || undefined,
      };

      // 3. Q&A 목록과 통계를 병렬로 조회
      const [qnaResult, statistics] = await Promise.all([
        this.productQnARepository.findAllForAdmin(searchOptions),
        this.productQnARepository.getAllStats()
      ]);

      // 4. 페이지네이션 정보 계산
      const totalPages = Math.ceil(qnaResult.totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 5. 응답 데이터 구성
      const response: GetAllProductQnAForAdminResponse = {
        qnas: qnaResult.qnas.map(qna => ({
          id: qna.id,
          productId: qna.productId,
          productName: qna.productName,
          userName: qna.userName,
          question: qna.question,
          answer: qna.answer,
          isAnswered: qna.isAnswered,
          answeredBy: qna.answeredBy,
          answeredAt: qna.answeredAt,
          isPublic: qna.isPublic,
          responseTimeHours: qna.responseTimeHours,
          isUrgent: qna.isUrgent,
          hasQualityAnswer: qna.hasQualityAnswer,
          createdAt: qna.createdAt,
          updatedAt: qna.updatedAt,
        })),
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
          urgentQuestions: statistics.urgentQuestions,
          todayQuestions: statistics.todayQuestions,
          qualityAnswers: statistics.qualityAnswers,
        },
      };

      return Result.ok(response);
    } catch (error: any) {
      console.error("[GetAllProductQnAForAdminUseCase] 실행 오류:", error);
      return Result.fail(new Error("관리자 Q&A 목록 조회 중 오류가 발생했습니다."));
    }
  }
}