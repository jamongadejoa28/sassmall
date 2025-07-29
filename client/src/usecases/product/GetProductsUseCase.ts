export class GetProductsUseCase {
  /**
   * 임시 구현 - 상품 목록 조회
   * 현재는 ProductsPage에서 직접 API 호출하므로 이 클래스는 사용하지 않음
   * 나중에 Clean Architecture 완성 시 실제 구현 예정
   */
  async execute(_filter: any, _page: number, _limit: number): Promise<any> {
    throw new Error(
      '상품 목록 조회는 현재 ProductsPage에서 직접 처리 중입니다.'
    );
  }
}

// 모듈로 인식되도록 빈 export 추가
export {};
