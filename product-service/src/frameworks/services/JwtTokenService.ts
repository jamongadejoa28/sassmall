// ========================================
// JWT Token Service - Framework 계층
// src/frameworks/services/JwtTokenService.ts
// ========================================

import * as jwt from 'jsonwebtoken';

/**
 * JwtTokenService - JWT 토큰 검증 서비스 (Product Service용)
 * 
 * 역할:
 * - JWT Access Token 검증
 * - 토큰에서 사용자 정보 추출
 * - 보안 모범 사례 적용
 * 
 * 특징:
 * - 토큰 생성은 User Service에서 담당
 * - Product Service는 검증만 수행
 * - User Service와 동일한 시크릿 키 사용
 */
export class JwtTokenService {
  private readonly accessTokenSecret: string;
  private readonly issuer: string;

  constructor() {
    // 환경변수에서 JWT 설정 로드 (User Service와 동일한 설정)
    this.accessTokenSecret = this.getRequiredEnvVar('JWT_SECRET');
    this.issuer = process.env.JWT_ISSUER || 'user-service';

    // 시크릿 키 보안 검증
    this.validateSecret();
  }

  /**
   * Access Token 검증
   */
  verifyAccessToken(token: string): {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  } | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'], // 알고리즘 제한 (보안)
        issuer: this.issuer,
      }) as any;

      // 토큰 타입 검증
      if (decoded.type !== 'access') {
        return null;
      }

      // 필수 클레임 검증
      if (!decoded.sub || !decoded.email || !decoded.role) {
        return null;
      }

      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      // JWT 검증 실패 (만료, 변조, 잘못된 시크릿 등)
      this.logTokenError('Access Token 검증 실패', error);
      return null;
    }
  }

  /**
   * 환경변수 필수 값 확인
   */
  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`환경변수 ${name}이 설정되지 않았습니다`);
    }
    return value;
  }

  /**
   * JWT 시크릿 키 보안 검증
   */
  private validateSecret(): void {
    const minSecretLength = 32;

    if (this.accessTokenSecret.length < minSecretLength) {
      throw new Error(
        `JWT_SECRET은 최소 ${minSecretLength}자 이상이어야 합니다`
      );
    }
  }

  /**
   * 토큰 에러 로깅 (운영 환경에서는 보안상 상세 정보 숨김)
   */
  private logTokenError(message: string, error: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[JWT] ${message}:`, error);
    } else {
      // 운영 환경에서는 상세 정보 숨김
      console.error(`[JWT] ${message}`);
    }
  }
}