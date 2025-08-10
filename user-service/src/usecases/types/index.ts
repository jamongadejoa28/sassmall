// ========================================
// src/usecases/types/index.ts - 업데이트된 전체 파일
// ========================================

import { User } from '../../entities/User';

// ===== Result 패턴 - 성공/실패를 명확히 구분 =====
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 사용자 등록 관련 타입 =====
export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'admin';
  phoneNumber?: string;
  postalCode?: string;
  address?: string;
  detailAddress?: string;
}

export interface RegisterUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phoneNumber?: string;
    postalCode?: string;
    address?: string;
    detailAddress?: string;
    isActive: boolean;
    createdAt: Date;
  };
  emailSent: boolean;
  emailError?: string | undefined; // undefined 명시적 허용
  verificationToken?: string; // 이메일 인증 토큰
}

// ===== 로그인 관련 타입 =====
export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    lastLoginAt: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ===== 사용자 프로필 조회 관련 타입 =====
export interface GetUserProfileRequest {
  userId: string;
}

export interface GetUserProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phoneNumber?: string;
    postalCode?: string;
    address?: string;
    detailAddress?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

// ===== 사용자 프로필 업데이트 관련 타입 =====
export interface UpdateUserProfileRequest {
  userId: string;
  name?: string;
  phoneNumber?: string;
  postalCode?: string;
  address?: string;
  detailAddress?: string;
  password?: string;
}

export interface UpdateUserProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phoneNumber?: string;
    postalCode?: string;
    address?: string;
    detailAddress?: string;
    isActive: boolean;
    updatedAt: Date;
  };
}

// ===== 회원 탈퇴 관련 타입 =====
export interface DeactivateUserRequest {
  userId: string;
}

export interface DeactivateUserResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    deactivatedAt: Date;
  };
}

// ===== 관리자 사용자 관리 관련 타입 =====
export interface GetUsersRequest {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  role?: 'customer' | 'admin' | undefined;
  isActive?: boolean | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface GetUsersResponse {
  users: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phoneNumber?: string | undefined;
    isActive: boolean;
    lastLoginAt?: Date | undefined;
    createdAt: Date;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  customerCount: number;
  adminCount: number;
  newUsersThisMonth: number;
  newUsersToday: number;
}

export interface UpdateUserStatusRequest {
  userId: string;
  isActive: boolean;
}

export interface UpdateUserStatusResponse {
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    updatedAt: Date;
  };
}

export interface DeleteUserRequest {
  userId: string;
}

export interface DeleteUserResponse {
  message: string;
  deletedUserId: string;
}


// ===== Repository 인터페이스 (Dependency Inversion) =====
export interface UserRepository {
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  
  // Admin 관련 메서드
  findMany(options: {
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
  }>;
  getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    customerCount: number;
    adminCount: number;
    newUsersThisMonth: number;
    newUsersToday: number;
  }>;
}

// ===== 외부 서비스 인터페이스 =====
export interface EmailService {
  sendVerificationEmail(email: string, token: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, token: string): Promise<boolean>;
  sendWelcomeEmail(email: string, name: string): Promise<boolean>;
}

// ===== JWT 토큰 서비스 인터페이스 =====
export interface TokenService {
  generateAccessToken(payload: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  }): string;

  generateRefreshToken(payload: { id: string; email: string }): string;

  verifyAccessToken(token: string): {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  } | null;

  verifyRefreshToken(token: string): {
    id: string;
    email: string;
  } | null;

  getTokenExpirationTime(): number; // seconds
}

// ===== 비밀번호 서비스 인터페이스 =====
export interface PasswordService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
}

// ===== Use Case 공통 인터페이스 =====
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse>>;
}

// ===== 에러 타입 정의 =====
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}
