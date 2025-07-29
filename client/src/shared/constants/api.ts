// src/shared/constants/api.ts
export const API_BASE_URL = 'http://localhost:3001/api/v1';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/users/profile',
    VERIFY_PASSWORD: '/users/verify-password',
  },

  // User endpoints
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },

  // Product endpoints
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (id: string) => `/products/${id}`,
    CATEGORIES: '/categories',
    RECOMMENDATIONS: (userId: string) => `/products/recommendations/${userId}`,
  },

  // Order endpoints
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
  },

  // Admin endpoints
  ADMIN: {
    USERS: '/users/admin/users',
    USER_STATS: '/users/admin/stats',
    UPDATE_USER_STATUS: (userId: string) => `/users/admin/${userId}/status`,
    UPDATE_USER: (userId: string) => `/users/admin/${userId}`,
    DELETE_USER: (userId: string) => `/users/admin/${userId}`,
  },
} as const;
