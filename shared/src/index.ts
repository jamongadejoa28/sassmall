// ========================================
// Shared Module Entry Point
// ========================================

// 타입 내보내기
export * from './types';

// 유틸리티 내보내기
export * from './utils';

// ========================================
// 버전 정보
// ========================================
export const VERSION = '1.0.0';

// ========================================
// 환경별 설정 기본값
// ========================================
export const DEFAULT_CONFIG = {
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // requests per window
} as const;