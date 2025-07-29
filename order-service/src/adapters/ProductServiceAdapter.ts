// ========================================
// Product Service Adapter - 상품 서비스 통신 어댑터
// order-service/src/adapters/ProductServiceAdapter.ts
// ========================================

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ProductService } from '../usecases/CreateOrderUseCase';

interface ProductApiResponse {
  id: string;
  name: string;
  price: string; // Product Service returns price as string
  discountPrice?: string;
  sku: string;
  brand: string;
  tags: string[];
  description: string;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: {
    availableQuantity: number;
    status: 'sufficient' | 'low_stock' | 'out_of_stock';
  };
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class ProductServiceAdapter implements ProductService {
  private httpClient: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3003/api/v1') {
    this.httpClient = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답 인터셉터 추가
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Product Service API 요청 실패:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  async getProduct(productId: string): Promise<{
    id: string;
    name: string;
    price: number;
    stock: number;
    isActive: boolean;
    imageUrl?: string;
  } | null> {
    try {
      
      const response: AxiosResponse<ApiResponse<ProductApiResponse>> = await this.httpClient.get(
        `/products/${productId}`
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      const product = response.data.data;
      const result = {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price), // Convert string price to number
        stock: product.inventory.availableQuantity,
        isActive: product.inventory.status !== 'out_of_stock',
        imageUrl: undefined, // Product service doesn't return imageUrl in this format
      };

      return result;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
            return null;
        }
        
        console.error(`❌ [ProductServiceAdapter] API 오류:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          productId,
        });
      } else {
        console.error(`❌ [ProductServiceAdapter] 네트워크 오류:`, error);
      }
      
      // 외부 서비스 오류 시 null 반환 (주문 생성 실패)
      return null;
    }
  }

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    try {
      
      // 상품 정보 조회로 재고 확인 (별도 재고 확인 API가 없으므로)
      const product = await this.getProduct(productId);
      
      if (!product) {
        return false;
      }

      const available = product.stock >= quantity;
      return available;

    } catch (error) {
      console.error(`❌ [ProductServiceAdapter] 재고 확인 오류:`, error);
      
      // 재고 확인 실패 시 안전하게 false 반환
      return false;
    }
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    try {
      
      // 현재 Product Service에는 재고 예약 API가 없으므로 재고 확인만 수행
      // 실제 환경에서는 별도의 재고 예약 시스템이 필요
      const hasStock = await this.checkStock(productId, quantity);
      
      if (!hasStock) {
        return false;
      }

      
      return true;

    } catch (error) {
      console.error(`❌ [ProductServiceAdapter] 재고 예약 오류:`, error);
      
      // 재고 예약 실패 시 false 반환
      return false;
    }
  }

  async releaseStock(productId: string, quantity: number): Promise<boolean> {
    try {
      
      // 현재 Product Service에는 재고 해제 API가 없으므로 로그만 출력
      // 실제 환경에서는 예약된 재고를 해제하는 API 호출 필요
      
      
      return true;

    } catch (error) {
      console.error(`❌ [ProductServiceAdapter] 재고 해제 오류:`, error);
      
      // 재고 해제 실패 시에도 true 반환 (이미 해제된 것으로 간주)
      return true;
    }
  }

  async decreaseInventory(productId: string, quantity: number, orderNumber?: string): Promise<boolean> {
    try {
      const requestData = {
        productId,
        quantity,
        operation: 'decrease' as const,
        reason: orderNumber ? `주문 완료 (주문번호: ${orderNumber})` : '주문 완료',
        orderNumber
      };

      const response: AxiosResponse<ApiResponse<any>> = await this.httpClient.put(
        `/products/inventory`,
        requestData
      );

      if (!response.data.success) {
        console.error(`❌ [ProductServiceAdapter] 재고 감소 실패:`, {
          productId,
          quantity,
          error: response.data.error
        });
        return false;
      }

      console.log(`✅ [ProductServiceAdapter] 재고 감소 성공:`, {
        productId,
        quantity,
        orderNumber,
        newQuantity: response.data.data?.newQuantity
      });

      return true;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ [ProductServiceAdapter] 재고 감소 API 오류:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          productId,
          quantity
        });
      } else {
        console.error(`❌ [ProductServiceAdapter] 재고 감소 네트워크 오류:`, error);
      }
      
      return false;
    }
  }

  // 헬스체크 메소드 (선택적)
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Product Service 헬스체크 실패:', error);
      return false;
    }
  }
}