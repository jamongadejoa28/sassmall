// ========================================
// Email Service Mock - Framework 계층
// src/framework/services/MockEmailService.ts
// ========================================

import { EmailService } from '../../usecases/types';

/**
 * MockEmailService - 이메일 발송 모킹 서비스 (Framework 계층)
 *
 * 역할:
 * - 이메일 발송 시뮬레이션 (실제 발송 X)
 * - 개발/테스트 환경용 로깅
 * - EmailService 인터페이스 구현
 * - 템플릿 기반 메시지 생성
 *
 * 특징:
 * - 개발 환경 최적화
 * - 상세한 로깅 정보
 * - 실패 시뮬레이션 지원
 * - 템플릿 시스템 내장
 */
export class MockEmailService implements EmailService {
  private readonly isTestEnvironment: boolean;
  private readonly shouldSimulateFailure: boolean;
  private readonly failureRate: number;

  constructor() {
    this.isTestEnvironment = process.env.NODE_ENV === 'test';
    this.shouldSimulateFailure = process.env.EMAIL_SIMULATE_FAILURE === 'true';
    this.failureRate = parseFloat(process.env.EMAIL_FAILURE_RATE || '0') || 0;
  }

  /**
   * 이메일 인증 메일 발송
   */
  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    try {
      // 실패 시뮬레이션 체크
      if (this.shouldSimulateRandomFailure()) {
        throw new Error('이메일 서비스 일시적 오류 (시뮬레이션)');
      }

      const emailContent = this.generateVerificationEmailContent(email, token);

      // 개발 환경용 상세 로깅
      this.logEmailSent('이메일 인증', email, emailContent);

      // 테스트 환경에서는 로깅 최소화
      if (this.isTestEnvironment) {
        console.log(`✅ [Mock Email] 인증 메일 발송: ${email}`);
      }

      return true;
    } catch (error) {
      this.logEmailError('이메일 인증 발송 실패', email, error);
      return false;
    }
  }

  /**
   * 비밀번호 재설정 메일 발송
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
      if (this.shouldSimulateRandomFailure()) {
        throw new Error('이메일 서비스 일시적 오류 (시뮬레이션)');
      }

      const emailContent = this.generatePasswordResetEmailContent(email, token);

      this.logEmailSent('비밀번호 재설정', email, emailContent);

      if (this.isTestEnvironment) {
        console.log(`✅ [Mock Email] 비밀번호 재설정 메일 발송: ${email}`);
      }

      return true;
    } catch (error) {
      this.logEmailError('비밀번호 재설정 메일 발송 실패', email, error);
      return false;
    }
  }

  /**
   * 환영 메일 발송
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      if (this.shouldSimulateRandomFailure()) {
        throw new Error('이메일 서비스 일시적 오류 (시뮬레이션)');
      }

      const emailContent = this.generateWelcomeEmailContent(email, name);

      this.logEmailSent('환영 메일', email, emailContent);

      if (this.isTestEnvironment) {
        console.log(`✅ [Mock Email] 환영 메일 발송: ${email}`);
      }

      return true;
    } catch (error) {
      this.logEmailError('환영 메일 발송 실패', email, error);
      return false;
    }
  }

  /**
   * 이메일 인증 콘텐츠 생성
   */
  private generateVerificationEmailContent(
    email: string,
    token: string
  ): EmailContent {
    const verificationLink = this.generateVerificationLink(token);

    return {
      to: email,
      subject: '[Shopping Mall] 이메일 인증을 완료해주세요',
      html: `
        <h2>이메일 인증</h2>
        <p>안녕하세요!</p>
        <p>Shopping Mall 회원가입을 완료하기 위해 아래 링크를 클릭해주세요:</p>
        <p><a href="${verificationLink}" style="color: #007bff;">이메일 인증하기</a></p>
        <p>링크가 작동하지 않는 경우, 다음 URL을 복사해서 브라우저에 붙여넣어주세요:</p>
        <p><code>${verificationLink}</code></p>
        <p>이 링크는 24시간 후 만료됩니다.</p>
        <br>
        <p>감사합니다.<br>Shopping Mall 팀</p>
      `,
      text: `
이메일 인증

안녕하세요!

Shopping Mall 회원가입을 완료하기 위해 다음 링크를 방문해주세요:
${verificationLink}

이 링크는 24시간 후 만료됩니다.

감사합니다.
Shopping Mall 팀
      `,
      metadata: {
        type: 'verification',
        token: token,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 비밀번호 재설정 콘텐츠 생성
   */
  private generatePasswordResetEmailContent(
    email: string,
    token: string
  ): EmailContent {
    const resetLink = this.generatePasswordResetLink(token);

    return {
      to: email,
      subject: '[Shopping Mall] 비밀번호 재설정',
      html: `
        <h2>비밀번호 재설정</h2>
        <p>안녕하세요!</p>
        <p>비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭해주세요:</p>
        <p><a href="${resetLink}" style="color: #007bff;">비밀번호 재설정하기</a></p>
        <p>링크가 작동하지 않는 경우:</p>
        <p><code>${resetLink}</code></p>
        <p><strong>이 링크는 1시간 후 만료됩니다.</strong></p>
        <p>이 요청을 하지 않으셨다면 이 메일을 무시해주세요.</p>
        <br>
        <p>감사합니다.<br>Shopping Mall 팀</p>
      `,
      text: `
비밀번호 재설정

안녕하세요!

비밀번호 재설정을 요청하셨습니다. 다음 링크를 방문해주세요:
${resetLink}

이 링크는 1시간 후 만료됩니다.
이 요청을 하지 않으셨다면 이 메일을 무시해주세요.

감사합니다.
Shopping Mall 팀
      `,
      metadata: {
        type: 'password_reset',
        token: token,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 환영 메일 콘텐츠 생성
   */
  private generateWelcomeEmailContent(
    email: string,
    name: string
  ): EmailContent {
    return {
      to: email,
      subject: '[Shopping Mall] 가입을 환영합니다! 🎉',
      html: `
        <h2>가입을 환영합니다! 🎉</h2>
        <p>${name}님, 안녕하세요!</p>
        <p>Shopping Mall에 가입해주셔서 감사합니다.</p>
        <p>이제 다양한 상품을 둘러보고 쇼핑을 즐기실 수 있습니다!</p>
        
        <h3>🛍️ 지금 바로 시작해보세요:</h3>
        <ul>
          <li>인기 상품 둘러보기</li>
          <li>개인 맞춤 추천 상품 확인</li>
          <li>첫 구매 할인 혜택 받기</li>
        </ul>
        
        <p>궁금한 점이 있으시면 언제든 고객센터로 연락주세요.</p>
        <br>
        <p>감사합니다.<br>Shopping Mall 팀</p>
      `,
      text: `
가입을 환영합니다! 🎉

${name}님, 안녕하세요!

Shopping Mall에 가입해주셔서 감사합니다.
이제 다양한 상품을 둘러보고 쇼핑을 즐기실 수 있습니다!

🛍️ 지금 바로 시작해보세요:
- 인기 상품 둘러보기
- 개인 맞춤 추천 상품 확인
- 첫 구매 할인 혜택 받기

궁금한 점이 있으시면 언제든 고객센터로 연락주세요.

감사합니다.
Shopping Mall 팀
      `,
      metadata: {
        type: 'welcome',
        userName: name,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 이메일 발송 성공 로깅
   */
  private logEmailSent(
    type: string,
    email: string,
    content: EmailContent
  ): void {
    if (this.isTestEnvironment) return;

    console.log(`
📧 =============== Mock Email Sent ===============
📨 Type: ${type}
📍 To: ${email}
📑 Subject: ${content.subject}
🕐 Timestamp: ${new Date().toISOString()}
📋 Content Preview:
${this.truncateText(content.text, 200)}
================================================
    `);
  }

  /**
   * 이메일 발송 실패 로깅
   */
  private logEmailError(message: string, email: string, error: unknown): void {
    console.error(`
❌ =============== Mock Email Error ===============
📨 Email: ${email}
❌ Error: ${message}
🔍 Details: ${(error as Error).message}
🕐 Timestamp: ${new Date().toISOString()}
==================================================
    `);
  }

  /**
   * 인증 링크 생성
   */
  private generateVerificationLink(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/verify-email?token=${token}`;
  }

  /**
   * 비밀번호 재설정 링크 생성
   */
  private generatePasswordResetLink(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/reset-password?token=${token}`;
  }

  /**
   * 랜덤 실패 시뮬레이션
   */
  private shouldSimulateRandomFailure(): boolean {
    if (!this.shouldSimulateFailure || this.failureRate <= 0) {
      return false;
    }
    return Math.random() < this.failureRate;
  }

  /**
   * 텍스트 자르기 유틸리티
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// ========================================
// 이메일 콘텐츠 타입 정의
// ========================================
interface EmailContent {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata: Record<string, any>;
}

// ========================================
// 환경변수 설정 예시 (README용)
// ========================================
/*
# .env 파일 예시
FRONTEND_URL=http://localhost:3000
EMAIL_SIMULATE_FAILURE=false
EMAIL_FAILURE_RATE=0.1

# 개발 환경에서 이메일 실패 테스트
EMAIL_SIMULATE_FAILURE=true
EMAIL_FAILURE_RATE=0.2  # 20% 확률로 실패
*/
