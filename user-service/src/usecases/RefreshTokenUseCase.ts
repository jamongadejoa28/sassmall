// ========================================
// RefreshTokenUseCase - Use Case 계층
// src/usecases/RefreshTokenUseCase.ts
// ========================================

import {
  UserRepository,
  TokenService,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
  ExternalServiceError,
} from './types/index';

// ========================================
// Types & Interfaces
// ========================================

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * RefreshTokenUseCase - 토큰 갱신 Use Case
 *
 * 책임:
 * 1. Refresh Token 검증
 * 2. 사용자 조회 및 상태 확인
 * 3. 새로운 토큰 쌍 생성
 * 4. 적절한 에러 처리
 */
export class RefreshTokenUseCase
  implements UseCase<RefreshTokenRequest, RefreshTokenResponse>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(
    request: RefreshTokenRequest
  ): Promise<Result<RefreshTokenResponse>> {
    try {
      // 1. 입력 데이터 검증
      this.validateRefreshTokenRequest(request);

      // 2. Refresh Token 검증
      const refreshPayload = this.verifyRefreshToken(request.refreshToken);

      // 3. 사용자 조회 및 상태 확인
      const user = await this.findAndValidateUser(refreshPayload.id);

      // 4. 새로운 토큰 쌍 생성
      const tokens = this.generateTokens(user);

      // 5. 성공 응답 생성
      const responseData: RefreshTokenResponse = {
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
   * Refresh Token 요청 데이터 검증
   */
  private validateRefreshTokenRequest(request: RefreshTokenRequest): void {
    if (!request.refreshToken || request.refreshToken.trim().length === 0) {
      throw new DomainError(
        'Refresh Token이 필요합니다',
        'REFRESH_TOKEN_REQUIRED',
        400
      );
    }
  }

  /**
   * Refresh Token 검증
   */
  private verifyRefreshToken(refreshToken: string): any {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);

      if (!payload) {
        throw new DomainError(
          '유효하지 않거나 만료된 Refresh Token입니다',
          'INVALID_REFRESH_TOKEN',
          401
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new ExternalServiceError(
        'Refresh Token 검증 실패',
        'jwt',
        error as Error
      );
    }
  }

  /**
   * 사용자 조회 및 상태 확인
   */
  private async findAndValidateUser(userId: string) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new DomainError(
          '사용자를 찾을 수 없습니다',
          'USER_NOT_FOUND',
          401
        );
      }

      if (!user.isActive) {
        throw new DomainError(
          '비활성화된 사용자입니다',
          'USER_DEACTIVATED',
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
   * 새로운 토큰 쌍 생성
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
   * 에러 처리
   */
  private handleError(error: unknown): Result<RefreshTokenResponse> {
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
    console.error('RefreshTokenUseCase 예상치 못한 에러:', error);
    return {
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.',
    };
  }
}