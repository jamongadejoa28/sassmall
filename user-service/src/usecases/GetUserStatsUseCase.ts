// ========================================
// GetUserStatsUseCase - 사용자 통계 조회 (관리자용)
// ========================================

import {
  UseCase,
  Result,
  GetUserStatsResponse,
  UserRepository,
} from './types';

/**
 * GetUserStatsUseCase - 관리자가 사용자 통계를 조회하는 UseCase
 *
 * 역할:
 * - 전체 사용자 통계 제공
 * - 실시간 사용자 현황 데이터
 * - 대시보드용 핵심 지표
 */
export class GetUserStatsUseCase implements UseCase<void, GetUserStatsResponse> {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<Result<GetUserStatsResponse>> {
    try {
      // Repository에서 통계 데이터 조회
      const stats = await this.userRepository.getStatistics();

      const response: GetUserStatsResponse = {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        inactiveUsers: stats.inactiveUsers,
        customerCount: stats.customerCount,
        adminCount: stats.adminCount,
        newUsersThisMonth: stats.newUsersThisMonth,
        newUsersToday: stats.newUsersToday,
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('❌ [GetUserStatsUseCase] 사용자 통계 조회 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 통계 조회에 실패했습니다.',
      };
    }
  }
}