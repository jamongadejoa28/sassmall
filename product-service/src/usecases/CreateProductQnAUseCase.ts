// ========================================
// CreateProductQnA UseCase
// src/usecases/CreateProductQnAUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductQnA, CreateProductQnAData } from "../entities/ProductQnA";
import { ProductQnARepository } from "../repositories/ProductQnARepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { Result } from "../shared/types/Result";

/**
 * 상품 Q&A 생성 요청 DTO
 */
export interface CreateProductQnARequest {
  productId: string;
  question: string;
  isPublic?: boolean;
  // 인증된 사용자 정보 (미들웨어에서 전달)
  userId: string;
  userEmail: string;
  userName?: string; // 옵셔널 (기본값으로 이메일 사용)
}

/**
 * 상품 Q&A 생성 응답 DTO
 */
export interface CreateProductQnAResponse {
  qna: {
    id: string;
    productId: string;
    userName: string;
    question: string;
    answer?: string;
    isAnswered: boolean;
    answeredBy?: string;
    answeredAt?: Date;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * CreateProductQnA UseCase
 * 새로운 상품 Q&A를 생성하는 비즈니스 로직
 */
@injectable()
export class CreateProductQnAUseCase {
  constructor(
    @inject(TYPES.ProductQnARepository)
    private readonly productQnARepository: ProductQnARepository,

    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository
  ) {}

  /**
   * 상품 Q&A 생성 실행
   */
  async execute(request: CreateProductQnARequest): Promise<Result<CreateProductQnAResponse>> {
    try {
      // 1. 입력 데이터 기본 검증
      if (!request.productId || request.productId.trim().length === 0) {
        return Result.fail(new Error("상품 ID는 필수입니다."));
      }

      if (!request.userId || request.userId.trim().length === 0) {
        return Result.fail(new Error("사용자 ID는 필수입니다."));
      }

      if (!request.userEmail || request.userEmail.trim().length === 0) {
        return Result.fail(new Error("사용자 이메일은 필수입니다."));
      }

      // 2. 상품 존재 여부 확인
      const product = await this.productRepository.findById(request.productId);
      if (!product) {
        return Result.fail(new Error("상품을 찾을 수 없습니다."));
      }

      // 3. ProductQnA 도메인 객체 생성 (도메인에서 상세 검증)
      const displayName = request.userName || request.userEmail; // 사용자명이 없으면 이메일 사용
      
      const createData: CreateProductQnAData = {
        productId: request.productId,
        userName: displayName,
        question: request.question,
        isPublic: request.isPublic !== undefined ? request.isPublic : true, // 기본값: 공개
      };

      let qna: ProductQnA;
      try {
        qna = ProductQnA.create(createData);
      } catch (domainError: any) {
        return Result.fail(domainError.message);
      }

      // 4. Q&A 저장
      const savedQnA = await this.productQnARepository.save(qna);

      // 5. 응답 데이터 구성
      const qnaData: any = {
        id: savedQnA.getId(),
        productId: savedQnA.getProductId(),
        userName: savedQnA.getUserName(),
        question: savedQnA.getQuestion(),
        isAnswered: savedQnA.isQuestionAnswered(),
        isPublic: savedQnA.isQuestionPublic(),
        createdAt: savedQnA.getCreatedAt(),
        updatedAt: savedQnA.getUpdatedAt(),
      };

      // 선택적 필드는 값이 있을 때만 추가
      const answer = savedQnA.getAnswer();
      if (answer !== undefined) qnaData.answer = answer;

      const answeredBy = savedQnA.getAnsweredBy();
      if (answeredBy !== undefined) qnaData.answeredBy = answeredBy;

      const answeredAt = savedQnA.getAnsweredAt();
      if (answeredAt !== undefined) qnaData.answeredAt = answeredAt;

      const response: CreateProductQnAResponse = {
        qna: qnaData,
      };

      // 6. (향후) 도메인 이벤트 발행
      // await this.eventPublisher.publish(savedQnA.getQuestionCreatedEvent());

      return Result.ok(response);
    } catch (error: any) {
      console.error("[CreateProductQnAUseCase] 실행 오류:", error);
      return Result.fail(new Error("상품 Q&A 생성 중 오류가 발생했습니다."));
    }
  }
}