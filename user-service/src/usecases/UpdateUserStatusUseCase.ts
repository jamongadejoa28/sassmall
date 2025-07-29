// ========================================
// UpdateUserStatusUseCase - 사용자 상태 변경 (관리자용)
// ========================================

import {
  UseCase,
  Result,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  UserRepository,
} from './types';

/**
 * UpdateUserStatusUseCase - 관리자가 사용자 상태를 변경하는 UseCase
 *
 * 역할:
 * - 사용자 활성/비활성 상태 변경
 * - 관리자 권한 확인
 * - 상태 변경 이력 기록
 */
export class UpdateUserStatusUseCase implements UseCase<UpdateUserStatusRequest, UpdateUserStatusResponse> {
  constructor(private userRepository: UserRepository) {}

  async execute(request: UpdateUserStatusRequest): Promise<Result<UpdateUserStatusResponse>> {
    try {
      // 사용자 존재 확인
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다.',
        };
      }

      // 사용자 상태 업데이트
      user.isActive = request.isActive;
      user.updatedAt = new Date();

      // 저장
      const updatedUser = await this.userRepository.update(user);

      const response: UpdateUserStatusResponse = {
        user: {
          id: updatedUser.id!,
          name: updatedUser.name,
          email: updatedUser.email,
          isActive: updatedUser.isActive,
          updatedAt: updatedUser.updatedAt,
        },
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('❌ [UpdateUserStatusUseCase] 사용자 상태 변경 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 상태 변경에 실패했습니다.',
      };
    }
  }
}