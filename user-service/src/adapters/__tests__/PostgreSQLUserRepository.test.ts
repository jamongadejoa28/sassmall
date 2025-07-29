// TDD로 PostgreSQLUserRepository 구현하기
import { DataSource, Repository } from 'typeorm';
import { PostgreSQLUserRepository } from '../PostgreSQLUserRepository';
import { UserEntity } from '../entities/UserEntity';
import { User } from '../../entities/User';

// 테스트용 인메모리 데이터베이스 설정
const createTestDataSource = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [UserEntity],
    synchronize: true,
    logging: false,
    // SQLite 호환성을 위한 추가 설정
    dropSchema: true,
  });

  try {
    await dataSource.initialize();
    return dataSource;
  } catch (error) {
    console.error('Test database initialization failed:', error);
    throw error;
  }
};

describe('PostgreSQLUserRepository', () => {
  let dataSource: DataSource | undefined;
  let repository: PostgreSQLUserRepository;
  let userEntityRepository: Repository<UserEntity>;

  beforeAll(async () => {
    try {
      dataSource = await createTestDataSource();
      repository = new PostgreSQLUserRepository(dataSource);
      userEntityRepository = dataSource.getRepository(UserEntity);
    } catch (error) {
      console.error('Failed to setup test environment:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    if (userEntityRepository) {
      await userEntityRepository.clear();
    }
  });

  describe('save - 사용자 저장', () => {
    it('새로운 사용자를 저장할 수 있어야 한다', async () => {
      // Given
      const user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });

      // When
      const savedUser = await repository.save(user);

      // Then
      expect(savedUser.id).toBeDefined();
      expect(savedUser.name).toBe(user.name);
      expect(savedUser.email).toBe(user.email);
      expect(savedUser.password).toBe(user.password); // 해시된 비밀번호
      expect(savedUser.role).toBe('customer');
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();

      // DB에 실제로 저장되었는지 확인
      expect(savedUser.id).toBeDefined(); // 타입 가드를 위한 검증

      const savedEntity = await userEntityRepository.findOne({
        where: { id: savedUser.id! }, // 위에서 검증했으므로 안전한 단언
      });
      expect(savedEntity).toBeDefined();
      expect(savedEntity!.email).toBe(user.email);
    });

    it('기존 사용자를 업데이트할 수 있어야 한다', async () => {
      // Given - 먼저 사용자 저장
      const user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
      const savedUser = await repository.save(user);

      // 사용자 정보 수정
      savedUser.updateProfile({ name: '홍길동 수정' });

      // When
      const updatedUser = await repository.save(savedUser);

      // Then
      expect(updatedUser.id).toBe(savedUser.id);
      expect(updatedUser.name).toBe('홍길동 수정');
    });
  });

  describe('findByEmail - 이메일로 사용자 조회', () => {
    it('존재하는 이메일로 사용자를 찾을 수 있어야 한다', async () => {
      // Given
      const user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
      await repository.save(user);

      // When
      const foundUser = await repository.findByEmail('hong@example.com');

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe('hong@example.com');
      expect(foundUser!.name).toBe('홍길동');
      expect(foundUser!.role).toBe('customer');
    });

    it('존재하지 않는 이메일의 경우 null을 반환해야 한다', async () => {
      // When
      const foundUser = await repository.findByEmail('nonexistent@example.com');

      // Then
      expect(foundUser).toBeNull();
    });

    it('대소문자를 구분하지 않고 조회해야 한다', async () => {
      // Given
      const user = new User({
        name: '홍길동',
        email: 'Hong@Example.Com',
        password: 'SecurePassword123!',
      });
      await repository.save(user);

      // When
      const foundUser1 = await repository.findByEmail('hong@example.com');
      const foundUser2 = await repository.findByEmail('HONG@EXAMPLE.COM');

      // Then
      expect(foundUser1).toBeDefined();
      expect(foundUser2).toBeDefined();
      expect(foundUser1!.id).toBe(foundUser2!.id);
    });
  });

  describe('findById - ID로 사용자 조회', () => {
    it('존재하는 ID로 사용자를 찾을 수 있어야 한다', async () => {
      // Given
      const user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
      const savedUser = await repository.save(user);

      // When
      const foundUser = await repository.findById(savedUser.id!);

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(savedUser.id);
      expect(foundUser!.email).toBe('hong@example.com');
    });

    it('존재하지 않는 ID의 경우 null을 반환해야 한다', async () => {
      // When
      const foundUser = await repository.findById('non-existent-id');

      // Then
      expect(foundUser).toBeNull();
    });
  });

  describe('update - 사용자 정보 업데이트', () => {
    it('사용자 정보를 업데이트할 수 있어야 한다', async () => {
      // Given
      const user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
      const savedUser = await repository.save(user);

      // 프로필 업데이트
      savedUser.updateProfile({
        name: '홍길동 업데이트',
      });

      // When
      const updatedUser = await repository.update(savedUser);

      // Then
      expect(updatedUser.name).toBe('홍길동 업데이트');
      expect(updatedUser.name).toBe('홍길동 업데이트');
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        savedUser.createdAt.getTime()
      );
    });
  });

  describe('delete - 사용자 삭제', () => {
    it('사용자를 삭제할 수 있어야 한다', async () => {
      // Given
      const user = new User({
        name: '홍길동',
        email: 'hong@example.com',
        password: 'SecurePassword123!',
      });
      const savedUser = await repository.save(user);

      // When
      await repository.delete(savedUser.id!);

      // Then
      const deletedUser = await repository.findById(savedUser.id!);
      expect(deletedUser).toBeNull();
    });

    it('존재하지 않는 사용자 삭제 시 에러가 발생하지 않아야 한다', async () => {
      // When & Then
      await expect(repository.delete('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('에러 처리', () => {
    it('중복된 이메일 저장 시 에러가 발생해야 한다', async () => {
      // Given
      const user1 = new User({
        name: '홍길동1',
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
      });
      await repository.save(user1);

      const user2 = new User({
        name: '홍길동2',
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
      });

      // When & Then
      await expect(repository.save(user2)).rejects.toThrow();
    });
  });
});
