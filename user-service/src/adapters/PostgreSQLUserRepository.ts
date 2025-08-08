import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/User';
import { UserRepository } from '../usecases/types';
import { UserEntity } from './entities/UserEntity';

/**
 * PostgreSQLUserRepository - 실제 데이터베이스 구현체 (Adapter 계층)
 *
 * 역할:
 * 1. 도메인 객체(User)와 데이터베이스 엔티티(UserEntity) 변환
 * 2. TypeORM을 사용한 PostgreSQL 데이터 접근
 * 3. Repository 인터페이스 구현
 */
export class PostgreSQLUserRepository implements UserRepository {
  private userRepository: Repository<UserEntity>;

  constructor(private dataSource: DataSource) {
    this.userRepository = this.dataSource.getRepository(UserEntity);
  }

  /**
   * 사용자 저장 (생성 및 업데이트)
   */
  async save(user: User): Promise<User> {
    try {
      // 도메인 객체를 Entity로 변환
      const userEntity = UserEntity.fromDomain(user);

      // TypeORM으로 저장
      const savedEntity = await this.userRepository.save(userEntity);

      // Entity를 도메인 객체로 변환하여 반환
      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, 'save');
      throw error; // TypeScript를 위한 fallback
    }
  }

  /**
   * 이메일로 사용자 조회 (대소문자 구분 없음)
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const userEntity = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      return userEntity ? userEntity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, 'findByEmail');
      throw error;
    }
  }

  /**
   * ID로 사용자 조회
   */
  async findById(id: string): Promise<User | null> {
    try {
      // 빈 문자열이나 잘못된 ID 체크
      if (!id || id.trim().length === 0) {
        return null;
      }

      const userEntity = await this.userRepository.findOne({
        where: { id: id.trim() }, // ID 정리 후 조회
      });

      return userEntity ? userEntity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, 'findById');
      throw error;
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  async update(user: User): Promise<User> {
    try {
      if (!user.id) {
        throw new Error('사용자 ID가 필요합니다');
      }

      // 기존 사용자 존재 확인
      const existingEntity = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!existingEntity) {
        throw new Error(`ID ${user.id}에 해당하는 사용자를 찾을 수 없습니다`);
      }

      // 도메인 객체를 Entity로 변환
      const updatedEntity = UserEntity.fromDomain(user);

      // TypeORM으로 업데이트
      const savedEntity = await this.userRepository.save(updatedEntity);

      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, 'update');
      throw error;
    }
  }

  /**
   * 사용자 삭제
   */
  async delete(id: string): Promise<void> {
    try {
      await this.userRepository.delete({ id });
    } catch (error) {
      this.handleDatabaseError(error, 'delete');
      throw error;
    }
  }

  /**
   * 사용자 목록 조회 (페이징, 검색, 필터링, 정렬 지원)
   */
  async findMany(options: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    role?: 'customer' | 'admin' | undefined;
    isActive?: boolean | undefined;
    sortBy?: string | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
  }): Promise<{
    users: User[];
    total: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.userRepository.createQueryBuilder('user');

      // 검색 조건
      if (options.search) {
        queryBuilder.andWhere(
          '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
          { search: `%${options.search}%` }
        );
      }

      // 역할 필터
      if (options.role) {
        queryBuilder.andWhere('user.role = :role', { role: options.role });
      }

      // 활성 상태 필터
      if (options.isActive !== undefined) {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: options.isActive });
      }

      // 페이징
      queryBuilder.skip(skip).take(limit);

      // 정렬 처리
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'DESC';
      
      // 정렬 필드 매핑 (클라이언트에서 전송하는 필드명을 데이터베이스 필드명으로 변환)
      const sortFieldMap: { [key: string]: string } = {
        'name': 'user.name',
        'email': 'user.email', 
        'createdAt': 'user.createdAt',
        'lastLoginAt': 'user.lastLoginAt',
        'role': 'user.role',
        'isActive': 'user.isActive'
      };
      
      const dbSortField = sortFieldMap[sortBy] || 'user.createdAt';
      queryBuilder.orderBy(dbSortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      // 데이터 조회
      const [userEntities, total] = await queryBuilder.getManyAndCount();

      // 도메인 객체로 변환
      const users = userEntities.map(entity => entity.toDomain());

      return { users, total };
    } catch (error) {
      this.handleDatabaseError(error, 'findMany');
      throw error;
    }
  }

  /**
   * 사용자 통계 조회
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    customerCount: number;
    adminCount: number;
    newUsersThisMonth: number;
    newUsersToday: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 기본 통계
      const totalUsers = await this.userRepository.count();
      const activeUsers = await this.userRepository.count({ where: { isActive: true } });
      const inactiveUsers = await this.userRepository.count({ where: { isActive: false } });
      const customerCount = await this.userRepository.count({ where: { role: 'customer' } });
      const adminCount = await this.userRepository.count({ where: { role: 'admin' } });

      // 이번 달 신규 사용자
      const newUsersThisMonth = await this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :startOfMonth', { startOfMonth })
        .getCount();

      // 오늘 신규 사용자
      const newUsersToday = await this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :startOfDay', { startOfDay })
        .getCount();

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        customerCount,
        adminCount,
        newUsersThisMonth,
        newUsersToday,
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getStatistics');
      throw error;
    }
  }

  /**
   * 데이터베이스 에러 처리
   */
  private handleDatabaseError(error: unknown, operation: string): void {
    if (error instanceof Error) {
      // PostgreSQL 고유 에러 코드 처리
      if ('code' in error) {
        switch ((error as any).code) {
          case '23505': // 중복 키 제약 조건 위반
            throw new Error('이미 존재하는 이메일입니다');
          case '23503': // 외래 키 제약 조건 위반
            throw new Error('참조 무결성 제약 조건 위반');
          case '23502': // NOT NULL 제약 조건 위반
            throw new Error('필수 필드가 누락되었습니다');
          case '23514': // 체크 제약 조건 위반
            throw new Error('데이터 형식이 올바르지 않습니다');
        }
      }

      // 일반적인 데이터베이스 에러
      throw new Error(
        `데이터베이스 ${operation} 작업 중 오류가 발생했습니다: ${error.message}`
      );
    }

    throw new Error(
      `알 수 없는 데이터베이스 오류가 발생했습니다 (${operation})`
    );
  }

  /**
   * 연결 상태 확인 (헬스 체크용)
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 트랜잭션 실행 (향후 확장용)
   */
  async executeInTransaction<T>(
    operation: (repository: Repository<UserEntity>) => Promise<T>
  ): Promise<T> {
    return await this.dataSource.transaction(async manager => {
      const transactionRepository = manager.getRepository(UserEntity);
      return await operation(transactionRepository);
    });
  }

}
