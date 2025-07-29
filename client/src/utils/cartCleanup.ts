// cartCleanup.ts - localStorage 기반 장바구니 데이터 정리
// 위치: client/src/utils/cartCleanup.ts

import { cartLocalRepository } from '../adapters/storage/CartLocalRepository';
import { cartSessionManager } from '../adapters/storage/CartSessionManager';

export class CartCleanupService {
  private static readonly CLEANUP_FLAG_KEY = 'cart_cleanup_performed';
  private static readonly SESSION_START_KEY = 'session_start_timestamp';
  private static readonly APP_SESSION_KEY = 'app_session_active';

  /**
   * 클라이언트 시작 시 장바구니 정리 실행
   */
  static async performStartupCleanup(): Promise<void> {
    try {
      // 개발 환경에서 앱 재시작 감지
      if (process.env.NODE_ENV === 'development') {
        const isAppRestart = this.detectAppRestart();

        if (isAppRestart) {
          await this.clearCartData();
        } else {
          await this.clearExpiredData();
        }
        return;
      }

      // 프로덕션 환경에서는 세션 기반 정리
      const currentTimestamp = Date.now().toString();
      const lastSessionTimestamp = localStorage.getItem(this.SESSION_START_KEY);

      // 새로운 세션인지 확인 (이전 세션과 시간 차이가 1일 이상)
      const isNewSession =
        !lastSessionTimestamp ||
        Date.now() - parseInt(lastSessionTimestamp) > 24 * 60 * 60 * 1000; // 1일

      if (isNewSession) {
        // 만료된 세션 정리
        await this.clearExpiredData();

        // 세션 시작 시간 업데이트
        localStorage.setItem(this.SESSION_START_KEY, currentTimestamp);
        localStorage.setItem(this.CLEANUP_FLAG_KEY, 'true');
      } else {
      }
    } catch (error) {
      console.error('❌ [CartCleanup] 장바구니 정리 중 오류:', error);
      // 오류가 발생해도 앱 시작을 방해하지 않음
    }
  }

  /**
   * 만료된 데이터만 정리 (필요한 경우에만)
   */
  private static async clearExpiredData(): Promise<void> {
    try {
      // 세션이 만료되었는지 확인
      const isExpired = cartSessionManager.isSessionExpired();

      if (isExpired) {
        await cartLocalRepository.destroy();
        cartSessionManager.clearSession();
      }

      // 기타 만료된 임시 데이터만 정리 (장바구니 데이터는 제외)
      const tempKeysToRemove = [
        'temp_cart_data',
        'temporary_cart_data',
        'cart_temp_session',
      ];

      let removedCount = 0;
      tempKeysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          removedCount++;
        }
      });

      if (removedCount > 0) {
        console.log(`임시 장바구니 데이터 ${removedCount}개 정리됨`);
      }
    } catch (error) {
      console.error('❌ [CartCleanup] 만료된 데이터 정리 중 오류:', error);
    }
  }

  /**
   * 모든 장바구니 데이터 삭제 (수동 정리용 - 명시적 호출시에만)
   */
  private static async clearCartData(): Promise<void> {
    try {
      // localStorage 기반 장바구니 데이터 완전 삭제
      await cartLocalRepository.destroy();

      // 세션 쿠키 정리
      cartSessionManager.clearSession();

      // 기타 장바구니 관련 localStorage 데이터 정리
      const localStorageKeysToRemove = [
        'cart_session_id',
        'cart_items',
        'cart_total',
        'temporary_cart_data',
        'shopping-cart',
        'cart_id',
        'cart_cleanup_performed',
        'session_start_timestamp',
      ];

      const sessionStorageKeysToRemove = ['cart-storage', 'cart_session_data'];

      // localStorage 정리
      localStorageKeysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // sessionStorage 정리
      sessionStorageKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Cart data deletion error:', error);
    }
  }

  /**
   * 수동 정리 (사용자가 명시적으로 요청할 때)
   */
  static async performManualCleanup(): Promise<void> {
    await this.clearCartData();
  }

  /**
   * 앱 재시작 감지 (개발 환경용)
   */
  private static detectAppRestart(): boolean {
    try {
      // 세션 스토리지에서 앱 세션 상태 확인
      const appSessionActive = sessionStorage.getItem(this.APP_SESSION_KEY);

      if (!appSessionActive) {
        // 세션 스토리지에 앱 세션이 없으면 새로운 시작
        sessionStorage.setItem(this.APP_SESSION_KEY, 'true');
        return true;
      }

      // 이미 앱 세션이 있으면 페이지 새로고침
      return false;
    } catch (error) {
      return true; // 에러 발생 시 안전하게 재시작으로 간주
    }
  }

  /**
   * 정리 상태 확인
   */
  static getCleanupStatus(): {
    lastCleanup: string | null;
    sessionStart: string | null;
    needsCleanup: boolean;
  } {
    const lastCleanup = localStorage.getItem(this.CLEANUP_FLAG_KEY);
    const sessionStart = localStorage.getItem(this.SESSION_START_KEY);
    const needsCleanup = cartSessionManager.isSessionExpired();

    return {
      lastCleanup,
      sessionStart,
      needsCleanup,
    };
  }
}
