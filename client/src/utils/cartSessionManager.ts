// ========================================
// Cart Session Manager - 클라이언트 사이드 세션 관리
// client/src/utils/cartSessionManager.ts
// ========================================

/**
 * 클라이언트 사이드 장바구니 세션 관리 유틸리티
 *
 * 기능:
 * 1. 30분 세션 타임아웃 관리
 * 2. 클라이언트 재시작 감지 및 장바구니 초기화
 * 3. 세션 활동 추적
 * 4. 로그인 사용자와 비로그인 사용자 구분 처리
 */

interface CartSessionData {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  isLoggedIn: boolean;
  clientStartTime: number;
}

class CartSessionManager {
  private static instance: CartSessionManager;
  private sessionKey = 'cart_session';
  private clientStartTimeKey = 'client_start_time';
  private sessionTimeoutMs = 30 * 60 * 1000; // 30분
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private debugMode = process.env.NODE_ENV === 'development';

  private constructor() {
    this.initializeSession();
    this.setupActivityMonitoring();
  }

  static getInstance(): CartSessionManager {
    if (!CartSessionManager.instance) {
      CartSessionManager.instance = new CartSessionManager();
    }
    return CartSessionManager.instance;
  }

  /**
   * 세션 초기화 - 클라이언트 시작 시 호출
   */
  private initializeSession(): void {
    const currentTime = Date.now();
    const storedClientStartTime = localStorage.getItem(this.clientStartTimeKey);

    // 클라이언트 재시작 감지
    if (storedClientStartTime) {
      const lastStartTime = parseInt(storedClientStartTime);
      const timeDifference = currentTime - lastStartTime;

      // 5분 이상 차이나면 재시작으로 간주
      if (timeDifference > 5 * 60 * 1000) {
        this.clearSession();
      }
    }

    // 새로운 클라이언트 시작 시간 저장
    localStorage.setItem(this.clientStartTimeKey, currentTime.toString());

    // 기존 세션이 만료되었는지 확인
    const sessionData = this.getSessionData();
    if (sessionData && this.isSessionExpired(sessionData)) {
      this.clearSession();
    }
  }

  /**
   * 새 세션 생성
   */
  createSession(isLoggedIn = false): string {
    const sessionId = this.generateSessionId();
    const currentTime = Date.now();

    const sessionData: CartSessionData = {
      sessionId,
      startTime: currentTime,
      lastActivity: currentTime,
      isLoggedIn,
      clientStartTime: currentTime,
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));

    return sessionId;
  }

  /**
   * 현재 세션 ID 가져오기
   */
  getSessionId(): string | null {
    const sessionData = this.getSessionData();

    if (!sessionData) {
      // 세션이 없으면 새로 생성
      return this.createSession();
    }

    if (this.isSessionExpired(sessionData)) {
      // 세션이 만료되었으면 새로 생성
      this.clearSession();
      return this.createSession();
    }

    return sessionData.sessionId;
  }

  /**
   * 사용자 활동 기록 (API 호출 시마다 호출)
   */
  recordActivity(): void {
    const sessionData = this.getSessionData();
    if (sessionData) {
      sessionData.lastActivity = Date.now();
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }
  }

  /**
   * 로그인 상태 업데이트
   */
  updateLoginStatus(isLoggedIn: boolean): void {
    const sessionData = this.getSessionData();
    if (sessionData) {
      // 상태가 실제로 변경되었을 때만 로그 출력
      const _statusChanged = sessionData.isLoggedIn !== isLoggedIn;

      sessionData.isLoggedIn = isLoggedIn;
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }
  }

  /**
   * 세션 만료 확인
   */
  isSessionExpired(sessionData: CartSessionData): boolean {
    // 로그인 사용자는 만료되지 않음
    if (sessionData.isLoggedIn) {
      return false;
    }

    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - sessionData.lastActivity;

    return timeSinceLastActivity > this.sessionTimeoutMs;
  }

  /**
   * 세션 남은 시간 (초)
   */
  getRemainingTime(): number {
    const sessionData = this.getSessionData();
    if (!sessionData || sessionData.isLoggedIn) {
      return -1; // 로그인 사용자는 무제한
    }

    const currentTime = Date.now();
    const elapsed = currentTime - sessionData.lastActivity;
    const remaining = this.sessionTimeoutMs - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * 세션 정리
   */
  clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * 현재 세션이 활성 상태인지 확인
   */
  isSessionActive(): boolean {
    const sessionData = this.getSessionData();
    return sessionData !== null && !this.isSessionExpired(sessionData);
  }

  /**
   * 활동 모니터링 설정
   */
  private setupActivityMonitoring(): void {
    // 5분마다 세션 상태 확인
    this.activityCheckInterval = setInterval(
      () => {
        const sessionData = this.getSessionData();
        if (
          sessionData &&
          !sessionData.isLoggedIn &&
          this.isSessionExpired(sessionData)
        ) {
          this.clearSession();

          // 장바구니 만료 이벤트 발생
          window.dispatchEvent(new CustomEvent('cartSessionExpired'));
        }
      },
      5 * 60 * 1000
    ); // 5분

    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
      if (this.activityCheckInterval) {
        clearInterval(this.activityCheckInterval);
      }
    });

    // 사용자 활동 감지 (마우스, 키보드, 터치)
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(eventType => {
      document.addEventListener(
        eventType,
        () => {
          this.recordActivity();
        },
        { passive: true }
      );
    });
  }

  /**
   * 세션 데이터 가져오기
   */
  private getSessionData(): CartSessionData | null {
    try {
      const data = localStorage.getItem(this.sessionKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[CartSession] 세션 데이터 파싱 오류:', error);
      return null;
    }
  }

  /**
   * 세션 ID 생성 (백엔드와 호환되는 형식)
   */
  private generateSessionId(): string {
    // UUID v4 형식으로 생성하여 백엔드 세션 미들웨어와 호환
    return `sess_${this.generateUUID()}`;
  }

  /**
   * UUID v4 생성
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * 디버그 정보 가져오기
   */
  getDebugInfo(): object {
    const sessionData = this.getSessionData();
    return {
      sessionData,
      isActive: this.isSessionActive(),
      remainingTime: this.getRemainingTime(),
      clientStartTime: localStorage.getItem(this.clientStartTimeKey),
    };
  }
}

// 싱글톤 인스턴스 내보내기
export const cartSessionManager = CartSessionManager.getInstance();

// 타입 내보내기
export type { CartSessionData };
