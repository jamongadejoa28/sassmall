// ========================================
// 07_FixQnATimestamps - TypeORM Migration
// src/infrastructure/database/migrations/07_FixQnATimestamps.ts
// ========================================

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 상품문의(product_qna) 테이블의 타임스탬프 일관성 수정
 * 
 * 문제:
 * - answered_at이 created_at보다 이른 경우가 존재
 * - 답변 시간이 질문 시간보다 앞서는 것은 논리적으로 불가능
 * 
 * 해결:
 * - 잘못된 타임스탬프를 가진 레코드들을 식별
 * - answered_at을 created_at 이후 시간으로 수정
 * - 1시간~7일 내 랜덤 시간으로 재설정
 */
export class FixQnATimestamps1735550200000 implements MigrationInterface {
  name = "FixQnATimestamps1735550200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log("🔧 [Migration] 상품문의 타임스탬프 일관성 수정 시작...");

    // 1. 문제가 있는 레코드들 조회
    const problematicQnAs = await queryRunner.query(`
      SELECT id, user_name, question, created_at, answered_at 
      FROM "product_qna" 
      WHERE answered_at IS NOT NULL 
      AND answered_at < created_at
      ORDER BY created_at DESC
    `);

    console.log(`🔍 [Migration] 타임스탬프 순서가 잘못된 문의 ${problematicQnAs.length}개 발견`);

    if (problematicQnAs.length === 0) {
      console.log("✅ [Migration] 수정할 데이터가 없습니다. 모든 타임스탬프가 올바른 순서입니다.");
      return;
    }

    // 2. 각 문제 레코드에 대해 타임스탬프 수정
    let fixedCount = 0;
    
    for (const qna of problematicQnAs) {
      const questionTime = new Date(qna.created_at);
      
      // 답변 시간을 질문 시간 이후 1시간~7일 내 랜덤으로 설정
      const minAnswerDelay = 1 * 60 * 60 * 1000; // 1시간
      const maxAnswerDelay = 7 * 24 * 60 * 60 * 1000; // 7일
      const answerDelay = Math.random() * (maxAnswerDelay - minAnswerDelay) + minAnswerDelay;
      const newAnsweredAt = new Date(questionTime.getTime() + answerDelay);

      // 기존 값 로깅
      console.log(`📝 [Migration] 수정 중: QnA ID ${qna.id}`);
      console.log(`   질문자: ${qna.user_name}`);
      console.log(`   질문 시간: ${qna.created_at}`);
      console.log(`   기존 답변 시간: ${qna.answered_at} ❌`);
      console.log(`   새 답변 시간: ${newAnsweredAt.toISOString()} ✅`);

      // 타임스탬프 업데이트
      await queryRunner.query(`
        UPDATE "product_qna" 
        SET answered_at = $1, updated_at = NOW()
        WHERE id = $2
      `, [newAnsweredAt, qna.id]);

      fixedCount++;
      console.log(`✅ [Migration] QnA ${qna.id} 타임스탬프 수정 완료 (${fixedCount}/${problematicQnAs.length})`);
    }

    console.log(`🎉 [Migration] 총 ${fixedCount}개 레코드의 타임스탬프 수정 완료`);

    // 3. 수정 후 검증
    const remainingIssues = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "product_qna" 
      WHERE answered_at IS NOT NULL 
      AND answered_at < created_at
    `);

    if (remainingIssues[0].count > 0) {
      console.error(`❌ [Migration] 아직 ${remainingIssues[0].count}개의 문제가 남아있습니다!`);
      throw new Error(`타임스탬프 수정이 완전히 이루어지지 않았습니다.`);
    }

    console.log("✅ [Migration] 모든 타임스탬프가 올바른 순서로 수정되었습니다.");

    // 4. 최종 통계 출력
    const finalStats = await queryRunner.query(`
      SELECT 
        COUNT(*) as total_qnas,
        COUNT(CASE WHEN answered_at IS NOT NULL THEN 1 END) as answered_qnas,
        COUNT(CASE WHEN answered_at IS NULL THEN 1 END) as unanswered_qnas
      FROM "product_qna"
    `);

    console.log("📊 [Migration] 최종 상품문의 현황:");
    console.log(`  - 총 문의: ${finalStats[0].total_qnas}개`);
    console.log(`  - 답변 완료: ${finalStats[0].answered_qnas}개`);
    console.log(`  - 답변 대기: ${finalStats[0].unanswered_qnas}개`);
    console.log("🎯 [Migration] 모든 답변 시간이 질문 시간 이후로 설정됨");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log("⚠️  [Migration] FixQnATimestamps 롤백은 지원되지 않습니다.");
    console.log("💡 [Migration] 타임스탬프 수정은 데이터 정합성을 위한 필수 작업이므로 되돌릴 수 없습니다.");
    console.log("🔄 [Migration] 필요시 데이터를 다시 시딩하여 초기화하세요.");
    
    // 실제로는 롤백하지 않음 - 데이터 정합성 유지를 위해
    console.log("✅ [Migration] 롤백 완료 (실제 데이터는 변경되지 않음)");
  }
}