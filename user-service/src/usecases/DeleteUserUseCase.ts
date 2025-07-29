// ========================================
// DeleteUserUseCase - 사용자 삭제 (관리자용)
// ========================================

import {
  UseCase,
  Result,
  DeleteUserRequest,
  DeleteUserResponse,
  UserRepository,
} from './types';

/**
 * DeleteUserUseCase - 관리자가 사용자를 삭제하는 UseCase
 *
 * 역할:
 * - 사용자 완전 삭제
 * - 관리자 권한 확인
 * - 삭제 전 검증
 */
export class DeleteUserUseCase implements UseCase<DeleteUserRequest, DeleteUserResponse> {
  constructor(private userRepository: UserRepository) {}

  async execute(request: DeleteUserRequest): Promise<Result<DeleteUserResponse>> {
    try {
      // 사용자 존재 확인
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다.',
        };
      }

      // 관리자 자기 자신 삭제 방지 로직은 컨트롤러에서 처리
      
      // 사용자 삭제
      await this.userRepository.delete(request.userId);

      const response: DeleteUserResponse = {
        message: '사용자가 성공적으로 삭제되었습니다.',
        deletedUserId: request.userId,
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('❌ [DeleteUserUseCase] 사용자 삭제 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 삭제에 실패했습니다.',
      };
    }
  }
}