// ========================================
// CartSessionManager - 쿠키 기반 장바구니 세션 관리
// Clean Architecture: Adapters Layer
// 위치: client/src/adapters/storage/CartSessionManager.ts
// ========================================

/**
 * 쿠키 기반 장바구니 세션 관리자
 *
 * 역할:
 * - 장바구니 식별자를 쿠키에 저장/조회
 * - 세션 만료 관리
 * - 로그인/로그아웃 시 장바구니 이전 처리
 */
export class CartSessionManager {
  private readonly CART_SESSION_KEY = 'cart_session_id';
  private readonly CART_EXPIRY_KEY = 'cart_session_expiry';
  private readonly DEFAULT_EXPIRY_HOURS = 24; // 1일

  /**
   * 장바구니 세션 ID 생성 및 저장
   */
  createSession(): string {
    const sessionId = this.generateSessionId();
    const expiryTime = this.calculateExpiryTime();

    this.setCookie(this.CART_SESSION_KEY, sessionId, this.DEFAULT_EXPIRY_HOURS);
    this.setCookie(
      this.CART_EXPIRY_KEY,
      expiryTime.toString(),
      this.DEFAULT_EXPIRY_HOURS
    );

    return sessionId;
  }

  /**
   * 현재 세션 ID 조회
   */
  getSessionId(): string | null {
    const sessionId = this.getCookie(this.CART_SESSION_KEY);

    if (!sessionId) {
      return null;
    }

    // 세션 만료 확인
    if (this.isSessionExpired()) {
      this.clearSession();
      return null;
    }

    return sessionId;
  }

  /**
   * 유효한 세션 ID 조회 (없으면 새로 생성)
   */
  getOrCreateSessionId(): string {
    const existingSessionId = this.getSessionId();

    if (existingSessionId) {
      // 기존 세션 만료시간 연장
      this.extendSession();
      return existingSessionId;
    }

    return this.createSession();
  }

  /**
   * 세션 만료시간 연장
   */
  extendSession(): void {
    const sessionId = this.getCookie(this.CART_SESSION_KEY);

    if (sessionId) {
      const newExpiryTime = this.calculateExpiryTime();
      this.setCookie(
        this.CART_SESSION_KEY,
        sessionId,
        this.DEFAULT_EXPIRY_HOURS
      );
      this.setCookie(
        this.CART_EXPIRY_KEY,
        newExpiryTime.toString(),
        this.DEFAULT_EXPIRY_HOURS
      );
    }
  }

  /**
   * 세션 만료 확인
   */
  isSessionExpired(): boolean {
    const expiryTimeStr = this.getCookie(this.CART_EXPIRY_KEY);

    if (!expiryTimeStr) {
      return true;
    }

    const expiryTime = parseInt(expiryTimeStr);
    return Date.now() > expiryTime;
  }

  /**
   * 세션 남은 시간 (밀리초)
   */
  getRemainingTime(): number {
    const expiryTimeStr = this.getCookie(this.CART_EXPIRY_KEY);

    if (!expiryTimeStr) {
      return 0;
    }

    const expiryTime = parseInt(expiryTimeStr);
    const remaining = expiryTime - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * 세션 정리 (로그아웃 시 등)
   */
  clearSession(): void {
    this.deleteCookie(this.CART_SESSION_KEY);
    this.deleteCookie(this.CART_EXPIRY_KEY);
  }

  /**
   * 로그인 시 세션 ID 변경 (보안)
   */
  regenerateSessionOnLogin(userId: string): string {
    this.clearSession();
    const newSessionId = this.generateSessionId(userId);
    const expiryTime = this.calculateExpiryTime();

    this.setCookie(
      this.CART_SESSION_KEY,
      newSessionId,
      this.DEFAULT_EXPIRY_HOURS
    );
    this.setCookie(
      this.CART_EXPIRY_KEY,
      expiryTime.toString(),
      this.DEFAULT_EXPIRY_HOURS
    );

    return newSessionId;
  }

  /**
   * 세션 활동 기록 (장바구니 변경 시)
   */
  recordActivity(): void {
    this.extendSession();
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(userId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const userPrefix = userId ? `u_${userId.substr(0, 8)}` : 'guest';
    return `${userPrefix}_${timestamp}_${random}`;
  }

  /**
   * 만료시간 계산
   */
  private calculateExpiryTime(): number {
    return Date.now() + this.DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000;
  }

  /**
   * 쿠키 설정
   */
  private setCookie(name: string, value: string, hours: number): void {
    const expires = new Date();
    expires.setHours(expires.getHours() + hours);

    const cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    document.cookie = cookie;
  }

  /**
   * 쿠키 조회
   */
  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }

    return null;
  }

  /**
   * 쿠키 삭제
   */
  private deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  /**
   * 디버그 정보
   */
  getDebugInfo(): {
    sessionId: string | null;
    isExpired: boolean;
    remainingTime: number;
    expiryDate: string | null;
  } {
    const sessionId = this.getCookie(this.CART_SESSION_KEY);
    const expiryTimeStr = this.getCookie(this.CART_EXPIRY_KEY);
    const expiryDate = expiryTimeStr
      ? new Date(parseInt(expiryTimeStr)).toISOString()
      : null;

    return {
      sessionId,
      isExpired: this.isSessionExpired(),
      remainingTime: this.getRemainingTime(),
      expiryDate,
    };
  }
}

// 싱글톤 인스턴스 export
export const cartSessionManager = new CartSessionManager();
