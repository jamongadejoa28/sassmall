// ========================================
// BcryptPasswordService - 비밀번호 해싱 및 검증 서비스
// ========================================

import bcrypt from 'bcrypt';
import { PasswordService } from '../../usecases/types';

export class BcryptPasswordService implements PasswordService {
  private readonly saltRounds = 10;

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      console.error('비밀번호 해싱 오류:', error);
      throw new Error('비밀번호 해싱에 실패했습니다.');
    }
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('비밀번호 비교 오류:', error);
      throw new Error('비밀번호 확인에 실패했습니다.');
    }
  }
}