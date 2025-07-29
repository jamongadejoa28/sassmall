// cartEventEmitter.ts - 장바구니 상태 변경 이벤트 관리
// 위치: client/src/utils/cartEventEmitter.ts

/**
 * 장바구니 상태 변경 이벤트를 관리하는 간단한 이벤트 에미터
 * 장바구니 작업 후 헤더의 카운트를 즉시 업데이트하기 위해 사용
 */
class CartEventEmitter {
  private listeners: Array<() => void> = [];

  /**
   * 장바구니 변경 이벤트 리스너 등록
   */
  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);

    // 구독 해제 함수 반환
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 장바구니 변경 이벤트 발생 (모든 리스너에게 알림)
   */
  emit(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('🔥 [CartEventEmitter] Error in listener:', error);
      }
    });
  }

  /**
   * 모든 리스너 제거
   */
  clear(): void {
    this.listeners = [];
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const cartEventEmitter = new CartEventEmitter();
