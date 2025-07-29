import { User } from '../entities/User';
import {
  UserRepository,
  EmailService,
  RegisterUserRequest,
  RegisterUserResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
  ExternalServiceError,
} from './types/index';
import { v4 as uuidv4 } from 'uuid';

/**
 * RegisterUserUseCase - 사용자 등록 Use Case
 *
 * 책임:
 * 1. 이메일 중복 확인
 * 2. 사용자 Entity 생성 및 저장
 * 3. 이메일 인증 메일 발송
 * 4. 적절한 에러 처리
 */
export class RegisterUserUseCase
  implements UseCase<RegisterUserRequest, RegisterUserResponse>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(
    request: RegisterUserRequest
  ): Promise<Result<RegisterUserResponse>> {
    try {
      // 1. User Entity 생성 (입력 검증 - 비용이 적은 검증 먼저)
      const user = this.createUserEntity(request);

      // 2. 이메일 중복 확인 (DB 접근 - 비용이 큰 검증 나중에)
      await this.checkEmailDuplication(request.email);

      // 3. 사용자 저장
      const savedUser = await this.saveUser(user);

      // 4. 이메일 인증 메일 발송 (실패해도 사용자 생성은 성공)
      const emailResult = await this.sendVerificationEmail(savedUser);

      // 5. 성공 응답 생성
      const userData = {
        id: savedUser.id!,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
      };

      const responseData: RegisterUserResponse = {
        user: userData,
        emailSent: emailResult.sent,
      };

      // emailError가 있을 때만 추가 (조건부 할당)
      if (emailResult.error) {
        responseData.emailError = emailResult.error;
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 이메일 중복 확인
   */
  private async checkEmailDuplication(email: string): Promise<void> {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new DomainError(
          '이미 존재하는 이메일입니다',
          'EMAIL_ALREADY_EXISTS',
          409
        );
      }
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError(
        '데이터베이스 오류: 이메일 중복 확인 실패',
        error as Error
      );
    }
  }

  /**
   * User Entity 생성 (도메인 로직은 Entity에 위임)
   */
  private createUserEntity(request: RegisterUserRequest): User {
    try {
      // 옵셔널 필드들을 포함한 사용자 데이터 생성
      const userData: {
        name: string;
        email: string;
        password: string;
        role?: 'customer' | 'admin';
        phoneNumber?: string;
      } = {
        name: request.name,
        email: request.email,
        password: request.password,
      };

      // 옵셔널 필드들을 조건부로 추가
      if (request.role && (request.role === 'customer' || request.role === 'admin')) {
        userData.role = request.role as 'customer' | 'admin';
      }
      if (request.phoneNumber) {
        userData.phoneNumber = request.phoneNumber;
      }

      return new User(userData);
    } catch (error) {
      throw new DomainError((error as Error).message, 'INVALID_USER_DATA');
    }
  }

  /**
   * 사용자 저장
   */
  private async saveUser(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      throw new RepositoryError('사용자 저장 실패', error as Error);
    }
  }

  /**
   * 이메일 인증 메일 발송 (실패해도 전체 프로세스는 실패하지 않음)
   */
  private async sendVerificationEmail(
    user: User
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      const verificationToken = uuidv4();
      const emailSent = await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken
      );

      return { sent: emailSent };
    } catch (error) {
      // 이메일 발송 실패는 전체 등록 프로세스를 실패시키지 않음
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 이메일 오류';
      return {
        sent: false,
        error: `이메일 발송 실패: ${errorMessage}`,
      };
    }
  }

  /**
   * 에러 처리 - 에러 타입에 따라 적절한 응답 생성
   */
  private handleError(error: unknown): Result<RegisterUserResponse> {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof RepositoryError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof ExternalServiceError) {
      return {
        success: false,
        error: `외부 서비스 오류: ${error.message}`,
      };
    }

    // 예상치 못한 에러
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
    return {
      success: false,
      error: `서버 오류: ${errorMessage}`,
    };
  }
}
