// ========================================
// GetUserProfileUseCase - Use Case 계층
// src/usecases/GetUserProfileUseCase.ts
// ========================================

import {
  UserRepository,
  GetUserProfileRequest,
  GetUserProfileResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
} from './types/index';

/**
 * GetUserProfileUseCase - 사용자 프로필 조회 Use Case
 *
 * 책임:
 * 1. 사용자 ID 유효성 검증
 * 2. 사용자 조회
 * 3. 계정 상태 확인
 * 4. 프로필 데이터 반환
 * 5. 적절한 에러 처리
 */
export class GetUserProfileUseCase
  implements UseCase<GetUserProfileRequest, GetUserProfileResponse>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    request: GetUserProfileRequest
  ): Promise<Result<GetUserProfileResponse>> {
    try {
      // 1. 입력 데이터 검증
      this.validateRequest(request);

      // 2. 사용자 조회
      const user = await this.findUserById(request.userId);

      // 3. 계정 상태 확인
      this.validateAccountStatus(user);

      // 4. 성공 응답 생성 (TypeScript 5.8.3 exactOptionalPropertyTypes 호환)
      const userData: GetUserProfileResponse['user'] = {
        id: user.id!,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // 주소 필드들은 항상 포함 (NULL 값은 빈 문자열로 변환)
      userData.phoneNumber = user.phoneNumber || '';
      userData.postalCode = user.postalCode || '';
      userData.address = user.address || '';
      userData.detailAddress = user.detailAddress || '';

      if (user.lastLoginAt !== undefined) {
        userData.lastLoginAt = user.lastLoginAt;
      }

      const responseData: GetUserProfileResponse = {
        user: userData,
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
  private validateRequest(request: GetUserProfileRequest): void {
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
    // 계정 비활성화 확인
    if (!user.isActive) {
      throw new DomainError(
        '비활성화된 계정입니다',
        'ACCOUNT_DEACTIVATED',
        403
      );
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: unknown): Result<GetUserProfileResponse> {
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
    console.error('GetUserProfileUseCase 예상치 못한 에러:', error);
    return {
      success: false,
      error: '프로필 조회 중 오류가 발생했습니다.',
    };
  }
}
