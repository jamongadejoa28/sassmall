// Container.ts - Dependency Injection Container
// Clean Architecture: Infrastructure Layer
// 위치: client/src/infrastructure/di/Container.ts

import { IProductRepository } from '../../entities/product/IProductRepository';
import { ProductApiRepository } from '../../adapters/repositories/ProductApiRepository';
import { GetProductsUseCase } from '../../usecases/product/GetProductsUseCase';
import { GetProductDetailUseCase } from '../../usecases/product/GetProductDetailUseCase';
import { SearchProductsUseCase } from '../../usecases/product/SearchProductsUseCase';

// 컨테이너 타입 정의
export interface DIContainer {
  // Repositories
  productRepository: IProductRepository;

  // Use Cases
  getProductsUseCase: GetProductsUseCase;
  getProductDetailUseCase: GetProductDetailUseCase;
  searchProductsUseCase: SearchProductsUseCase;
}

// 환경 설정 타입
export interface ContainerConfig {
  apiBaseUrl?: string;
}

class Container implements DIContainer {
  private static instance: Container;

  // Repositories
  public readonly productRepository: IProductRepository;

  // Use Cases
  public readonly getProductsUseCase: GetProductsUseCase;
  public readonly getProductDetailUseCase: GetProductDetailUseCase;
  public readonly searchProductsUseCase: SearchProductsUseCase;

  private constructor(config: ContainerConfig = {}) {
    // Configuration
    const apiBaseUrl = config.apiBaseUrl || 'http://localhost:3001/api/v1';

    // Repositories 초기화
    this.productRepository = new ProductApiRepository(apiBaseUrl);

    // Use Cases 초기화 (Dependency Injection)
    this.getProductsUseCase = new GetProductsUseCase(this.productRepository);
    this.getProductDetailUseCase = new GetProductDetailUseCase(
      this.productRepository
    );
    this.searchProductsUseCase = new SearchProductsUseCase(
      this.productRepository
    );
  }

  /**
   * 싱글톤 인스턴스를 반환합니다.
   */
  public static getInstance(config?: ContainerConfig): Container {
    if (!Container.instance) {
      Container.instance = new Container(config);
    }
    return Container.instance;
  }

  /**
   * 컨테이너를 재초기화합니다 (테스트용).
   */
  public static reset(config?: ContainerConfig): Container {
    Container.instance = new Container(config);
    return Container.instance;
  }

  /**
   * 특정 Use Case만 가져오는 헬퍼 메서드들
   */
  public getProductUseCases() {
    return {
      getProducts: this.getProductsUseCase,
      getProductDetail: this.getProductDetailUseCase,
      searchProducts: this.searchProductsUseCase,
    };
  }
}

// 기본 컨테이너 인스턴스 생성 및 export
export const container = Container.getInstance();

// 개발 환경에서 디버깅을 위해 window 객체에 컨테이너 노출
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).container = container;
}

export default Container;
