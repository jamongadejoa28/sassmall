// ========================================
// 인증 전역 상태 관리 - Zustand Store
// client/src/frameworks/store/useAuthStore.ts
// ========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 사용자 역할
 */
export type UserRole = 'customer' | 'admin';

/**
 * 사용자 정보
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
}

/**
 * 로그인 요청 데이터
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 회원가입 요청 데이터
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 인증 토큰 정보
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 로그인 응답 데이터
 */
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 회원가입 응답 데이터
 */
export interface RegisterResponse {
  user: User;
  message: string;
}

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
  requestId?: string;
}

/**
 * 인증 상태
 */
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 인증 액션 인터페이스
 */
interface AuthActions {
  // 인증 관련 액션
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;

  // 상태 관리 액션
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // 유틸리티 액션
  checkAuthStatus: () => boolean;
  getUserRole: () => UserRole | null;
  isTokenExpired: () => boolean;
}

/**
 * 인증 Store 타입
 */
type AuthStore = AuthState & AuthActions;

/**
 * 임시 로그인 API
 */
async function mockLoginApi(
  credentials: LoginRequest
): Promise<ApiResponse<LoginResponse>> {
  // 네트워크 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 임시 검증 로직
  if (
    credentials.email === 'test@example.com' &&
    credentials.password === 'password123'
  ) {
    return {
      success: true,
      message: '로그인 성공',
      timestamp: new Date().toISOString(),
      data: {
        user: {
          id: '1',
          name: '테스트 사용자',
          email: 'test@example.com',
          role: 'customer',
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        expiresIn: 3600,
      },
    };
  }

  return {
    success: false,
    message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 임시 회원가입 API
 */
async function mockRegisterApi(
  userData: RegisterRequest
): Promise<ApiResponse<RegisterResponse>> {
  // 네트워크 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 이메일 중복 검사 (임시)
  if (userData.email === 'test@example.com') {
    return {
      success: false,
      message: '이미 사용 중인 이메일입니다.',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    message: '회원가입이 완료되었습니다. 로그인해주세요.',
    timestamp: new Date().toISOString(),
    data: {
      user: {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        role: 'customer',
        isEmailVerified: false,
      },
      message: '회원가입이 성공적으로 완료되었습니다.',
    },
  };
}

/**
 * 임시 토큰 갱신 API
 */
async function mockRefreshTokenApi(
  refreshToken: string
): Promise<ApiResponse<AuthTokens>> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    message: '토큰 갱신 완료',
    timestamp: new Date().toISOString(),
    data: {
      accessToken: 'new.mock.access.token',
      refreshToken: 'new.mock.refresh.token',
      expiresIn: 3600,
    },
  };
}

/**
 * 인증 전역 상태 관리 Store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ========================================
      // Initial State
      // ========================================
      isAuthenticated: false,
      user: null,
      tokens: null,
      isLoading: false,
      error: null,

      // ========================================
      // Authentication Actions
      // ========================================

      /**
       * 로그인
       */
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const mockResponse = await mockLoginApi(credentials);

          if (mockResponse.success && mockResponse.data) {
            const {
              user: userData,
              accessToken,
              refreshToken,
              expiresIn,
            } = mockResponse.data;

            const tokens: AuthTokens = {
              accessToken,
              refreshToken,
              expiresIn,
            };

            set({
              isAuthenticated: true,
              user: userData,
              tokens,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(mockResponse.message || '로그인에 실패했습니다.');
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : '로그인 중 오류가 발생했습니다.';
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      /**
       * 회원가입
       */
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          // 비밀번호 확인 검증
          if (userData.password !== userData.confirmPassword) {
            throw new Error('비밀번호가 일치하지 않습니다.');
          }

          const mockResponse = await mockRegisterApi(userData);

          if (mockResponse.success) {
            set({
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(mockResponse.message || '회원가입에 실패했습니다.');
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : '회원가입 중 오류가 발생했습니다.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      /**
       * 로그아웃
       */
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          tokens: null,
          isLoading: false,
          error: null,
        });
      },

      /**
       * 토큰 갱신
       */
      refreshToken: async () => {
        const { tokens } = get();

        if (!tokens?.refreshToken) {
          get().logout();
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const mockResponse = await mockRefreshTokenApi(tokens.refreshToken);

          if (mockResponse.success && mockResponse.data) {
            const newTokens: AuthTokens = {
              accessToken: mockResponse.data.accessToken,
              refreshToken:
                mockResponse.data.refreshToken || tokens.refreshToken,
              expiresIn: mockResponse.data.expiresIn,
            };

            set({
              tokens: newTokens,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error('토큰 갱신에 실패했습니다.');
          }
        } catch (error) {
          console.error('토큰 갱신 실패:', error);
          get().logout();
        }
      },

      // ========================================
      // State Management Actions
      // ========================================

      /**
       * 로딩 상태 설정
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      /**
       * 에러 상태 설정
       */
      setError: (error: string | null) => {
        set({ error });
      },

      /**
       * 에러 상태 초기화
       */
      clearError: () => {
        set({ error: null });
      },

      // ========================================
      // Utility Actions
      // ========================================

      /**
       * 인증 상태 확인
       */
      checkAuthStatus: () => {
        const { isAuthenticated, tokens } = get();

        if (!isAuthenticated || !tokens) {
          return false;
        }

        // 토큰 만료 확인
        if (get().isTokenExpired()) {
          get().logout();
          return false;
        }

        return true;
      },

      /**
       * 사용자 역할 조회
       */
      getUserRole: () => {
        const { user } = get();
        return user ? user.role : null;
      },

      /**
       * 토큰 만료 확인
       */
      isTokenExpired: () => {
        const { tokens } = get();

        if (!tokens) return true;

        // JWT 토큰의 만료 시간 확인 (간단한 구현)
        try {
          const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          return payload.exp < currentTime;
        } catch (error) {
          console.error('토큰 파싱 에러:', error);
          return true;
        }
      },
    }),
    {
      name: 'auth-storage',
      // 보안을 위해 민감한 정보는 제외하고 저장
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        tokens: state.tokens,
        user: state.user,
      }),
    }
  )
);
