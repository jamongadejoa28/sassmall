// Token Expiration Handler
// Automatically checks for token expiration and handles logout

export class TokenExpirationHandler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

  /**
   * Check if a JWT token is expired
   */
  static isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000; // Convert to seconds

      return payload.exp ? now >= payload.exp : true;
    } catch (error) {
      console.error('❌ [TokenExpiration] Failed to parse token:', error);
      return true;
    }
  }

  /**
   * Get token expiration time in milliseconds from now
   */
  static getTokenTimeToExpire(token: string | null): number {
    if (!token) return 0;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return 0;

      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;

      if (!payload.exp) return 0;

      const timeLeft = payload.exp - now;
      return timeLeft > 0 ? timeLeft * 1000 : 0; // Convert to milliseconds
    } catch (error) {
      console.error('❌ [TokenExpiration] Failed to parse token:', error);
      return 0;
    }
  }

  /**
   * Start automatic token expiration checking
   */
  static startExpirationCheck(
    getToken: () => string | null,
    onExpired: () => void
  ): void {
    // Clear any existing interval
    this.stopExpirationCheck();

    this.checkInterval = setInterval(() => {
      const token = getToken();

      if (token && this.isTokenExpired(token)) {
        this.stopExpirationCheck();
        onExpired();
      }
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop automatic token expiration checking
   */
  static stopExpirationCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Schedule a warning before token expires (e.g., 5 minutes before)
   */
  static scheduleExpirationWarning(
    token: string | null,
    onWarning: () => void,
    warningMinutes: number = 5
  ): void {
    if (!token) return;

    const timeToExpire = this.getTokenTimeToExpire(token);
    const warningTime = warningMinutes * 60 * 1000; // Convert to milliseconds

    if (timeToExpire > warningTime) {
      const timeToWarning = timeToExpire - warningTime;

      setTimeout(() => {
        onWarning();
      }, timeToWarning);
    }
  }
}
