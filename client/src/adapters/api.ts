// client/src/adapters/api.ts
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// =======================================
// 세션 ID 관리
// =======================================
const SESSION_ID_KEY = 'shopping_mall_session_id';

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

// =======================================
// Axios 인스턴스 생성 (클라이언트 프록시 사용)
// =======================================
const api = axios.create({
  baseURL: '/api/v1', // 🔧 수정: 상대 경로로 변경하여 클라이언트 프록시 사용
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// =======================================
// 요청 인터셉터
// =======================================
api.interceptors.request.use(
  config => {
    const sessionId = getSessionId();
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    // Authorization 헤더 추가 (Zustand persist에서 토큰 가져오기)
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsedAuth = JSON.parse(authStorage);
        if (parsedAuth?.state?.tokens?.accessToken) {
          config.headers['Authorization'] =
            `Bearer ${parsedAuth.state.tokens.accessToken}`;
        }
      }
    } catch (error) {
      console.warn('Failed to load auth token:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// =======================================
// 응답 인터셉터 (옵션)
// =======================================
api.interceptors.response.use(
  response => {
    // 성공적인 응답은 그대로 반환
    return response;
  },
  error => {
    // TODO: 401 Unauthorized 등 공통 에러 처리
    if (error.response?.status === 401) {
      // 로그인 페이지로 리디렉션
      console.error('Authentication error, redirecting to login.');
    }
    return Promise.reject(error);
  }
);

export default api;
