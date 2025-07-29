// ========================================
// AnswerProductQnA UseCase
// src/usecases/AnswerProductQnAUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductQnARepository } from "../repositories/ProductQnARepository";
import { AnswerProductQnAData } from "../entities/ProductQnA";
import { Result } from "../shared/types/Result";

/**
 * 상품 Q&A 답변 요청 DTO
 */
export interface AnswerProductQnARequest {
  qnaId: string;
  answer: string;
  answeredBy: string;
}

/**
 * 상품 Q&A 답변 응답 DTO
 */
export interface AnswerProductQnAResponse {
  qna: {
    id: string;
    productId: string;
    userName: string;
    question: string;
    answer: string;
    isAnswered: boolean;
    answeredBy: string;
    answeredAt: Date;
    isPublic: boolean;
    responseTimeHours: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * AnswerProductQnA UseCase
 * 상품 Q&A에 답변을 작성하는 비즈니스 로직
 */
@injectable()
export class AnswerProductQnAUseCase {
  constructor(
    @inject(TYPES.ProductQnARepository)
    private readonly productQnARepository: ProductQnARepository
  ) {}

  /**
   * 상품 Q&A 답변 작성 실행
   */
  async execute(request: AnswerProductQnARequest): Promise<Result<AnswerProductQnAResponse>> {
    try {
      // 1. 입력 데이터 기본 검증
      if (!request.qnaId || request.qnaId.trim().length === 0) {
        return Result.fail(new Error("Q&A ID는 필수입니다."));
      }

      if (!request.answer || request.answer.trim().length === 0) {
        return Result.fail(new Error("답변 내용은 필수입니다."));
      }

      if (!request.answeredBy || request.answeredBy.trim().length === 0) {
        return Result.fail(new Error("답변자 정보는 필수입니다."));
      }

      // 2. Q&A 존재 여부 확인
      const qna = await this.productQnARepository.findById(request.qnaId);
      if (!qna) {
        return Result.fail(new Error("Q&A를 찾을 수 없습니다."));
      }

      // 3. 도메인 로직을 통한 답변 처리 (도메인에서 검증)
      const answerData: AnswerProductQnAData = {
        answer: request.answer,
        answeredBy: request.answeredBy,
      };

      try {
        qna.answerQuestion(answerData);
      } catch (domainError: any) {
        return Result.fail(domainError.message);
      }

      // 4. 변경사항 저장
      const updatedQnA = await this.productQnARepository.update(qna);

      // 5. 응답 데이터 구성
      const response: AnswerProductQnAResponse = {
        qna: {
          id: updatedQnA.getId(),
          productId: updatedQnA.getProductId(),
          userName: updatedQnA.getUserName(),
          question: updatedQnA.getQuestion(),
          answer: updatedQnA.getAnswer()!,
          isAnswered: updatedQnA.isQuestionAnswered(),
          answeredBy: updatedQnA.getAnsweredBy()!,
          answeredAt: updatedQnA.getAnsweredAt()!,
          isPublic: updatedQnA.isQuestionPublic(),
          responseTimeHours: updatedQnA.getResponseTimeInHours(),
          createdAt: updatedQnA.getCreatedAt(),
          updatedAt: updatedQnA.getUpdatedAt(),
        },
      };

      // 6. (향후) 도메인 이벤트 발행
      // await this.eventPublisher.publish(updatedQnA.getAnsweredEvent());

      return Result.ok(response);
    } catch (error: any) {
      console.error("[AnswerProductQnAUseCase] 실행 오류:", error);
      return Result.fail(new Error("Q&A 답변 처리 중 오류가 발생했습니다."));
    }
  }
}