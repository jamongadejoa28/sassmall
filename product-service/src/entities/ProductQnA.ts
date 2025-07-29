// ========================================
// ProductQnA Entity - Domain 계층
// src/entities/ProductQnA.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * ProductQnA 생성 데이터 인터페이스
 */
export interface CreateProductQnAData {
  productId: string;
  userName: string;
  question: string;
  isPublic?: boolean;
}

/**
 * ProductQnA 복원 데이터 인터페이스
 */
export interface RestoreProductQnAData extends CreateProductQnAData {
  id: string;
  answer?: string;
  isAnswered: boolean;
  answeredBy?: string;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductQnA 답변 데이터 인터페이스
 */
export interface AnswerProductQnAData {
  answer: string;
  answeredBy: string;
}

/**
 * ProductQnA Entity - 상품 문의 도메인 객체
 *
 * 책임:
 * 1. 상품 문의 정보 관리 (질문, 답변)
 * 2. 공개/비공개 설정 관리
 * 3. 답변 상태 관리
 * 4. 문의 유효성 검증
 */
export class ProductQnA {
  private constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly userName: string,
    private question: string,
    private answer: string | undefined,
    private isAnswered: boolean,
    private answeredBy: string | undefined,
    private answeredAt: Date | undefined,
    private isPublic: boolean,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 새로운 ProductQnA 생성
   */
  static create(data: CreateProductQnAData): ProductQnA {
    // 1. 입력 데이터 검증
    ProductQnA.validateCreateData(data);

    // 2. ProductQnA 인스턴스 생성
    const now = new Date();
    return new ProductQnA(
      uuidv4(),
      data.productId.trim(),
      data.userName.trim(),
      data.question.trim(),
      undefined, // 초기에는 답변 없음
      false, // 초기에는 미답변
      undefined, // 답변자 없음
      undefined, // 답변 시간 없음
      data.isPublic !== undefined ? data.isPublic : true, // 기본은 공개
      now,
      now
    );
  }

  /**
   * 기존 ProductQnA 복원 (DB에서 불러올 때)
   */
  static restore(data: RestoreProductQnAData): ProductQnA {
    // 기본 검증만 수행
    if (!data.id || !data.productId || !data.userName) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new ProductQnA(
      data.id,
      data.productId,
      data.userName,
      data.question,
      data.answer,
      data.isAnswered,
      data.answeredBy,
      data.answeredAt,
      data.isPublic !== undefined ? data.isPublic : true,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증 메서드
  // ========================================

  private static validateCreateData(data: CreateProductQnAData): void {
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

    // 질문 내용 검증
    if (!data.question || data.question.trim().length === 0) {
      throw new Error("질문 내용은 필수입니다");
    }
    if (data.question.trim().length > 1000) {
      throw new Error("질문 내용은 1000자를 초과할 수 없습니다");
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

  getQuestion(): string {
    return this.question;
  }

  getAnswer(): string | undefined {
    return this.answer;
  }

  isQuestionAnswered(): boolean {
    return this.isAnswered;
  }

  getAnsweredBy(): string | undefined {
    return this.answeredBy;
  }

  getAnsweredAt(): Date | undefined {
    return this.answeredAt;
  }

  isQuestionPublic(): boolean {
    return this.isPublic;
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
   * 질문에 답변하기
   */
  answerQuestion(data: AnswerProductQnAData): void {
    if (this.isAnswered) {
      throw new Error("이미 답변된 질문입니다");
    }

    if (!data.answer || data.answer.trim().length === 0) {
      throw new Error("답변 내용은 필수입니다");
    }
    if (data.answer.trim().length > 2000) {
      throw new Error("답변 내용은 2000자를 초과할 수 없습니다");
    }

    if (!data.answeredBy || data.answeredBy.trim().length === 0) {
      throw new Error("답변자 정보는 필수입니다");
    }

    this.answer = data.answer.trim();
    this.answeredBy = data.answeredBy.trim();
    this.answeredAt = new Date();
    this.isAnswered = true;
    this.updatedAt = new Date();
  }

  /**
   * 답변 수정하기
   */
  updateAnswer(newAnswer: string, updatedBy: string): void {
    if (!this.isAnswered) {
      throw new Error("답변되지 않은 질문입니다");
    }

    if (!newAnswer || newAnswer.trim().length === 0) {
      throw new Error("답변 내용은 필수입니다");
    }
    if (newAnswer.trim().length > 2000) {
      throw new Error("답변 내용은 2000자를 초과할 수 없습니다");
    }

    this.answer = newAnswer.trim();
    this.answeredBy = updatedBy.trim();
    this.updatedAt = new Date();
  }

  /**
   * 질문 수정하기 (답변 전에만 가능)
   */
  updateQuestion(newQuestion: string): void {
    if (this.isAnswered) {
      throw new Error("답변된 질문은 수정할 수 없습니다");
    }

    if (!newQuestion || newQuestion.trim().length === 0) {
      throw new Error("질문 내용은 필수입니다");
    }
    if (newQuestion.trim().length > 1000) {
      throw new Error("질문 내용은 1000자를 초과할 수 없습니다");
    }

    this.question = newQuestion.trim();
    this.updatedAt = new Date();
  }

  /**
   * 공개/비공개 설정 변경
   */
  setPublic(isPublic: boolean): void {
    this.isPublic = isPublic;
    this.updatedAt = new Date();
  }

  /**
   * 답변 삭제 (미답변 상태로 되돌리기)
   */
  removeAnswer(): void {
    if (!this.isAnswered) {
      throw new Error("답변되지 않은 질문입니다");
    }

    this.answer = undefined;
    this.answeredBy = undefined;
    this.answeredAt = undefined;
    this.isAnswered = false;
    this.updatedAt = new Date();
  }

  // ========================================
  // 도메인 규칙 메서드
  // ========================================

  /**
   * 답변 소요 시간 계산 (시간 단위)
   */
  getResponseTimeInHours(): number | null {
    if (!this.isAnswered || !this.answeredAt) {
      return null;
    }

    const diffMs = this.answeredAt.getTime() - this.createdAt.getTime();
    return Math.round(diffMs / (1000 * 60 * 60)); // 시간 단위로 반환
  }

  /**
   * 긴급 질문인지 확인 (24시간 이내 답변 필요)
   */
  isUrgent(): boolean {
    if (this.isAnswered) {
      return false;
    }

    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours >= 24; // 24시간 이상 답변 없으면 긴급
  }

  /**
   * 답변 품질이 좋은지 확인 (답변이 100자 이상)
   */
  hasQualityAnswer(): boolean {
    return this.isAnswered && this.answer !== undefined && this.answer.length >= 100;
  }

  // ========================================
  // 요약 정보 반환
  // ========================================

  /**
   * Q&A 요약 정보 반환
   */
  getSummary() {
    return {
      id: this.id,
      productId: this.productId,
      userName: this.userName,
      question: this.question,
      answer: this.answer,
      isAnswered: this.isAnswered,
      answeredBy: this.answeredBy,
      answeredAt: this.answeredAt,
      isPublic: this.isPublic,
      responseTimeHours: this.getResponseTimeInHours(),
      isUrgent: this.isUrgent(),
      hasQualityAnswer: this.hasQualityAnswer(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ========================================
  // 도메인 이벤트
  // ========================================

  /**
   * 질문 생성 이벤트
   */
  getQuestionCreatedEvent() {
    return {
      type: "ProductQuestionCreated",
      questionId: this.id,
      productId: this.productId,
      userName: this.userName,
      isPublic: this.isPublic,
      createdAt: this.createdAt,
    };
  }

  /**
   * 답변 완료 이벤트
   */
  getAnsweredEvent() {
    return {
      type: "ProductQuestionAnswered",
      questionId: this.id,
      productId: this.productId,
      answeredBy: this.answeredBy,
      responseTimeHours: this.getResponseTimeInHours(),
      answeredAt: this.answeredAt,
    };
  }
}