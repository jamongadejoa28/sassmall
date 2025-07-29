// ========================================
// Cart API Adapter - Product Service 전용
// localStorage 기반 장바구니용 상품 정보 조회 어댑터
// src/adapters/api/CartApiAdapter.ts
// ========================================

import axios, { AxiosResponse } from 'axios';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 상품 정보 타입 (Product Service에서 가져오는 정보)
export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number; // 실제 판매가 (할인 적용된 가격)
  originalPrice?: number; // 원가 (할인이 있는 경우에만)
  discountPercentage?: number; // 할인율
  brand: string;
  sku: string;
  rating: number;
  review_count: number;
  is_featured: boolean;
  min_order_quantity: number;
  max_order_quantity: number;
  tags: string[];
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity?: number;
    status: string;
    lowStockThreshold?: number;
    location?: string;
  };
  image_urls?: string[];
  imageUrls?: string[];
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cart API Adapter - Product Service 전용
 *
 * localStorage 기반 장바구니에서 상품 정보만 조회하는 어댑터
 * Cart Service 호출은 제거되었고, Product Service만 호출
 */
export class CartApiAdapter {
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

    // 로그인 토큰이 있으면 포함
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        if (authData.state?.token) {
          headers['Authorization'] = `Bearer ${authData.state.token}`;
        }
      }
    } catch (error) {
      // Silently fail on token retrieval
    }

    return headers;
  }

  /**
   * 상품 정보 조회 (단일 상품)
   * localStorage 장바구니에서 상품 추가 시 사용
   */
  async getProductInfo(productId: string): Promise<ProductInfo> {
    try {
      const url = `${this.baseURL}/api/v1/products/${productId}`;

      const response: AxiosResponse<ApiResponse<ProductInfo>> = await axios.get(
        url,
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      const product = response.data.data;

      return product;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(
          `Product fetch failed: ${error.response.status} - ${productId}`
        );
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 정보 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 상품 정보 조회 (여러 상품)
   * localStorage 장바구니 로드 시 상품 정보 동기화용
   */
  async getProductsInfo(productIds: string[]): Promise<ProductInfo[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      // 병렬로 여러 상품 정보 조회
      const promises = productIds.map(productId =>
        this.getProductInfo(productId)
      );
      const results = await Promise.allSettled(promises);

      const products: ProductInfo[] = [];
      const failures: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          products.push(result.value);
        } else {
          failures.push(productIds[index]);
        }
      });

      return products;
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Batch product fetch failed: ${error.response.status}`);
      }
      throw new Error('상품 정보 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 상품 재고 확인
   * 장바구니 수량 변경 시 재고 검증용
   */
  async checkStock(
    productId: string,
    requestedQuantity: number
  ): Promise<{
    available: boolean;
    availableQuantity: number;
    message?: string;
  }> {
    try {
      const product = await this.getProductInfo(productId);
      const availableQuantity = product.inventory.availableQuantity;

      return {
        available: requestedQuantity <= availableQuantity,
        availableQuantity,
        message:
          requestedQuantity > availableQuantity
            ? `재고가 부족합니다. 현재 재고: ${availableQuantity}개`
            : undefined,
      };
    } catch (error: any) {
      if (error.response?.status) {
        console.error(
          `Inventory check failed: ${error.response.status} - ${productId}`
        );
      }
      return {
        available: false,
        availableQuantity: 0,
        message: '재고 확인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 상품 검색
   * 장바구니에서 상품 추가 시 검색용
   */
  async searchProducts(
    query: string,
    limit: number = 10
  ): Promise<ProductInfo[]> {
    try {
      const url = `${this.baseURL}/api/v1/products/search`;

      const response: AxiosResponse<ApiResponse<{ products: ProductInfo[] }>> =
        await axios.get(url, {
          params: { q: query, limit },
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        });

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data.products || [];
    } catch (error: any) {
      if (error.response?.status) {
        console.error(`Product search failed: ${error.response.status}`);
      }
      return [];
    }
  }

  /**
   * Product Service 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/products/health`,
        {
          timeout: 5000,
        }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// 싱글톤 인스턴스 export
export const cartApiAdapter = new CartApiAdapter();
