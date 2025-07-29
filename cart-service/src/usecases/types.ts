// ========================================
// 타입 정의 및 인터페이스 - Types Layer (수정됨 - API 일관성 통일)
// cart-service/src/usecases/types.ts
// ========================================

import { Cart } from "../entities/Cart";
import { CartItem } from "../entities/CartItem";

// ========================================
// Repository Interfaces
// ========================================

export interface CartRepository {
  save(cart: Cart): Promise<Cart>;
  findById(id: string): Promise<Cart | null>;
  findByUserId(userId: string): Promise<Cart | null>;
  findBySessionId(sessionId: string): Promise<Cart | null>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
  deleteCart(cartId: string): Promise<void>; // 새로 추가: cart와 관련된 모든 데이터 삭제
}

// ========================================
// CacheService 인터페이스
// ========================================

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  getStats(): Promise<{
    isConnected: boolean;
    totalKeys: number;
    usedMemory: string;
    hitRate?: number;
  }>;
  disconnect?(): Promise<void>;
}

// ========================================
// CartCache 인터페이스 (RedisCartCacheImpl용)
// ========================================

export interface CartCache {
  setCart(cartId: string, cart: Cart): Promise<void>;
  getCart(cartId: string): Promise<Cart | null>;
  setUserCartId(userId: string, cartId: string): Promise<void>;
  getUserCartId(userId: string): Promise<string | null>;
  setSessionCartId(sessionId: string, cartId: string): Promise<void>;
  getSessionCartId(sessionId: string): Promise<string | null>;
  deleteCart(cartId: string): Promise<void>;
  deleteUserCart(userId: string): Promise<void>;
  deleteSessionCart(sessionId: string): Promise<void>;
}

export interface ProductServiceClient {
  getProduct(productId: string): Promise<ProductInfo | null>;
  checkInventory(
    productId: string,
    quantity: number
  ): Promise<InventoryCheckResult>;
  reserveInventory(productId: string, quantity: number): Promise<boolean>;
}

// ========================================
// DTOs (Data Transfer Objects) - API 일관성 통일
// ========================================

// Add to Cart
export interface AddToCartRequest {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
}

export interface AddToCartResponse {
  success: boolean;
  cart: Cart;
  message?: string;
}

// Get Cart
export interface GetCartRequest {
  userId?: string;
  sessionId?: string;
}

export interface GetCartResponse {
  success: boolean;
  cart: Cart | null;
  message?: string;
}

// Update Cart Item
export interface UpdateCartItemRequest {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemResponse {
  success: boolean;
  cart: Cart | null;
  message?: string;
}

// Remove from Cart
export interface RemoveFromCartRequest {
  userId?: string;
  sessionId?: string;
  productId: string;
}

export interface RemoveFromCartResponse {
  success: boolean;
  cart: Cart | null;
  message?: string;
}

// Transfer Cart
export interface TransferCartRequest {
  userId: string;
  sessionId: string;
}

export interface TransferCartResponse {
  success: boolean;
  cart: Cart;
  message?: string;
}

// Clear Cart - 🔧 수정: cart 프로퍼티 추가 (API 일관성)
export interface ClearCartRequest {
  userId?: string;
  sessionId?: string;
}

export interface ClearCartResponse {
  success: boolean;
  cart: Cart | null; // 🔧 수정: 삭제된 장바구니는 null 반환
  message?: string;
}

// ========================================
// External Service DTOs
// ========================================

export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availableQuantity: number;
  category: string;
  imageUrl: string;
  inventory: {
    quantity: number;
    status: "in_stock" | "low_stock" | "out_of_stock";
  };
  isActive: boolean;
  // 추가 필드들
  brand?: string;
  sku?: string;
  slug?: string;
  imageUrls?: string[];
  // 클라이언트 호환성을 위한 추가 필드들
  image_urls?: string[];
  original_price?: number;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  min_order_quantity?: number;
  max_order_quantity?: number;
  tags?: string[];
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryCheckResult {
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  message?: string;
}

// ========================================
// Error Classes
// ========================================

export class CartError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CartError";
  }
}

export class ProductNotFoundError extends CartError {
  constructor(productId?: string) {
    super(
      productId
        ? `상품을 찾을 수 없습니다: ${productId}`
        : "상품을 찾을 수 없습니다",
      "PRODUCT_NOT_FOUND"
    );
  }
}

export class InsufficientStockError extends CartError {
  constructor(
    message: string,
    public availableQuantity?: number
  ) {
    super(message, "INSUFFICIENT_STOCK");
  }
}

export class CartNotFoundError extends CartError {
  constructor(identifier?: string) {
    super(
      identifier
        ? `장바구니를 찾을 수 없습니다: ${identifier}`
        : "장바구니를 찾을 수 없습니다",
      "CART_NOT_FOUND"
    );
  }
}

export class InvalidRequestError extends CartError {
  constructor(message: string) {
    super(message, "INVALID_REQUEST");
  }
}

export class ExternalServiceError extends CartError {
  constructor(serviceName: string, message: string) {
    super(`${serviceName} 서비스 오류: ${message}`, "EXTERNAL_SERVICE_ERROR");
  }
}

// ========================================
// Utility Types
// ========================================

export type CartIdentifier = {
  userId?: string;
  sessionId?: string;
};

export type CartItemSummary = {
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type CartSummary = {
  id?: string;
  userId?: string;
  sessionId?: string;
  items: CartItemSummary[];
  totalItems: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

// ========================================
// Delete Cart Types
// ========================================

export interface DeleteCartRequest {
  userId?: string;
  sessionId?: string;
}

export interface DeleteCartResponse {
  success: boolean;
  message: string;
}
