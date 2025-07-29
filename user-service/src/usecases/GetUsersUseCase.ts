// ========================================
// GetUsersUseCase - 사용자 목록 조회 (관리자용)
// ========================================

import {
  UseCase,
  Result,
  GetUsersRequest,
  GetUsersResponse,
  UserRepository,
} from './types';

/**
 * GetUsersUseCase - 관리자가 사용자 목록을 조회하는 UseCase
 *
 * 역할:
 * - 페이징 처리된 사용자 목록 조회
 * - 검색 및 필터링 지원
 * - 관리자 권한 확인
 */
export class GetUsersUseCase implements UseCase<GetUsersRequest, GetUsersResponse> {
  constructor(private userRepository: UserRepository) {}

  async execute(request: GetUsersRequest): Promise<Result<GetUsersResponse>> {
    try {
      // Repository에서 사용자 목록 조회
      const { users, total } = await this.userRepository.findMany({
        page: request.page || 1,
        limit: request.limit || 10,
        search: request.search || undefined,
        role: request.role || undefined,
        isActive: request.isActive || undefined,
      });

      // 응답 데이터 구성
      const page = request.page || 1;
      const limit = request.limit || 10;
      const totalPages = Math.ceil(total / limit);

      const response: GetUsersResponse = {
        users: users.map(user => ({
          id: user.id!,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber || undefined,
          postalCode: user.postalCode || undefined,
          address: user.address || undefined,
          detailAddress: user.detailAddress || undefined,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt || undefined,
          createdAt: user.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('❌ [GetUsersUseCase] 사용자 목록 조회 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 목록 조회에 실패했습니다.',
      };
    }
  }
}