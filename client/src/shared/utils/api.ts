import axios, { AxiosResponse } from 'axios';
import { API_BASE_URL } from '../constants/api';
import { ApiResponse } from '../types';
import { authStore } from '../../frameworks/state/authStore';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 갱신 중복 방지
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.map(callback => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// 요청 인터셉터 - 인증 토큰 자동 추가
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리 및 토큰 갱신
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 이미 토큰 갱신 중인 경우 대기
      if (isRefreshing) {
        return new Promise(resolve => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (
          refreshToken &&
          refreshToken !== 'undefined' &&
          refreshToken !== 'null'
        ) {
          const response = await axios.post(
            `${API_BASE_URL.replace('/api/v1', '')}/api/v1/auth/refresh`,
            {
              refreshToken,
            }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;

          // authStore와 localStorage 동기화 업데이트
          authStore.getState().updateTokens(accessToken, newRefreshToken);

          // 대기 중인 요청들에게 새 토큰 전달
          onRefreshed(accessToken);

          // 원래 요청 재시도
          return apiClient(originalRequest);
        } else {
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // authStore와 localStorage 모두 정리
        authStore.getState().clearAuth();

        // 토큰 만료 알림창 표시
        const shouldRedirect = window.confirm(
          '로그인 세션이 만료되었습니다.\n다시 로그인하시겠습니까?'
        );

        if (shouldRedirect) {
          // 현재 경로를 포함한 로그인 페이지로 리다이렉트
          const currentPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        } else {
          // 사용자가 취소한 경우 홈페이지로 이동
          window.location.href = '/';
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
