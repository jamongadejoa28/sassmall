import { User } from '@entities/user/User';
import { IUserRepository } from '@entities/user/IUserRepository';
import { RegisterData, AuthTokens } from '@shared/types/user';

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(
    data: RegisterData
  ): Promise<{ user: User; tokens: AuthTokens }> {
    this.validateRegistrationData(data);

    try {
      const result = await this.userRepository.register(data);

      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('accessToken', result.tokens.accessToken);
      localStorage.setItem('refreshToken', result.tokens.refreshToken);

      return result;
    } catch (error: any) {
      throw new Error(error.message || '회원가입에 실패했습니다');
    }
  }

  private validateRegistrationData(data: RegisterData): void {
    if (!data.email || !data.password || !data.name) {
      throw new Error('모든 필드를 입력해주세요');
    }

    if (data.password.length < 8) {
      throw new Error('비밀번호는 최소 8자 이상이어야 합니다');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('유효한 이메일을 입력해주세요');
    }
  }
}
