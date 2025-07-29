// ========================================
// ProductQnA Repository Implementation
// src/adapters/ProductQnARepositoryImpl.ts
// ========================================

import { injectable, inject } from "inversify";
import { Repository, DataSource } from "typeorm";
import { ProductQnA } from "../entities/ProductQnA";
import { ProductQnARepository } from "../repositories/ProductQnARepository";
import { ProductQnAEntity } from "./entities/ProductQnAEntity";
import { TYPES } from "../infrastructure/di/types";

/**
 * ProductQnA Repository 구현체 (TypeORM 사용)
 */
@injectable()
export class ProductQnARepositoryImpl implements ProductQnARepository {
  private repository: Repository<ProductQnAEntity>;

  constructor(
    @inject(TYPES.DataSource) private dataSource: DataSource
  ) {
    this.repository = this.dataSource.getRepository(ProductQnAEntity);
  }

  /**
   * 특정 상품의 Q&A 목록 조회
   */
  async findByProductId(
    productId: string,
    page: number = 1,
    limit: number = 10,
    includePrivate: boolean = false,
    sortBy: string = "newest",
    onlyAnswered?: boolean
  ): Promise<{
    qnas: ProductQnA[];
    totalCount: number;
    answeredCount: number;
    unansweredCount: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      // 정렬 조건 설정
      let orderBy: { [key: string]: "ASC" | "DESC" } = { created_at: "DESC" };
      switch (sortBy) {
        case "oldest":
          orderBy = { created_at: "ASC" };
          break;
        case "answered":
          orderBy = { is_answered: "DESC", answered_at: "DESC" };
          break;
        case "unanswered":
          orderBy = { is_answered: "ASC", created_at: "DESC" };
          break;
        default:
          orderBy = { created_at: "DESC" };
      }

      // 기본 조건 (공개/비공개)
      const whereCondition: any = { product_id: productId };
      if (!includePrivate) {
        whereCondition.is_public = true;
      }
      
      // 답변 상태 필터링
      if (onlyAnswered !== undefined) {
        whereCondition.is_answered = onlyAnswered;
      }

      // Q&A 목록 조회
      const [entities, totalCount] = await this.repository.findAndCount({
        where: whereCondition,
        order: orderBy,
        skip: offset,
        take: limit,
      });

      // 답변/미답변 개수 계산
      const answeredCount = await this.repository.count({
        where: { ...whereCondition, is_answered: true },
      });
      const unansweredCount = totalCount - answeredCount;

      // Entity를 Domain 객체로 변환
      const qnas = entities.map(entity => this.toDomain(entity));

      return {
        qnas,
        totalCount,
        answeredCount,
        unansweredCount,
      };
    } catch (error) {
      console.error("[ProductQnARepository] findByProductId 오류:", error);
      throw new Error("Q&A 목록 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * Q&A ID로 단일 Q&A 조회
   */
  async findById(qnaId: string): Promise<ProductQnA | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id: qnaId },
      });

      return entity ? this.toDomain(entity) : null;
    } catch (error) {
      console.error("[ProductQnARepository] findById 오류:", error);
      throw new Error("Q&A 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 새로운 Q&A 저장
   */
  async save(qna: ProductQnA): Promise<ProductQnA> {
    try {
      const entity = this.toEntity(qna);
      const savedEntity = await this.repository.save(entity);
      return this.toDomain(savedEntity);
    } catch (error) {
      console.error("[ProductQnARepository] save 오류:", error);
      throw new Error("Q&A 저장 중 오류가 발생했습니다.");
    }
  }

  /**
   * 기존 Q&A 업데이트
   */
  async update(qna: ProductQnA): Promise<ProductQnA> {
    try {
      const entity = this.toEntity(qna);
      await this.repository.save(entity);
      return qna;
    } catch (error) {
      console.error("[ProductQnARepository] update 오류:", error);
      throw new Error("Q&A 업데이트 중 오류가 발생했습니다.");
    }
  }

  /**
   * Q&A 삭제
   */
  async delete(qnaId: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(qnaId);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error("[ProductQnARepository] delete 오류:", error);
      throw new Error("Q&A 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 특정 상품의 Q&A 통계 조회
   */
  async getStatsByProductId(productId: string): Promise<{
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    averageResponseTimeHours: number;
  }> {
    try {
      // 총 질문 수
      const totalQuestions = await this.repository.count({
        where: { product_id: productId },
      });

      // 답변된 질문 수
      const answeredQuestions = await this.repository.count({
        where: { product_id: productId, is_answered: true },
      });

      const unansweredQuestions = totalQuestions - answeredQuestions;

      // 평균 응답 시간 계산
      const responseTimeResult = await this.repository
        .createQueryBuilder("qna")
        .select("AVG(EXTRACT(EPOCH FROM (qna.answered_at - qna.created_at))/3600)", "avgHours")
        .where("qna.product_id = :productId", { productId })
        .andWhere("qna.is_answered = true")
        .andWhere("qna.answered_at IS NOT NULL")
        .getRawOne();

      const averageResponseTimeHours = parseFloat(responseTimeResult?.avgHours || "0");

      return {
        totalQuestions,
        answeredQuestions,
        unansweredQuestions,
        averageResponseTimeHours: Math.round(averageResponseTimeHours * 10) / 10,
      };
    } catch (error) {
      console.error("[ProductQnARepository] getStatsByProductId 오류:", error);
      throw new Error("Q&A 통계 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자별 Q&A 조회
   */
  async findByUserName(
    userName: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    qnas: ProductQnA[];
    totalCount: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const [entities, totalCount] = await this.repository.findAndCount({
        where: { user_name: userName },
        order: { created_at: "DESC" },
        skip: offset,
        take: limit,
      });

      const qnas = entities.map(entity => this.toDomain(entity));

      return { qnas, totalCount };
    } catch (error) {
      console.error("[ProductQnARepository] findByUserName 오류:", error);
      throw new Error("사용자 Q&A 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 미답변 질문 목록 조회
   */
  async findUnansweredQuestions(
    page: number = 1,
    limit: number = 10,
    urgentOnly: boolean = false
  ): Promise<{
    qnas: ProductQnA[];
    totalCount: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      let queryBuilder = this.repository
        .createQueryBuilder("qna")
        .where("qna.is_answered = false");

      if (urgentOnly) {
        // 24시간 이상 답변 없는 질문을 긴급으로 분류
        queryBuilder = queryBuilder.andWhere(
          "qna.created_at <= :urgentThreshold",
          { urgentThreshold: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        );
      }

      const [entities, totalCount] = await queryBuilder
        .orderBy("qna.created_at", "ASC") // 오래된 질문부터
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      const qnas = entities.map(entity => this.toDomain(entity));

      return { qnas, totalCount };
    } catch (error) {
      console.error("[ProductQnARepository] findUnansweredQuestions 오류:", error);
      throw new Error("미답변 질문 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 답변 완료 처리
   */
  async markAsAnswered(
    qnaId: string,
    answer: string,
    answeredBy: string
  ): Promise<boolean> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(ProductQnAEntity)
        .set({
          answer: answer,
          answered_by: answeredBy,
          answered_at: new Date(),
          is_answered: true,
          updated_at: new Date(),
        })
        .where("id = :qnaId", { qnaId })
        .execute();

      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error("[ProductQnARepository] markAsAnswered 오류:", error);
      throw new Error("답변 처리 중 오류가 발생했습니다.");
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Domain 객체를 Entity로 변환
   */
  private toEntity(qna: ProductQnA): ProductQnAEntity {
    const entity = new ProductQnAEntity();
    entity.id = qna.getId();
    entity.product_id = qna.getProductId();
    entity.user_name = qna.getUserName();
    entity.question = qna.getQuestion();
    const answer = qna.getAnswer();
    entity.answer = answer !== undefined ? answer : undefined;
    entity.is_answered = qna.isQuestionAnswered();
    const answeredBy = qna.getAnsweredBy();
    entity.answered_by = answeredBy !== undefined ? answeredBy : undefined;
    const answeredAt = qna.getAnsweredAt();
    entity.answered_at = answeredAt !== undefined ? answeredAt : undefined;
    entity.is_public = qna.isQuestionPublic();
    entity.created_at = qna.getCreatedAt();
    entity.updated_at = qna.getUpdatedAt();
    return entity;
  }

  /**
   * Entity를 Domain 객체로 변환
   */
  private toDomain(entity: ProductQnAEntity): ProductQnA {
    const restoreData: any = {
      id: entity.id,
      productId: entity.product_id,
      userName: entity.user_name,
      question: entity.question,
      isAnswered: entity.is_answered,
      isPublic: entity.is_public,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };

    // 선택적 필드들은 null이 아닐 때만 추가
    if (entity.answer !== null && entity.answer !== undefined) {
      restoreData.answer = entity.answer;
    }
    if (entity.answered_by !== null && entity.answered_by !== undefined) {
      restoreData.answeredBy = entity.answered_by;
    }
    if (entity.answered_at !== null && entity.answered_at !== undefined) {
      restoreData.answeredAt = entity.answered_at;
    }

    return ProductQnA.restore(restoreData);
  }
}