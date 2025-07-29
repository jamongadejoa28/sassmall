// ========================================
// ProductReview Repository Implementation
// src/adapters/ProductReviewRepositoryImpl.ts
// ========================================

import { injectable, inject } from "inversify";
import { Repository, DataSource } from "typeorm";
import { ProductReview } from "../entities/ProductReview";
import { ProductReviewRepository } from "../repositories/ProductReviewRepository";
import { ProductReviewEntity } from "./entities/ProductReviewEntity";
import { TYPES } from "../infrastructure/di/types";

/**
 * ProductReview Repository 구현체 (TypeORM 사용)
 */
@injectable()
export class ProductReviewRepositoryImpl implements ProductReviewRepository {
  private repository: Repository<ProductReviewEntity>;

  constructor(
    @inject(TYPES.DataSource) private dataSource: DataSource
  ) {
    this.repository = this.dataSource.getRepository(ProductReviewEntity);
  }

  /**
   * 특정 상품의 리뷰 목록 조회
   */
  async findByProductId(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = "newest"
  ): Promise<{
    reviews: ProductReview[];
    totalCount: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const offset = (page - 1) * limit;

      // 정렬 조건 설정
      let orderBy: { [key: string]: "ASC" | "DESC" } = { created_at: "DESC" };
      switch (sortBy) {
        case "oldest":
          orderBy = { created_at: "ASC" };
          break;
        case "rating_high":
          orderBy = { rating: "DESC", created_at: "DESC" };
          break;
        case "rating_low":
          orderBy = { rating: "ASC", created_at: "DESC" };
          break;
        case "helpful":
          orderBy = { helpful_count: "DESC", created_at: "DESC" };
          break;
        default:
          orderBy = { created_at: "DESC" };
      }

      // 리뷰 목록 조회
      const [entities, totalCount] = await this.repository.findAndCount({
        where: { product_id: productId },
        order: orderBy,
        skip: offset,
        take: limit,
      });

      // 평균 평점 계산
      const avgResult = await this.repository
        .createQueryBuilder("review")
        .select("AVG(review.rating)", "average")
        .where("review.product_id = :productId", { productId })
        .getRawOne();

      const averageRating = parseFloat(avgResult?.average || "0");

      // 평점 분포 계산
      const ratingDistribution = await this.getRatingDistribution(productId);

      // Entity를 Domain 객체로 변환
      const reviews = entities.map(entity => this.toDomain(entity));

      return {
        reviews,
        totalCount,
        averageRating: Math.round(averageRating * 10) / 10, // 소수점 1자리
        ratingDistribution,
      };
    } catch (error) {
      console.error("[ProductReviewRepository] findByProductId 오류:", error);
      throw new Error("리뷰 목록 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 리뷰 ID로 단일 리뷰 조회
   */
  async findById(reviewId: string): Promise<ProductReview | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id: reviewId },
      });

      return entity ? this.toDomain(entity) : null;
    } catch (error) {
      console.error("[ProductReviewRepository] findById 오류:", error);
      throw new Error("리뷰 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 새로운 리뷰 저장
   */
  async save(review: ProductReview): Promise<ProductReview> {
    try {
      const entity = this.toEntity(review);
      const savedEntity = await this.repository.save(entity);
      return this.toDomain(savedEntity);
    } catch (error) {
      console.error("[ProductReviewRepository] save 오류:", error);
      throw new Error("리뷰 저장 중 오류가 발생했습니다.");
    }
  }

  /**
   * 기존 리뷰 업데이트
   */
  async update(review: ProductReview): Promise<ProductReview> {
    try {
      const entity = this.toEntity(review);
      await this.repository.save(entity);
      return review;
    } catch (error) {
      console.error("[ProductReviewRepository] update 오류:", error);
      throw new Error("리뷰 업데이트 중 오류가 발생했습니다.");
    }
  }

  /**
   * 리뷰 삭제
   */
  async delete(reviewId: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(reviewId);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error("[ProductReviewRepository] delete 오류:", error);
      throw new Error("리뷰 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 특정 상품의 리뷰 통계 조회
   */
  async getStatsByProductId(productId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    verifiedPurchaseCount: number;
  }> {
    try {
      // 총 리뷰 수
      const totalReviews = await this.repository.count({
        where: { product_id: productId },
      });

      // 평균 평점
      const avgResult = await this.repository
        .createQueryBuilder("review")
        .select("AVG(review.rating)", "average")
        .where("review.product_id = :productId", { productId })
        .getRawOne();

      const averageRating = parseFloat(avgResult?.average || "0");

      // 평점 분포
      const ratingDistribution = await this.getRatingDistribution(productId);

      // 인증 구매 리뷰 수
      const verifiedPurchaseCount = await this.repository.count({
        where: { product_id: productId, is_verified_purchase: true },
      });

      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        verifiedPurchaseCount,
      };
    } catch (error) {
      console.error("[ProductReviewRepository] getStatsByProductId 오류:", error);
      throw new Error("리뷰 통계 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자별 리뷰 조회
   */
  async findByUserName(
    userName: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    reviews: ProductReview[];
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

      const reviews = entities.map(entity => this.toDomain(entity));

      return { reviews, totalCount };
    } catch (error) {
      console.error("[ProductReviewRepository] findByUserName 오류:", error);
      throw new Error("사용자 리뷰 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 도움됨 카운트 증가
   */
  async incrementHelpfulCount(reviewId: string): Promise<boolean> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(ProductReviewEntity)
        .set({ helpful_count: () => "helpful_count + 1" })
        .where("id = :reviewId", { reviewId })
        .execute();

      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error("[ProductReviewRepository] incrementHelpfulCount 오류:", error);
      throw new Error("도움됨 카운트 업데이트 중 오류가 발생했습니다.");
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * 평점 분포 계산
   */
  private async getRatingDistribution(productId: string): Promise<{ [key: number]: number }> {
    const result = await this.repository
      .createQueryBuilder("review")
      .select("review.rating", "rating")
      .addSelect("COUNT(*)", "count")
      .where("review.product_id = :productId", { productId })
      .groupBy("review.rating")
      .getRawMany();

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    result.forEach(item => {
      const rating = parseInt(item.rating);
      const count = parseInt(item.count);
      if (rating >= 1 && rating <= 5) {
        distribution[rating] = count;
      }
    });

    return distribution;
  }

  /**
   * Domain 객체를 Entity로 변환
   */
  private toEntity(review: ProductReview): ProductReviewEntity {
    const entity = new ProductReviewEntity();
    entity.id = review.getId();
    entity.product_id = review.getProductId();
    entity.user_name = review.getUserName();
    entity.rating = review.getRating();
    entity.content = review.getContent();
    entity.is_verified_purchase = review.isVerified();
    entity.helpful_count = review.getHelpfulCount();
    entity.created_at = review.getCreatedAt();
    entity.updated_at = review.getUpdatedAt();
    return entity;
  }

  /**
   * Entity를 Domain 객체로 변환
   */
  private toDomain(entity: ProductReviewEntity): ProductReview {
    return ProductReview.restore({
      id: entity.id,
      productId: entity.product_id,
      userName: entity.user_name,
      rating: entity.rating,
      content: entity.content,
      isVerifiedPurchase: entity.is_verified_purchase,
      helpfulCount: entity.helpful_count,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }
}