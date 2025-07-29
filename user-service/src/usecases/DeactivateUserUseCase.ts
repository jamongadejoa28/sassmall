// ========================================
// DeactivateUserUseCase - Use Case 계층
// src/usecases/DeactivateUserUseCase.ts
// ========================================

import {
  UserRepository,
  DeactivateUserRequest,
  DeactivateUserResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
} from './types/index';

/**
 * DeactivateUserUseCase - 사용자 계정 비활성화 Use Case
 *
 * 책임:
 * 1. 사용자 ID 유효성 검증
 * 2. 사용자 조회 및 상태 확인
 * 3. 계정 비활성화 (Entity 비즈니스 로직 사용)
 * 4. 비활성화된 데이터 저장
 * 5. 적절한 에러 처리
 *
 * 비즈니스 규칙:
 * - 이미 비활성화된 계정은 중복 처리하지 않음
 * - 관리자 계정도 비활성화 가능 (별도 권한 체크는 Controller에서)
 * - 실제 데이터 삭제가 아닌 소프트 삭제 방식
 */
export class DeactivateUserUseCase
  implements UseCase<DeactivateUserRequest, DeactivateUserResponse>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    request: DeactivateUserRequest
  ): Promise<Result<DeactivateUserResponse>> {
    try {
      // 1. 입력 데이터 검증
      this.validateRequest(request);

      // 2. 사용자 조회
      const user = await this.findUserById(request.userId);

      // 3. 계정 상태 확인
      this.validateAccountStatus(user);

      // 4. 계정 비활성화 (Entity 비즈니스 로직 사용)
      const deactivatedAt = this.deactivateAccount(user);

      // 5. 비활성화된 사용자 저장
      const updatedUser = await this.saveDeactivatedUser(user);

      // 6. 성공 응답 생성
      const responseData: DeactivateUserResponse = {
        message: '계정이 성공적으로 비활성화되었습니다',
        user: {
          id: updatedUser.id!,
          email: updatedUser.email,
          name: updatedUser.name,
          isActive: updatedUser.isActive,
          deactivatedAt: deactivatedAt,
        },
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 요청 데이터 검증
   */
  private validateRequest(request: DeactivateUserRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new DomainError(
        '사용자 ID는 필수 항목입니다',
        'USER_ID_REQUIRED',
        400
      );
    }
  }

  /**
   * ID로 사용자 조회
   */
  private async findUserById(userId: string) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new DomainError(
          '사용자를 찾을 수 없습니다',
          'USER_NOT_FOUND',
          404
        );
      }

      return user;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError(
        '데이터베이스 오류: 사용자 조회 실패',
        error as Error
      );
    }
  }

  /**
   * 계정 상태 확인
   */
  private validateAccountStatus(user: any): void {
    // 이미 비활성화된 계정인지 확인
    if (!user.isActive) {
      throw new DomainError(
        '이미 비활성화된 계정입니다',
        'ACCOUNT_ALREADY_DEACTIVATED',
        400
      );
    }
  }

  /**
   * 계정 비활성화 (Entity의 비즈니스 로직 사용)
   */
  private deactivateAccount(user: any): Date {
    try {
      // User Entity의 deactivate 메서드 사용
      user.deactivate();
      return user.deactivatedAt;
    } catch (error) {
      throw new DomainError(
        (error as Error).message,
        'ACCOUNT_DEACTIVATION_FAILED'
      );
    }
  }

  /**
   * 비활성화된 사용자 저장
   */
  private async saveDeactivatedUser(user: any) {
    try {
      return await this.userRepository.update(user);
    } catch (error) {
      throw new RepositoryError('계정 비활성화 저장 실패', error as Error);
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: unknown): Result<DeactivateUserResponse> {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof RepositoryError) {
      return {
        success: false,
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // 예상치 못한 에러
    console.error('DeactivateUserUseCase 예상치 못한 에러:', error);
    return {
      success: false,
      error: '계정 비활성화 중 오류가 발생했습니다.',
    };
  }
}
