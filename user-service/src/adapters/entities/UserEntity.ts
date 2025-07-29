import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * UserEntity - TypeORM Entity (Framework 계층)
 *
 * 역할: 데이터베이스 테이블과 객체 매핑
 * 특징: 도메인 로직 없음, 순수 데이터 구조
 */
@Entity('users')
@Index(['email'], { unique: true }) // 이메일 고유 인덱스
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
    transformer: {
      to: (value: string) => value.toLowerCase(), // DB 저장 시 소문자 변환
      from: (value: string) => value.toLowerCase(), // DB 조회 시 소문자 변환
    },
  })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password!: string;

  @Column({
    type: process.env.NODE_ENV === 'test' ? 'varchar' : 'enum',
    default: 'customer',
    // 조건부 속성 스프레드 (실무 Best Practice)
    ...(process.env.NODE_ENV === 'test'
      ? { length: 20 }
      : { enum: ['customer', 'admin'] }),
  })
  role!: 'customer' | 'admin';

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | undefined;


  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    type: process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp',
    nullable: true,
  })
  deactivatedAt?: Date | null;

  @Column({
    type: process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp',
    nullable: true,
  })
  lastLoginAt?: Date | undefined;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshToken?: string | undefined;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode?: string | undefined;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | undefined;

  @Column({ type: 'varchar', length: 255, nullable: true })
  detailAddress?: string | undefined;

  @CreateDateColumn({
    type: process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp',
  })
  updatedAt!: Date;

  // ===== 생성자 =====
  constructor() {
    // TypeORM Entity는 빈 생성자 필요
  }

  // ===== 정적 팩토리 메서드 =====
  static fromDomain(user: import('../../entities/User').User): UserEntity {
    const entity = new UserEntity();

    // 필수 속성들
    if (user.id) entity.id = user.id;
    entity.name = user.name;
    entity.email = user.email;
    entity.password = user.password;
    entity.role = user.role;
    entity.isActive = user.isActive;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;

    // Optional 속성들 - 조건부 할당으로 타입 안전성 확보
    if (user.phoneNumber !== undefined) {
      entity.phoneNumber = user.phoneNumber;
    }

    if (user.postalCode !== undefined) {
      entity.postalCode = user.postalCode;
    }

    if (user.address !== undefined) {
      entity.address = user.address;
    }

    if (user.detailAddress !== undefined) {
      entity.detailAddress = user.detailAddress;
    }

    // deactivatedAt은 null 가능하므로 별도 처리
    if (user.deactivatedAt !== undefined) {
      entity.deactivatedAt = user.deactivatedAt;
    }

    if (user.lastLoginAt !== undefined) {
      entity.lastLoginAt = user.lastLoginAt;
    }

    if (user.refreshToken !== undefined) {
      entity.refreshToken = user.refreshToken;
    }

    return entity;
  }

  // ===== 도메인 객체로 변환 =====
  toDomain(): import('../../entities/User').User {
    // 동적 import를 사용하여 순환 종속성 완전 방지
    const { User } = require('../../entities/User');

    // Repository에서는 이미 저장된 데이터를 복원하므로 생성자를 사용하지 않음
    // (생성자 사용 시 비밀번호가 재해시화되는 문제 방지)
    const user = Object.create(User.prototype);

    // DB에서 가져온 데이터를 직접 할당 (재검증/재해시화 없이)
    user.id = this.id;
    user.name = this.name;
    user.email = this.email;
    user.password = this.password; // 이미 해시된 비밀번호 그대로 유지
    user.role = this.role;
    user.phoneNumber = this.phoneNumber;
    user.isActive = this.isActive;
    user.postalCode = this.postalCode;
    user.address = this.address;
    user.detailAddress = this.detailAddress;
    user.deactivatedAt = this.deactivatedAt;
    user.lastLoginAt = this.lastLoginAt;
    user.refreshToken = this.refreshToken;
    user.createdAt = this.createdAt;
    user.updatedAt = this.updatedAt;

    return user;
  }
}
