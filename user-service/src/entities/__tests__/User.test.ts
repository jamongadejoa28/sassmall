// TDD로 User Entity 구현하기
import { User } from '../User';

describe('User Entity', () => {
  describe('User 생성', () => {
    it('유효한 데이터로 User를 생성할 수 있어야 한다', () => {
      // Given
      const userData = {
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      // When
      const user = new User(userData);

      // Then
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      // 비밀번호는 해시화되므로 원본과 달라야 함
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt 해시 패턴
      expect(user.role).toBe('customer');
      expect(user.isActive).toBe(true);
      expect(user.id).toBeUndefined(); // 아직 저장되지 않음
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('관리자 권한으로 User를 생성할 수 있어야 한다', () => {
      // Given
      const adminData = {
        name: '관리자',
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        role: 'admin' as const,
      };

      // When
      const admin = new User(adminData);

      // Then
      expect(admin.role).toBe('admin');
      expect(admin.name).toBe(adminData.name);
    });
  });

  describe('User 유효성 검증', () => {
    it('잘못된 이메일 형식으로 생성 시 에러가 발생해야 한다', () => {
      // Given
      const invalidEmailData = {
        name: '홍길동',
        email: 'invalid-email',
        password: 'SecurePassword123!',
      };

      // When & Then
      expect(() => new User(invalidEmailData)).toThrow(
        '유효하지 않은 이메일 형식입니다'
      );
    });

    it('빈 이름으로 생성 시 에러가 발생해야 한다', () => {
      // Given
      const emptyNameData = {
        name: '',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      };

      // When & Then
      expect(() => new User(emptyNameData)).toThrow('이름은 필수 항목입니다');
    });

    it('약한 비밀번호로 생성 시 에러가 발생해야 한다', () => {
      // Given
      const weakPasswordData = {
        name: '홍길동',
        email: 'hong@example.com',
        password: '123',
      };

      // When & Then
      expect(() => new User(weakPasswordData)).toThrow(
        '비밀번호는 8자 이상이며 대소문자, 숫자, 특수문자를 포함해야 합니다'
      );
    });
  });

  describe('User 비즈니스 로직', () => {
    let user: User;

    beforeEach(() => {
      user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
    });


    it('사용자를 비활성화할 수 있어야 한다', () => {
      // When
      user.deactivate();

      // Then
      expect(user.isActive).toBe(false);
      expect(user.deactivatedAt).toBeDefined();
    });

    it('사용자를 다시 활성화할 수 있어야 한다', () => {
      // Given
      user.deactivate();

      // When
      user.activate();

      // Then
      expect(user.isActive).toBe(true);
      expect(user.deactivatedAt).toBeNull();
    });

    it('마지막 로그인 시간을 업데이트할 수 있어야 한다', () => {
      // Given
      const beforeLogin = new Date();

      // When
      user.updateLastLogin();

      // Then
      expect(user.lastLoginAt).toBeDefined();
      expect(user.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime()
      );
    });

    it('프로필 정보를 업데이트할 수 있어야 한다', () => {
      // Given
      const updateData = {
        name: '새로운 이름',
      };

      // When
      user.updateProfile(updateData);

      // Then
      expect(user.name).toBe(updateData.name);
      expect(user.updatedAt).toBeDefined();
    });
  });

  describe('User 보안 기능', () => {
    let user: User;

    beforeEach(() => {
      user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
    });

    it('비밀번호를 해시화해야 한다', () => {
      // Then
      expect(user.password).not.toBe('SecurePassword123!');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt 해시 패턴
    });

    it('비밀번호 검증이 가능해야 한다', async () => {
      // When
      const isValid = await user.validatePassword('SecurePassword123!');
      const isInvalid = await user.validatePassword('wrongpassword');

      // Then
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('리프레시 토큰을 생성할 수 있어야 한다', () => {
      // When
      const refreshToken = user.generateRefreshToken();

      // Then
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(0);
    });
  });
});
