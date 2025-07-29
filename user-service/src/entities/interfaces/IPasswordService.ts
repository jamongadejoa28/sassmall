// ========================================
// IPasswordService - 비밀번호 서비스 인터페이스
// ========================================

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
}