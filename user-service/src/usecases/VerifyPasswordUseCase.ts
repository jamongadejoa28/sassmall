// ========================================
// VerifyPasswordUseCase - 비밀번호 확인 UseCase
// ========================================

import { UserRepository, PasswordService } from './types';

interface VerifyPasswordRequest {
  userId: string;
  password: string;
}

interface VerifyPasswordResponse {
  verified: boolean;
}

export class VerifyPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService
  ) {}

  async execute(request: VerifyPasswordRequest): Promise<{
    success: boolean;
    data?: VerifyPasswordResponse;
    error?: string;
  }> {
    try {
      const { userId, password } = request;

      // 사용자 조회
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다.',
        };
      }

      // 비활성화된 계정인지 확인
      if (!user.isActive) {
        return {
          success: false,
          error: '비활성화된 계정입니다.',
        };
      }

      // 비밀번호 확인
      const isPasswordValid = await this.passwordService.comparePassword(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: '비밀번호가 일치하지 않습니다.',
        };
      }

      return {
        success: true,
        data: {
          verified: true,
        },
      };
    } catch (error) {
      console.error('VerifyPasswordUseCase 실행 오류:', error);
      return {
        success: false,
        error: '비밀번호 확인 중 오류가 발생했습니다.',
      };
    }
  }
}