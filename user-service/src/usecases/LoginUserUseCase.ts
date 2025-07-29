// ========================================
// LoginUserUseCase - Use Case 계층
// src/usecases/LoginUserUseCase.ts
// ========================================

import * as bcrypt from 'bcryptjs';
import {
  UserRepository,
  TokenService,
  LoginUserRequest,
  LoginUserResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
  ExternalServiceError,
} from './types/index';

/**
 * LoginUserUseCase - 사용자 로그인 Use Case
 *
 * 책임:
 * 1. 이메일로 사용자 조회
 * 2. 비밀번호 검증
 * 3. 계정 상태 확인 (활성화, 이메일 인증)
 * 4. JWT 토큰 생성
 * 5. 마지막 로그인 시간 업데이트
 * 6. 적절한 에러 처리
 */
export class LoginUserUseCase
  implements UseCase<LoginUserRequest, LoginUserResponse>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(request: LoginUserRequest): Promise<Result<LoginUserResponse>> {
    try {
      // 1. 입력 데이터 검증
      this.validateLoginRequest(request);

      // 2. 사용자 조회
      const user = await this.findUserByEmail(request.email);

      // 3. 비밀번호 검증
      await this.verifyPassword(request.password, user.password);

      // 4. 계정 상태 확인
      this.validateAccountStatus(user);

      // 5. JWT 토큰 생성
      const tokens = this.generateTokens(user);

      // 6. 마지막 로그인 시간 업데이트
      await this.updateLastLoginTime(user);

      // 7. 성공 응답 생성
      const responseData: LoginUserResponse = {
        user: {
          id: user.id!,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLoginAt: new Date(),
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.tokenService.getTokenExpirationTime(),
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
   * 로그인 요청 데이터 검증
   */
  private validateLoginRequest(request: LoginUserRequest): void {
    if (!request.email || request.email.trim().length === 0) {
      throw new DomainError('이메일은 필수 항목입니다', 'EMAIL_REQUIRED', 400);
    }

    if (!request.password || request.password.trim().length === 0) {
      throw new DomainError(
        '비밀번호는 필수 항목입니다',
        'PASSWORD_REQUIRED',
        400
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new DomainError(
        '유효하지 않은 이메일 형식입니다',
        'INVALID_EMAIL_FORMAT',
        400
      );
    }
  }

  /**
   * 이메일로 사용자 조회
   */
  private async findUserByEmail(email: string) {
    try {
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw new DomainError(
          '이메일 또는 비밀번호가 올바르지 않습니다',
          'INVALID_CREDENTIALS',
          401
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
   * 비밀번호 검증
   */
  private async verifyPassword(
    inputPassword: string,
    hashedPassword: string
  ): Promise<void> {
    try {
      const isPasswordValid = await bcrypt.compare(
        inputPassword,
        hashedPassword
      );

      if (!isPasswordValid) {
        throw new DomainError(
          '이메일 또는 비밀번호가 올바르지 않습니다',
          'INVALID_CREDENTIALS',
          401
        );
      }
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new ExternalServiceError(
        '비밀번호 검증 실패',
        'bcrypt',
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

    // 이메일 인증 확인 (선택적 - 비즈니스 요구사항에 따라)
    // if (!user.isEmailVerified) {
    //   throw new DomainError(
    //     '이메일 인증이 필요합니다',
    //     'EMAIL_NOT_VERIFIED',
    //     403
    //   );
    // }
  }

  /**
   * JWT 토큰 생성
   */
  private generateTokens(user: any): {
    accessToken: string;
    refreshToken: string;
  } {
    try {
      const tokenPayload = {
        id: user.id!,
        email: user.email,
        role: user.role,
      };

      const refreshPayload = {
        id: user.id!,
        email: user.email,
      };

      return {
        accessToken: this.tokenService.generateAccessToken(tokenPayload),
        refreshToken: this.tokenService.generateRefreshToken(refreshPayload),
      };
    } catch (error) {
      throw new ExternalServiceError(
        'JWT 토큰 생성 실패',
        'jwt',
        error as Error
      );
    }
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  private async updateLastLoginTime(user: any): Promise<void> {
    try {
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();
      await this.userRepository.update(user);
    } catch (error) {
      // 로그인 시간 업데이트 실패는 전체 로그인 프로세스를 실패시키지 않음
      console.warn('마지막 로그인 시간 업데이트 실패:', error);
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: unknown): Result<LoginUserResponse> {
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

    if (error instanceof ExternalServiceError) {
      return {
        success: false,
        error: '인증 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // 예상치 못한 에러
    console.error('LoginUserUseCase 예상치 못한 에러:', error);
    return {
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.',
    };
  }
}
