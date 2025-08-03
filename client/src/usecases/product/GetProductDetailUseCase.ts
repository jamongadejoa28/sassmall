// GetProductDetailUseCase.ts - 상품 상세 정보 조회 Use Case
// Clean Architecture: Use Cases Layer
// 위치: client/src/usecases/product/GetProductDetailUseCase.ts

import { IProductRepository } from '../../entities/product/IProductRepository';
import { Product } from '../../entities/product/Product';

export interface GetProductDetailRequest {
  productId: string;
}

export class GetProductDetailUseCase {
  constructor(private productRepository: IProductRepository) {}

  /**
   * 상품 상세 정보를 조회합니다.
   */
  async execute(request: GetProductDetailRequest): Promise<Product> {
    try {
      // 입력 유효성 검사
      this.validateRequest(request);

      // 레포지토리를 통해 상품 상세 정보 조회
      const product = await this.productRepository.findById(request.productId);

      // 비즈니스 로직 적용
      return this.applyBusinessLogic(product);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : '상품 정보를 불러오는 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 요청 데이터의 유효성을 검사합니다.
   */
  private validateRequest(request: GetProductDetailRequest): void {
    if (!request.productId) {
      throw new Error('상품 ID가 필요합니다.');
    }

    if (typeof request.productId !== 'string') {
      throw new Error('상품 ID는 문자열이어야 합니다.');
    }

    if (request.productId.trim().length === 0) {
      throw new Error('상품 ID는 빈 문자열일 수 없습니다.');
    }

    // UUID 형식 검사 (선택적)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(request.productId)) {
      throw new Error('유효하지 않은 상품 ID 형식입니다.');
    }
  }

  /**
   * 비즈니스 로직을 적용합니다.
   */
  private applyBusinessLogic(product: Product): Product {
    // 상품이 비활성 상태인 경우 일반 사용자에게는 보여주지 않음
    if (!product.isActive()) {
      throw new Error('요청하신 상품을 찾을 수 없습니다.');
    }

    // 추가적인 비즈니스 로직이 필요한 경우 여기에 구현
    return product;
  }
}
