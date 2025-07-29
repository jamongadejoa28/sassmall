// ========================================
// ProductServiceClient - Product Service와의 HTTP 통신
// cart-service/src/adapters/ProductServiceClient.ts
// ========================================

import axios from 'axios';
import { injectable } from 'inversify';
import {
  ProductServiceClient,
  ProductInfo,
  InventoryCheckResult,
} from '../usecases/types';

interface ProductApiResponse {
  success: boolean;
  message: string;
  data: any;
  timestamp: string;
  requestId: string;
}

@injectable()
export class HttpProductServiceClient implements ProductServiceClient {
  private readonly httpClient: any;
  private readonly baseURL: string;

  constructor() {
    this.baseURL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
    
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 5000, // 5초로 단축
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.httpClient.interceptors.request.use(
      (config: any) => {
        // 요청 로깅 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProductServiceClient] Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error: any) => {
        console.error('[ProductServiceClient] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.httpClient.interceptors.response.use(
      (response: any) => {
        return response;
      },
      (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Product Service 호출 실패';
        console.error('[ProductServiceClient] Response error:', errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * 상품 정보 조회
   */
  async getProduct(productId: string): Promise<ProductInfo | null> {
    try {
      console.log(`[ProductServiceClient] Getting product ${productId} from ${this.baseURL}`);
      const response: any = await this.httpClient.get(
        `/api/v1/products/${productId}`
      );
      console.log(`[ProductServiceClient] Got response for product ${productId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || '상품 조회 실패');
      }

      const productData = response.data.data;
      
      // Product Service 응답을 ProductInfo 인터페이스로 변환
      const result = this.transformToProductInfo(productData);
      console.log(`[ProductServiceClient] Transformed product data for ${productId}`);
      return result;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`[ProductServiceClient] Product ${productId} not found (404)`);
        return null; // 상품을 찾을 수 없음
      }
      
      console.error(`[ProductServiceClient] Failed to get product ${productId}:`, error.message);
      console.error(`[ProductServiceClient] Error details:`, error.code, error.timeout);
      throw new Error(`상품 조회 실패: ${error.message}`);
    }
  }

  /**
   * 재고 확인
   */
  async checkInventory(productId: string, quantity: number): Promise<InventoryCheckResult> {
    try {
      const product = await this.getProduct(productId);
      
      if (!product) {
        return {
          productId,
          requestedQuantity: quantity,
          availableQuantity: 0,
          isAvailable: false,
          message: '상품을 찾을 수 없습니다',
        };
      }

      const isAvailable = product.availableQuantity >= quantity;

      return {
        productId,
        requestedQuantity: quantity,
        availableQuantity: product.availableQuantity,
        isAvailable,
        message: isAvailable
          ? '재고가 충분합니다'
          : `재고가 부족합니다. 요청: ${quantity}, 가용: ${product.availableQuantity}`,
      };
    } catch (error: any) {
      console.error(`[ProductServiceClient] Failed to check inventory for ${productId}:`, error.message);
      throw new Error(`재고 확인 실패: ${error.message}`);
    }
  }

  /**
   * 재고 예약 (실제로는 Product Service에 재고 감소 요청)
   */
  async reserveInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      // TODO: 실제 Product Service에 재고 감소 API가 구현되면 호출
      // 현재는 재고 확인만 수행
      const inventoryCheck = await this.checkInventory(productId, quantity);
      return inventoryCheck.isAvailable;
    } catch (error: any) {
      console.error(`[ProductServiceClient] Failed to reserve inventory for ${productId}:`, error.message);
      return false;
    }
  }

  /**
   * Product Service 응답을 ProductInfo로 변환
   */
  private transformToProductInfo(productData: any): ProductInfo {
    const imageUrls = productData.imageUrls || productData.image_urls || [];
    
    // 🔧 수정: Product Service와 Cart Service 간 가격 필드 매핑 수정
    // Product Service: price(정가), discountPrice(할인가)
    // Cart Service: price(실제 판매가), originalPrice(원가)
    const originalPrice = this.parsePrice(productData.price); // Product Service의 price는 정가
    const discountPrice = productData.discountPrice ? this.parsePrice(productData.discountPrice) : null;
    const actualPrice = discountPrice || originalPrice; // 할인가가 있으면 할인가, 없으면 정가
    
    return {
      id: productData.id,
      name: productData.name,
      description: productData.description || '',
      price: actualPrice, // 🔧 실제 판매가 (할인가 우선)
      currency: 'KRW', // 기본값
      availableQuantity: productData.inventory?.availableQuantity || 0,
      category: productData.category?.name || 'uncategorized',
      imageUrl: imageUrls[0] || '',
      inventory: {
        quantity: productData.inventory?.availableQuantity || 0,
        status: this.mapInventoryStatus(productData.inventory?.status || 'unknown'),
      },
      isActive: productData.isActive || true,
      // 추가 필드들
      brand: productData.brand || '',
      sku: productData.sku || '',
      slug: productData.slug || '',
      imageUrls: imageUrls,
      // 클라이언트 호환성을 위한 추가 필드들
      image_urls: imageUrls,  // 클라이언트에서 기대하는 필드명
      original_price: discountPrice ? originalPrice : undefined, // 🔧 할인가가 있을 때만 원가 설정
      rating: productData.rating || 0,
      review_count: productData.review_count || productData.reviewCount || 0,
      is_featured: productData.is_featured || productData.isFeatured || false,
      min_order_quantity: productData.min_order_quantity || productData.minOrderQuantity || 1,
      max_order_quantity: productData.max_order_quantity || productData.maxOrderQuantity || 999,
      tags: productData.tags || [],
      weight: productData.weight,
      dimensions: productData.dimensions,
      thumbnail_url: productData.thumbnail_url || productData.thumbnailUrl,
      created_at: productData.created_at || productData.createdAt,
      updated_at: productData.updated_at || productData.updatedAt,
    };
  }

  /**
   * 가격을 안전하게 숫자로 변환
   */
  private parsePrice(price: any): number {
    if (typeof price === 'number') {
      return price;
    }
    
    if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^\d.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * Product Service의 재고 상태를 Cart Service의 상태로 매핑
   */
  private mapInventoryStatus(status: string): 'in_stock' | 'low_stock' | 'out_of_stock' {
    switch (status.toLowerCase()) {
      case 'sufficient':
      case 'in_stock':
      case 'available':
        return 'in_stock';
      case 'low_stock':
      case 'limited':
        return 'low_stock';
      case 'out_of_stock':
      case 'unavailable':
      case 'sold_out':
        return 'out_of_stock';
      default:
        return 'in_stock'; // 기본값
    }
  }

  /**
   * Product Service 연결 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('[ProductServiceClient] Health check failed:', error);
      return false;
    }
  }
}