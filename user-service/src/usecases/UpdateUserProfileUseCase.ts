// ========================================
// UpdateUserProfileUseCase - Use Case 계층
// src/usecases/UpdateUserProfileUseCase.ts
// ========================================

import {
  UserRepository,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
} from './types/index';
import { UpdateProfileData } from '../entities/User';

/**
 * UpdateUserProfileUseCase - 사용자 프로필 업데이트 Use Case
 *
 * 책임:
 * 1. 입력 데이터 유효성 검증
 * 2. 사용자 조회 및 권한 확인
 * 3. 프로필 업데이트 (Entity 비즈니스 로직 사용)
 * 4. 업데이트된 데이터 저장
 * 5. 적절한 에러 처리
 */
export class UpdateUserProfileUseCase
  implements UseCase<UpdateUserProfileRequest, UpdateUserProfileResponse>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    request: UpdateUserProfileRequest
  ): Promise<Result<UpdateUserProfileResponse>> {
    try {
      // 1. 입력 데이터 검증
      this.validateRequest(request);

      // 2. 사용자 조회
      const user = await this.findUserById(request.userId);

      // 3. 계정 상태 확인
      this.validateAccountStatus(user);

      // 4. 프로필 데이터 업데이트 (Entity 비즈니스 로직 사용)
      this.updateProfileData(user, request);

      // 5. 업데이트된 사용자 저장
      const updatedUser = await this.saveUpdatedUser(user);

      // 6. 성공 응답 생성 (TypeScript 5.8.3 exactOptionalPropertyTypes 호환)
      const userData: UpdateUserProfileResponse['user'] = {
        id: updatedUser.id!,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      };

      // 주소 필드들은 항상 포함 (NULL 값은 빈 문자열로 변환)
      userData.phoneNumber = updatedUser.phoneNumber || '';
      userData.postalCode = updatedUser.postalCode || '';
      userData.address = updatedUser.address || '';
      userData.detailAddress = updatedUser.detailAddress || '';

      const responseData: UpdateUserProfileResponse = {
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
  private validateRequest(request: UpdateUserProfileRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new DomainError(
        '사용자 ID는 필수 항목입니다',
        'USER_ID_REQUIRED',
        400
      );
    }

    // 최소 하나의 업데이트 필드가 있는지 확인
    if (!request.name && !request.phoneNumber && !request.address && !request.postalCode && !request.detailAddress && !request.password) {
      throw new DomainError(
        '업데이트할 정보를 입력해주세요',
        'NO_UPDATE_DATA',
        400
      );
    }

    // 이름 검증 (제공된 경우)
    if (request.name !== undefined) {
      if (
        typeof request.name !== 'string' ||
        request.name.trim().length === 0
      ) {
        throw new DomainError(
          '유효한 이름을 입력해주세요',
          'INVALID_NAME',
          400
        );
      }

      if (request.name.trim().length > 100) {
        throw new DomainError(
          '이름은 100자를 초과할 수 없습니다',
          'NAME_TOO_LONG',
          400
        );
      }
    }

    // 전화번호 검증 (제공된 경우)
    if (request.phoneNumber !== undefined) {
      if (
        typeof request.phoneNumber !== 'string' ||
        request.phoneNumber.trim().length === 0
      ) {
        throw new DomainError(
          '유효한 전화번호를 입력해주세요',
          'INVALID_PHONE',
          400
        );
      }

      // 기본적인 전화번호 형식 검증
      const phoneRegex = /^[0-9-+\s()]+$/;
      if (!phoneRegex.test(request.phoneNumber)) {
        throw new DomainError(
          '올바른 전화번호 형식을 입력해주세요',
          'INVALID_PHONE_FORMAT',
          400
        );
      }
    }

    // 주소 검증 (제공된 경우)
    if (request.address !== undefined) {
      if (typeof request.address !== 'string') {
        throw new DomainError(
          '유효한 주소를 입력해주세요',
          'INVALID_ADDRESS',
          400
        );
      }

      if (request.address.length > 500) {
        throw new DomainError(
          '주소는 500자를 초과할 수 없습니다',
          'ADDRESS_TOO_LONG',
          400
        );
      }
    }

    // 우편번호 검증 (제공된 경우)
    if (request.postalCode !== undefined) {
      if (typeof request.postalCode !== 'string' || request.postalCode.trim().length === 0) {
        throw new DomainError(
          '유효한 우편번호를 입력해주세요',
          'INVALID_POSTAL_CODE',
          400
        );
      }

      // 5자리 숫자 형식 검증
      const postalCodeRegex = /^\d{5}$/;
      if (!postalCodeRegex.test(request.postalCode.trim())) {
        throw new DomainError(
          '우편번호는 5자리 숫자여야 합니다',
          'INVALID_POSTAL_CODE_FORMAT',
          400
        );
      }
    }

    // 상세주소 검증 (제공된 경우)
    if (request.detailAddress !== undefined) {
      if (typeof request.detailAddress !== 'string') {
        throw new DomainError(
          '유효한 상세주소를 입력해주세요',
          'INVALID_DETAIL_ADDRESS',
          400
        );
      }

      if (request.detailAddress.length > 255) {
        throw new DomainError(
          '상세주소는 255자를 초과할 수 없습니다',
          'DETAIL_ADDRESS_TOO_LONG',
          400
        );
      }
    }

    // 비밀번호 검증 (제공된 경우)
    if (request.password !== undefined) {
      if (typeof request.password !== 'string' || request.password.trim().length === 0) {
        throw new DomainError(
          '유효한 비밀번호를 입력해주세요',
          'INVALID_PASSWORD',
          400
        );
      }

      // 비밀번호 강도 검증
      this.validatePasswordStrength(request.password);
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
    if (!user.isActive) {
      throw new DomainError(
        '비활성화된 계정은 수정할 수 없습니다',
        'ACCOUNT_DEACTIVATED',
        403
      );
    }
  }

  /**
   * 프로필 데이터 업데이트 (Entity의 비즈니스 로직 사용)
   */
  private updateProfileData(
    user: any,
    request: UpdateUserProfileRequest
  ): void {
    try {
      const updateData: UpdateProfileData = {};

      // 변경된 필드만 업데이트 객체에 포함
      if (request.name !== undefined) {
        updateData.name = request.name.trim();
      }

      if (request.phoneNumber !== undefined) {
        updateData.phoneNumber = request.phoneNumber.trim();
      }

      if (request.postalCode !== undefined) {
        updateData.postalCode = request.postalCode.trim();
      }

      if (request.address !== undefined) {
        updateData.address = request.address.trim();
      }

      if (request.detailAddress !== undefined) {
        updateData.detailAddress = request.detailAddress.trim();
      }

      // 비밀번호 변경 처리 (별도 메서드로 처리)
      if (request.password !== undefined) {
        this.updatePassword(user, request.password);
      }

      // User Entity의 updateProfile 메서드 사용
      user.updateProfile(updateData);
    } catch (error) {
      throw new DomainError((error as Error).message, 'PROFILE_UPDATE_FAILED');
    }
  }

  /**
   * 업데이트된 사용자 저장
   */
  private async saveUpdatedUser(user: any) {
    try {
      return await this.userRepository.update(user);
    } catch (error) {
      throw new RepositoryError('프로필 업데이트 저장 실패', error as Error);
    }
  }

  /**
   * 비밀번호 강도 검증
   */
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const maxLength = 128;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (password.length < minLength) {
      throw new DomainError(
        '비밀번호는 최소 8자 이상이어야 합니다',
        'PASSWORD_TOO_SHORT',
        400
      );
    }

    if (password.length > maxLength) {
      throw new DomainError(
        '비밀번호는 최대 128자까지 입력 가능합니다',
        'PASSWORD_TOO_LONG',
        400
      );
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new DomainError(
        '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다',
        'PASSWORD_STRENGTH_INSUFFICIENT',
        400
      );
    }
  }

  /**
   * 비밀번호 업데이트 처리
   */
  private updatePassword(user: any, newPassword: string): void {
    try {
      // bcrypt를 사용해 비밀번호 해싱
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);
      
      // 사용자 객체의 비밀번호 직접 업데이트
      user.password = hashedPassword;
      user.updatedAt = new Date();
    } catch (error) {
      throw new DomainError(
        '비밀번호 업데이트 중 오류가 발생했습니다',
        'PASSWORD_UPDATE_FAILED',
        500
      );
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: unknown): Result<UpdateUserProfileResponse> {
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
    console.error('UpdateUserProfileUseCase 예상치 못한 에러:', error);
    return {
      success: false,
      error: '프로필 업데이트 중 오류가 발생했습니다.',
    };
  }
}
