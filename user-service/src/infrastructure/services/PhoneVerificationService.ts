// ========================================
// Mock 휴대폰 본인인증 서비스
// src/infrastructure/services/PhoneVerificationService.ts
// ========================================

import { v4 as uuidv4 } from 'uuid';

export interface VerificationSession {
  id: string;
  phoneNumber: string;
  sessionId: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface VerificationRequest {
  phoneNumber: string;
}

export interface VerificationResult {
  success: boolean;
  sessionId?: string;
  message?: string;
  error?: string;
}

export interface VerificationStatus {
  sessionId: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  phoneNumber: string;
  isExpired: boolean;
  remainingTime?: number;
}

/**
 * Mock 휴대폰 본인인증 서비스
 * 실제 PASS 인증과 유사한 플로우를 제공하지만 실제 인증은 하지 않음
 */
export class PhoneVerificationService {
  private sessions: Map<string, VerificationSession> = new Map();
  private readonly VERIFICATION_TIMEOUT = 5 * 60 * 1000; // 5분

  /**
   * 휴대폰 인증 요청 시작
   */
  async requestVerification(request: VerificationRequest): Promise<VerificationResult> {
    try {
      // 휴대폰 번호 형식 검증
      if (!this.isValidPhoneNumber(request.phoneNumber)) {
        return {
          success: false,
          error: '올바른 휴대폰 번호 형식이 아닙니다. (010-0000-0000)',
        };
      }

      // 기존 진행중인 세션 확인 및 정리
      this.cleanupExpiredSessions();
      const existingSession = this.findActiveSession(request.phoneNumber);
      
      if (existingSession) {
        return {
          success: false,
          error: '이미 진행중인 인증이 있습니다. 잠시 후 다시 시도해주세요.',
        };
      }

      // 새 인증 세션 생성
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.VERIFICATION_TIMEOUT);

      const session: VerificationSession = {
        id: uuidv4(),
        phoneNumber: request.phoneNumber,
        sessionId,
        status: 'pending',
        createdAt: now,
        expiresAt,
      };

      this.sessions.set(sessionId, session);

      console.log(`📱 [Mock PASS] 인증 세션 생성: ${request.phoneNumber} (세션: ${sessionId})`);

      return {
        success: true,
        sessionId,
        message: 'PASS 인증이 요청되었습니다.',
      };
    } catch (error) {
      console.error('휴대폰 인증 요청 오류:', error);
      return {
        success: false,
        error: '인증 요청 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 인증 상태 확인
   */
  async getVerificationStatus(sessionId: string): Promise<VerificationStatus | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    const now = new Date();
    const isExpired = now > session.expiresAt;
    
    // 만료된 세션 처리
    if (isExpired && session.status === 'pending') {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
    }

    const remainingTime = isExpired ? 0 : Math.max(0, session.expiresAt.getTime() - now.getTime());

    return {
      sessionId: session.sessionId,
      status: session.status,
      phoneNumber: session.phoneNumber,
      isExpired,
      remainingTime: Math.floor(remainingTime / 1000), // 초 단위
    };
  }

  /**
   * Mock 인증 완료 처리 (개발/테스트용)
   */
  async completeVerification(sessionId: string): Promise<VerificationResult> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: '유효하지 않은 인증 세션입니다.',
      };
    }

    const now = new Date();
    
    // 만료 확인
    if (now > session.expiresAt) {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
      
      return {
        success: false,
        error: '인증 시간이 만료되었습니다. 다시 시도해주세요.',
      };
    }

    // 이미 완료된 세션 확인
    if (session.status === 'completed') {
      return {
        success: false,
        error: '이미 완료된 인증입니다.',
      };
    }

    // 인증 완료 처리
    session.status = 'completed';
    session.completedAt = now;
    this.sessions.set(sessionId, session);

    console.log(`✅ [Mock PASS] 인증 완료: ${session.phoneNumber} (세션: ${sessionId})`);

    return {
      success: true,
      sessionId,
      message: '휴대폰 본인인증이 완료되었습니다.',
    };
  }

  /**
   * 인증된 휴대폰 번호 확인
   */
  async getVerifiedPhoneNumber(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || session.status !== 'completed') {
      return null;
    }

    return session.phoneNumber;
  }

  /**
   * 휴대폰 번호 형식 검증
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // 010-0000-0000 또는 01000000000 형식 허용
    const phoneRegex = /^010[-]?\d{4}[-]?\d{4}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * 활성 세션 찾기
   */
  private findActiveSession(phoneNumber: string): VerificationSession | null {
    const now = new Date();
    
    for (const session of this.sessions.values()) {
      if (
        session.phoneNumber === phoneNumber &&
        session.status === 'pending' &&
        now <= session.expiresAt
      ) {
        return session;
      }
    }
    
    return null;
  }

  /**
   * 만료된 세션 정리
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt && session.status !== 'completed') {
        session.status = 'expired';
        expiredSessions.push(sessionId);
      }
    }

    // 완료된 세션은 1시간 후 삭제
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.completedAt && session.completedAt < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      console.log(`🧹 [Mock PASS] 만료된 세션 ${expiredSessions.length}개 정리 완료`);
    }
  }

  /**
   * 세션 통계 (개발용)
   */
  getSessionStats(): {
    total: number;
    pending: number;
    completed: number;
    expired: number;
    failed: number;
  } {
    const stats = {
      total: this.sessions.size,
      pending: 0,
      completed: 0,
      expired: 0,
      failed: 0,
    };

    for (const session of this.sessions.values()) {
      stats[session.status]++;
    }

    return stats;
  }
}