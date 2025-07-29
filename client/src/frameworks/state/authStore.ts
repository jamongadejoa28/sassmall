// AuthStore - 인증 상태 관리
// Clean Architecture: State Management Layer
// 위치: client/src/frameworks/state/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserApiAdapter } from '../../adapters/api/UserApiAdapter';
import { User, LoginCredentials, RegisterData } from '../../shared/types/user';
import { TokenExpirationHandler } from '../../shared/utils/tokenExpiration';

// ========================================
// Types & Interfaces - shared/types에서 가져옴
// ========================================

export interface AuthResult {
  success: boolean;
  error?: string;
}

// ========================================
// Auth Store Interface
// ========================================

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (userData: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  loadUserProfile: () => Promise<AuthResult>;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  updateUser: (user: User) => void;
  clearAuth: () => void;
}

// ========================================
// AuthStore Implementation
// ========================================

const authStore = create<AuthState>()(
  persist(
    (set, get) => {
      const userApiAdapter = new UserApiAdapter();

      return {
        // Initial State
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,

        // Login
        login: async (credentials: LoginCredentials): Promise<AuthResult> => {
          set({ isLoading: true });

          try {
            const response = await userApiAdapter.login(credentials);

            if (response.success && response.data) {
              const { user, accessToken, refreshToken } = response.data;

              set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
              });

              // Store tokens in localStorage for API interceptors
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);

              // Start token expiration check
              TokenExpirationHandler.startExpirationCheck(
                () => localStorage.getItem('accessToken'),
                async () => {
                  console.log(
                    '🔒 Token expired during session, logging out...'
                  );
                  await get().logout();
                }
              );

              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: response.message || '로그인에 실패했습니다.',
              };
            }
          } catch (error: any) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || '로그인 중 오류가 발생했습니다.',
            };
          }
        },

        // Register
        register: async (userData: RegisterData): Promise<AuthResult> => {
          set({ isLoading: true });

          try {
            const response = await userApiAdapter.register(userData);

            if (response.success) {
              set({ isLoading: false });
              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: response.message || '회원가입에 실패했습니다.',
              };
            }
          } catch (error: any) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || '회원가입 중 오류가 발생했습니다.',
            };
          }
        },

        // Logout
        logout: async (): Promise<void> => {
          try {
            // 서버에 로그아웃 요청 (선택사항)
            // await userApiAdapter.logout();
          } catch (error) {
            console.error('Server logout error:', error);
            // 서버 로그아웃 실패해도 클라이언트 상태는 정리
          } finally {
            // Stop token expiration check
            TokenExpirationHandler.stopExpirationCheck();
            get().clearAuth();
          }
        },

        // Load user profile
        loadUserProfile: async (): Promise<AuthResult> => {
          try {
            const response = await userApiAdapter.getProfile();

            if (response.success && response.data) {
              const userData = (response.data as any).user || response.data;
              set({ user: userData });
              return { success: true };
            } else {
              return {
                success: false,
                error: response.message || 'Failed to load user profile',
              };
            }
          } catch (error: any) {
            return {
              success: false,
              error: error.message || '사용자 정보 조회에 실패했습니다.',
            };
          }
        },

        // Update tokens (for API interceptor refresh)
        updateTokens: (accessToken: string, refreshToken?: string) => {
          const currentState = get();
          set({
            accessToken,
            refreshToken: refreshToken || currentState.refreshToken,
          });

          // Sync with localStorage
          localStorage.setItem('accessToken', accessToken);
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }

          // Restart token expiration check with new token
          TokenExpirationHandler.startExpirationCheck(
            () => localStorage.getItem('accessToken'),
            async () => {
              console.log('🔒 Refreshed token expired, logging out...');
              await get().logout();
            }
          );
        },

        // Update user profile data
        updateUser: (user: User) => {
          set({ user });
        },

        // Clear Auth
        clearAuth: () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });

          // Clear all auth-related localStorage data
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('auth-storage');

          // Clear any other potential auth data
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('auth-') || key.includes('token')) {
              localStorage.removeItem(key);
            }
          });
        },
      };
    },
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Export both the hook and the store
export const useAuthStore = authStore;
export { authStore };
