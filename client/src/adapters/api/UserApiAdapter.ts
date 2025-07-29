// UserApiAdapter - User Service API 연동
// Clean Architecture: API Adapters Layer

import { apiClient } from '../../shared/utils/api';
import { API_ENDPOINTS } from '../../shared/constants/api';
import { User, LoginCredentials, RegisterData } from '../../shared/types/user';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterResponse {
  user: User;
  emailSent: boolean;
}

interface UserListResponse {
  users: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phoneNumber?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  customerCount: number;
  adminCount: number;
  newUsersThisMonth: number;
  newUsersToday: number;
}

interface UpdateProfileData {
  name?: string;
  phoneNumber?: string;
  postalCode?: string;
  address?: string;
  detailAddress?: string;
  password?: string;
  confirmPassword?: string;
}

export class UserApiAdapter {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '로그인에 실패했습니다.'
      );
    }
  }

  async register(
    userData: RegisterData
  ): Promise<ApiResponse<RegisterResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<RegisterResponse>>(
        API_ENDPOINTS.AUTH.REGISTER,
        userData
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '회원가입에 실패했습니다.'
      );
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(
        API_ENDPOINTS.AUTH.PROFILE
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 정보 조회에 실패했습니다.'
      );
    }
  }

  async getUserById(userId: string): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(
        `/users/${userId}`
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 정보 조회에 실패했습니다.'
      );
    }
  }

  // ========================================
  // Admin API 메서드들
  // ========================================

  async getUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'customer' | 'admin';
    isActive?: boolean;
  }): Promise<ApiResponse<UserListResponse>> {
    try {
      const params = new URLSearchParams();

      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.search) params.append('search', options.search);
      if (options?.role) params.append('role', options.role);
      if (options?.isActive !== undefined)
        params.append('isActive', options.isActive.toString());

      const response = await apiClient.get<ApiResponse<UserListResponse>>(
        `${API_ENDPOINTS.ADMIN.USERS}?${params.toString()}`
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 목록 조회에 실패했습니다.'
      );
    }
  }

  async getUserStats(): Promise<ApiResponse<UserStatsResponse>> {
    try {
      const response = await apiClient.get<ApiResponse<UserStatsResponse>>(
        API_ENDPOINTS.ADMIN.USER_STATS
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 통계 조회에 실패했습니다.'
      );
    }
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.patch<ApiResponse<any>>(
        API_ENDPOINTS.ADMIN.UPDATE_USER_STATUS(userId),
        { isActive }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 상태 변경에 실패했습니다.'
      );
    }
  }

  async deleteUser(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete<ApiResponse<any>>(
        API_ENDPOINTS.ADMIN.DELETE_USER(userId)
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 삭제에 실패했습니다.'
      );
    }
  }

  // ========================================
  // 비밀번호 확인 및 프로필 수정 메서드들
  // ========================================

  async verifyPassword(
    password: string
  ): Promise<ApiResponse<{ verified: boolean }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ verified: boolean }>>(
        API_ENDPOINTS.AUTH.VERIFY_PASSWORD,
        { password }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '비밀번호 확인에 실패했습니다.'
      );
    }
  }

  async updateProfile(
    profileData: UpdateProfileData
  ): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.put<ApiResponse<User>>(
        API_ENDPOINTS.USERS.UPDATE_PROFILE,
        profileData
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '프로필 수정에 실패했습니다.'
      );
    }
  }

  async updateUserByAdmin(
    userId: string,
    userData: Omit<UpdateProfileData, 'password' | 'confirmPassword'>
  ): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.put<ApiResponse<User>>(
        API_ENDPOINTS.ADMIN.UPDATE_USER(userId),
        userData
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 정보 수정에 실패했습니다.'
      );
    }
  }
}
