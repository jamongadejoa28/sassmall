import { User } from '@entities/user/User';
import { IUserRepository } from '@entities/user/IUserRepository';
import { LoginCredentials, AuthTokens } from '@shared/types/user';

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(
    credentials: LoginCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    if (!credentials.email || !credentials.password) {
      throw new Error('이메일과 비밀번호를 입력해주세요');
    }

    try {
      const result = await this.userRepository.login(credentials);

      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('accessToken', result.tokens.accessToken);
      localStorage.setItem('refreshToken', result.tokens.refreshToken);

      return result;
    } catch (error: any) {
      throw new Error(error.message || '로그인에 실패했습니다');
    }
  }
}
