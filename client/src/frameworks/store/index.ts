// ========================================
// Store Index - 전역 상태 관리 통합 내보내기
// client/src/frameworks/store/index.ts
// ========================================

// 장바구니 관련 Store
export { useCartStore, type CartItem } from './useCartStore';

// 인증 관련 Store
export {
  useAuthStore,
  type User,
  type UserRole,
  type LoginRequest,
  type RegisterRequest,
  type AuthTokens,
  type LoginResponse,
  type RegisterResponse,
  type ApiResponse,
} from './useAuthStore';
