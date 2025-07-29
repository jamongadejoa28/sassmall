// ========================================
// JWT Token Service - Framework 계층
// src/framework/services/JwtTokenService.ts
// ========================================

import * as jwt from 'jsonwebtoken';
import { TokenService } from '../../usecases/types';

/**
 * JwtTokenService - JWT 토큰 생성/검증 서비스 (Framework 계층)
 *
 * 역할:
 * - JWT Access Token 생성/검증
 * - JWT Refresh Token 생성/검증
 * - 토큰 만료 시간 관리
 * - 보안 모범 사례 적용
 *
 * 특징:
 * - jsonwebtoken ^9.0.2 호환
 * - 환경변수 기반 설정
 * - 에러 처리 완벽 구현
 * - TypeScript 타입 안정성
 */
export class JwtTokenService implements TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string | number;
  private readonly refreshTokenExpiresIn: string | number;
  private readonly issuer: string;

  constructor() {
    // 환경변수에서 JWT 설정 로드 (사용자 .env 파일에 맞춤)
    this.accessTokenSecret = this.getRequiredEnvVar('JWT_SECRET'); // JWT_ACCESS_SECRET → JWT_SECRET
    this.refreshTokenSecret = this.getRequiredEnvVar('JWT_REFRESH_SECRET');
    this.accessTokenExpiresIn = process.env.JWT_EXPIRES_IN || '24h'; // 24시간 지속으로 변경
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.issuer = process.env.JWT_ISSUER || 'user-service';

    // 시크릿 키 보안 검증
    this.validateSecrets();
  }

  /**
   * Access Token 생성
   */
  generateAccessToken(payload: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  }): string {
    try {
      const tokenPayload = {
        sub: payload.id, // JWT 표준 클레임
        email: payload.email,
        role: payload.role,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
      };

      // TypeScript 5.8.3 호환성을 위한 타입 안전한 처리
      const signOptions: jwt.SignOptions = {
        algorithm: 'HS256', // 명시적 알고리즘 지정 (보안)
        issuer: this.issuer, // JWT 표준 클레임으로 issuer 설정
      };

      // expiresIn 타입 안전 처리 (jsonwebtoken StringValue 호환)
      if (typeof this.accessTokenExpiresIn === 'string') {
        signOptions.expiresIn = this.accessTokenExpiresIn as any;
      } else if (typeof this.accessTokenExpiresIn === 'number') {
        signOptions.expiresIn = this.accessTokenExpiresIn;
      }

      return jwt.sign(tokenPayload, this.accessTokenSecret, signOptions);
    } catch (error) {
      throw new Error(`Access Token 생성 실패: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh Token 생성
   */
  generateRefreshToken(payload: { id: string; email: string }): string {
    try {
      const tokenPayload = {
        sub: payload.id,
        email: payload.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      };

      // TypeScript 5.8.3 호환성을 위한 타입 안전한 처리
      const signOptions: jwt.SignOptions = {
        algorithm: 'HS256',
        issuer: this.issuer, // JWT 표준 클레임으로 issuer 설정
      };

      // expiresIn 타입 안전 처리 (jsonwebtoken StringValue 호환)
      if (typeof this.refreshTokenExpiresIn === 'string') {
        signOptions.expiresIn = this.refreshTokenExpiresIn as any;
      } else if (typeof this.refreshTokenExpiresIn === 'number') {
        signOptions.expiresIn = this.refreshTokenExpiresIn;
      }

      return jwt.sign(tokenPayload, this.refreshTokenSecret, signOptions);
    } catch (error) {
      throw new Error(`Refresh Token 생성 실패: ${(error as Error).message}`);
    }
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
   * Refresh Token 검증
   */
  verifyRefreshToken(token: string): {
    id: string;
    email: string;
  } | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
      }) as any;

      // 토큰 타입 검증
      if (decoded.type !== 'refresh') {
        return null;
      }

      // 필수 클레임 검증
      if (!decoded.sub || !decoded.email) {
        return null;
      }

      return {
        id: decoded.sub,
        email: decoded.email,
      };
    } catch (error) {
      this.logTokenError('Refresh Token 검증 실패', error);
      return null;
    }
  }

  /**
   * 토큰 만료 시간 반환 (초 단위)
   */
  getTokenExpirationTime(): number {
    const expiresIn = this.accessTokenExpiresIn;

    if (typeof expiresIn === 'number') {
      return expiresIn;
    }

    // 문자열 형태의 만료 시간을 초로 변환
    return this.parseExpirationTime(expiresIn);
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
  private validateSecrets(): void {
    const minSecretLength = 32;

    if (this.accessTokenSecret.length < minSecretLength) {
      throw new Error(
        `JWT_ACCESS_SECRET은 최소 ${minSecretLength}자 이상이어야 합니다`
      );
    }

    if (this.refreshTokenSecret.length < minSecretLength) {
      throw new Error(
        `JWT_REFRESH_SECRET은 최소 ${minSecretLength}자 이상이어야 합니다`
      );
    }

    if (this.accessTokenSecret === this.refreshTokenSecret) {
      throw new Error('Access Token과 Refresh Token의 시크릿은 달라야 합니다');
    }
  }

  /**
   * 만료 시간 문자열을 초로 변환
   */
  private parseExpirationTime(expiresIn: string): number {
    const timeUnit = expiresIn.slice(-1);
    const timeValue = parseInt(expiresIn.slice(0, -1), 10);

    if (isNaN(timeValue)) {
      throw new Error(`잘못된 만료 시간 형식: ${expiresIn}`);
    }

    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 60 * 60;
      case 'd':
        return timeValue * 60 * 60 * 24;
      default:
        throw new Error(`지원하지 않는 시간 단위: ${timeUnit}`);
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

// ========================================
// JWT 환경변수 설정 예시 (README용)
// ========================================
/*
# .env 파일 예시
JWT_ACCESS_SECRET=your-super-secret-access-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-different-super-secret-refresh-key-at-least-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=user-service

# 개발 환경용 (실제 운영에서는 더 복잡한 키 사용)
JWT_ACCESS_SECRET=dev-access-secret-key-for-development-only-32chars
JWT_REFRESH_SECRET=dev-refresh-secret-key-for-development-only-32chars
*/
