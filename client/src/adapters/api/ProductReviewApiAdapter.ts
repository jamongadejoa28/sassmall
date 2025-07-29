// ========================================
// Product Review API Adapter - Clean Architecture
// src/adapters/api/ProductReviewApiAdapter.ts
// ========================================

import axios, { AxiosResponse } from 'axios';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 상품 리뷰 관련 타입 정의
export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  isRecommended: boolean;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStatistics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [key: number]: number; // 1-5점 각각의 개수
  };
}

export interface GetProductReviewsResponse {
  reviews: ProductReview[];
  statistics: ReviewStatistics;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateProductReviewRequest {
  productId: string;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  isRecommended?: boolean;
  images?: string[];
}

export interface CreateProductReviewResponse {
  review: ProductReview;
}

export interface GetProductReviewsParams {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
}

/**
 * Product Review API Adapter - 상품 리뷰 관련 API 호출을 담당
 */
export class ProductReviewApiAdapter {
  private readonly baseURL: string;
  private readonly timeout: number;

  constructor() {
    // 🔧 수정: Product Service 직접 연결
    this.baseURL = 'http://localhost:3001';
    this.timeout = 10000; // 10초
  }

  /**
   * 인증 헤더 생성
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Zustand store에서 토큰 가져오기 (있으면 포함)
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        if (authData.state?.token) {
          headers['Authorization'] = `Bearer ${authData.state.token}`;
        }
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return headers;
  }

  /**
   * 상품 리뷰 목록 조회 API 호출
   */
  async getProductReviews(
    productId: string,
    params: GetProductReviewsParams = {}
  ): Promise<GetProductReviewsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);

      const url = `${this.baseURL}/api/v1/products/${productId}/reviews${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response: AxiosResponse<ApiResponse<GetProductReviewsResponse>> =
        await axios.get(url, {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        });

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      console.error('💥 [ProductReviewAPI] Error getting reviews:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        productId,
      });

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 리뷰 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 상품 리뷰 작성 API 호출
   */
  async createProductReview(
    request: CreateProductReviewRequest
  ): Promise<CreateProductReviewResponse> {
    try {
      const url = `${this.baseURL}/api/v1/products/${request.productId}/reviews`;

      const response: AxiosResponse<ApiResponse<CreateProductReviewResponse>> =
        await axios.post(url, request, {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        });

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      console.error('💥 [ProductReviewAPI] Error creating review:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        productId: request.productId,
      });

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 리뷰 작성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 헬스체크 API 호출 (서비스 상태 확인)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000,
      });
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }
}
