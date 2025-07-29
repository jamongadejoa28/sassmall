export class GetProductDetailUseCase {
  /**
   * 임시 구현 - 상품 상세 정보 조회
   * 실제 구현은 상품 상세 페이지 개발 시 진행 예정
   */
  async execute(_productId: string): Promise<any> {
    throw new Error('상품 상세 조회 기능은 구현 예정입니다.');
  }
}

// 모듈로 인식되도록 빈 export 추가
export {};
