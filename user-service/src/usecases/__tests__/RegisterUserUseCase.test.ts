// TDD로 RegisterUserUseCase 구현하기
import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { User } from '../../entities/User';

// Repository 인터페이스 Mock
interface MockUserRepository {
  save: jest.Mock;
  findByEmail: jest.Mock;
  findById: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  findMany: jest.Mock;
  getStatistics: jest.Mock;
}

// Email Service Mock
interface MockEmailService {
  sendVerificationEmail: jest.Mock;
  sendPasswordResetEmail: jest.Mock; // 누락된 메서드 추가
  sendWelcomeEmail: jest.Mock; // 누락된 메서드 추가
}

describe('RegisterUserUseCase', () => {
  let registerUserUseCase: RegisterUserUseCase;
  let mockUserRepository: MockUserRepository;
  let mockEmailService: MockEmailService;

  beforeEach(() => {
    // Mock 객체 생성
    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      getStatistics: jest.fn(),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(), // 누락된 메서드 추가
      sendWelcomeEmail: jest.fn(), // 누락된 메서드 추가
    };

    // UseCase 인스턴스 생성
    registerUserUseCase = new RegisterUserUseCase(
      mockUserRepository,
      mockEmailService
    );
  });

  describe('성공적인 사용자 등록', () => {
    it('유효한 사용자 데이터로 등록이 성공해야 한다', async () => {
      // Given
      const registerData = {
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      const savedUser = new User(registerData);
      savedUser.id = 'user-id-123';

      mockUserRepository.findByEmail.mockResolvedValue(null); // 이메일 중복 없음
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);

      // When
      const result = await registerUserUseCase.execute(registerData);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // 타입 가드로 result.data 안전성 확보
      if (result.data) {
        expect(result.data.user.id).toBe('user-id-123');
        expect(result.data.user.email).toBe(registerData.email);
        expect(result.data.user.name).toBe(registerData.name);
      }

      // Repository 호출 검증
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        registerData.email
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(User));

      // Email Service 호출 검증
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        savedUser.email,
        expect.any(String) // verification token
      );
    });

    it('관리자 권한으로 사용자 등록이 성공해야 한다', async () => {
      // Given
      const adminData = {
        name: '관리자',
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        role: 'admin' as const,
      };

      const savedAdmin = new User(adminData);
      savedAdmin.id = 'admin-id-123';

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(savedAdmin);
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);

      // When
      const result = await registerUserUseCase.execute(adminData);

      // Then
      expect(result.success).toBe(true);

      // 타입 가드로 result.data 안전성 확보
      if (result.data) {
        expect(result.data.user.role).toBe('admin');
        expect(result.data.user.id).toBe('admin-id-123');
      }
    });
  });

  describe('사용자 등록 실패 케이스', () => {
    it('이미 존재하는 이메일로 등록 시 실패해야 한다', async () => {
      // Given
      const registerData = {
        name: '홍길동',
        email: 'existing@example.com',
        password: 'SecurePassword123!',
      };

      const existingUser = new User({
        name: '기존 사용자',
        email: 'existing@example.com',
        password: 'ExistingPassword123!',
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // When
      const result = await registerUserUseCase.execute(registerData);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 존재하는 이메일입니다');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('잘못된 입력 데이터로 등록 시 실패해야 한다', async () => {
      // Given
      const invalidData = {
        name: '', // 빈 이름
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      // When
      const result = await registerUserUseCase.execute(invalidData);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('이름은 필수 항목입니다');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('이메일 발송 실패 시에도 사용자는 생성되어야 한다', async () => {
      // Given
      const registerData = {
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      const savedUser = new User(registerData);
      savedUser.id = 'user-id-123';

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockEmailService.sendVerificationEmail.mockRejectedValue(
        new Error('Email service error')
      );

      // When
      const result = await registerUserUseCase.execute(registerData);

      // Then
      expect(result.success).toBe(true);

      // 타입 가드로 result.data 안전성 확보
      if (result.data) {
        expect(result.data.user.id).toBe('user-id-123');
        expect(result.data.emailSent).toBe(false);
        expect(result.data.emailError).toBeDefined();
      }
    });
  });

  describe('Repository 오류 처리', () => {
    it('이메일 중복 확인 실패 시 에러를 처리해야 한다', async () => {
      // Given
      const registerData = {
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      mockUserRepository.findByEmail.mockRejectedValue(
        new Error('Database connection error')
      );

      // When
      const result = await registerUserUseCase.execute(registerData);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('데이터베이스 오류');
    });

    it('사용자 저장 실패 시 에러를 처리해야 한다', async () => {
      // Given
      const registerData = {
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockRejectedValue(
        new Error('Database save error')
      );

      // When
      const result = await registerUserUseCase.execute(registerData);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('사용자 저장 실패');
    });
  });
});
