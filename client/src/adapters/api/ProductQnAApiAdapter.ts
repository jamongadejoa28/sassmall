// ========================================
// Product Q&A API Adapter - Clean Architecture
// src/adapters/api/ProductQnAApiAdapter.ts
// ========================================

import axios, { AxiosResponse } from 'axios';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 상품 Q&A 관련 타입 정의
export interface ProductQnA {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  question: string;
  answer?: string;
  isAnswered: boolean;
  answeredBy?: string;
  answeredAt?: string;
  isPublic: boolean;
  responseTimeHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductQnAResponse {
  qnas: ProductQnA[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  statistics: {
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    averageResponseTimeHours: number;
  };
}

export interface CreateProductQnARequest {
  productId: string;
  question: string;
  isPublic?: boolean;
  userName?: string;
}

export interface CreateProductQnAResponse {
  qna: ProductQnA;
}

export interface AnswerProductQnARequest {
  qnaId: string;
  answer: string;
  answeredBy: string;
}

export interface AnswerProductQnAResponse {
  qna: ProductQnA;
}

export interface GetProductQnAParams {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest';
  onlyAnswered?: boolean;
}

/**
 * Product Q&A API Adapter - 상품 Q&A 관련 API 호출을 담당
 */
export class ProductQnAApiAdapter {
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
        if (authData.state?.accessToken) {
          headers['Authorization'] = `Bearer ${authData.state.accessToken}`;
        }
      }
    } catch (error) {
      // Silently fail on token retrieval
    }

    return headers;
  }

  /**
   * 상품 Q&A 목록 조회 API 호출
   */
  async getProductQnA(
    productId: string,
    params: GetProductQnAParams = {}
  ): Promise<GetProductQnAResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.onlyAnswered !== undefined) {
        queryParams.append('onlyAnswered', params.onlyAnswered.toString());
      }

      const url = `${this.baseURL}/api/v1/products/${productId}/qna${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response: AxiosResponse<ApiResponse<GetProductQnAResponse>> =
        await axios.get(url, {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        });

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(
          `Product Q&A fetch failed: ${error.response.status} - ${productId}`
        );
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 Q&A 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 상품 Q&A 작성 API 호출
   */
  async createProductQnA(
    request: CreateProductQnARequest
  ): Promise<CreateProductQnAResponse> {
    try {
      const url = `${this.baseURL}/api/v1/products/${request.productId}/qna`;

      const response: AxiosResponse<ApiResponse<CreateProductQnAResponse>> =
        await axios.post(
          url,
          {
            question: request.question,
            isPublic: request.isPublic,
            userName: request.userName,
          },
          {
            timeout: this.timeout,
            headers: this.getAuthHeaders(),
          }
        );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(
          `Product Q&A creation failed: ${error.response.status} - ${request.productId}`
        );
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 Q&A 작성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 상품 Q&A 답변 API 호출 (관리자용)
   */
  async answerProductQnA(
    request: AnswerProductQnARequest
  ): Promise<AnswerProductQnAResponse> {
    try {
      const url = `${this.baseURL}/api/v1/qna/${request.qnaId}/answer`;

      const response: AxiosResponse<ApiResponse<AnswerProductQnAResponse>> =
        await axios.put(
          url,
          {
            answer: request.answer,
            answeredBy: request.answeredBy,
          },
          {
            timeout: this.timeout,
            headers: this.getAuthHeaders(),
          }
        );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(
          `Product Q&A answer failed: ${error.response.status} - ${request.qnaId}`
        );
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 Q&A 답변 중 오류가 발생했습니다.');
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
