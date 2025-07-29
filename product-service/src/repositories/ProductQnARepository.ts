// ========================================
// ProductQnA Repository Interface
// src/repositories/ProductQnARepository.ts
// ========================================

import { ProductQnA } from "../entities/ProductQnA";

/**
 * ProductQnA Repository 인터페이스
 * Clean Architecture의 Repository Pattern 구현
 */
export interface ProductQnARepository {
  /**
   * 특정 상품의 Q&A 목록 조회
   * @param productId 상품 ID
   * @param page 페이지 번호 (1부터 시작)
   * @param limit 페이지당 항목 수
   * @param includePrivate 비공개 질문 포함 여부 (관리자용)
   * @param sortBy 정렬 기준 (newest, oldest, answered, unanswered)
   * @returns Q&A 목록과 페이지네이션 정보
   */
  findByProductId(
    productId: string,
    page: number,
    limit: number,
    includePrivate?: boolean,
    sortBy?: string,
    onlyAnswered?: boolean
  ): Promise<{
    qnas: ProductQnA[];
    totalCount: number;
    answeredCount: number;
    unansweredCount: number;
  }>;

  /**
   * Q&A ID로 단일 Q&A 조회
   * @param qnaId Q&A ID
   * @returns Q&A 객체 또는 null
   */
  findById(qnaId: string): Promise<ProductQnA | null>;

  /**
   * 새로운 Q&A 저장
   * @param qna Q&A 도메인 객체
   * @returns 저장된 Q&A 객체
   */
  save(qna: ProductQnA): Promise<ProductQnA>;

  /**
   * 기존 Q&A 업데이트
   * @param qna 업데이트할 Q&A 도메인 객체
   * @returns 업데이트된 Q&A 객체
   */
  update(qna: ProductQnA): Promise<ProductQnA>;

  /**
   * Q&A 삭제
   * @param qnaId 삭제할 Q&A ID
   * @returns 삭제 성공 여부
   */
  delete(qnaId: string): Promise<boolean>;

  /**
   * 특정 상품의 Q&A 통계 조회
   * @param productId 상품 ID
   * @returns Q&A 통계 정보
   */
  getStatsByProductId(productId: string): Promise<{
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    averageResponseTimeHours: number;
  }>;

  /**
   * 사용자별 Q&A 조회 (관리 목적)
   * @param userName 사용자명
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @returns 사용자의 Q&A 목록
   */
  findByUserName(
    userName: string,
    page: number,
    limit: number
  ): Promise<{
    qnas: ProductQnA[];
    totalCount: number;
  }>;

  /**
   * 미답변 질문 목록 조회 (관리자용)
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @param urgentOnly 긴급 질문만 조회 여부
   * @returns 미답변 질문 목록
   */
  findUnansweredQuestions(
    page: number,
    limit: number,
    urgentOnly?: boolean
  ): Promise<{
    qnas: ProductQnA[];
    totalCount: number;
  }>;

  /**
   * 답변 완료 처리
   * @param qnaId Q&A ID
   * @param answer 답변 내용
   * @param answeredBy 답변자
   * @returns 업데이트 성공 여부
   */
  markAsAnswered(
    qnaId: string,
    answer: string,
    answeredBy: string
  ): Promise<boolean>;
}