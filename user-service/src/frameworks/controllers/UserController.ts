// ========================================
// User Controller - 사용자 관련 HTTP 요청 처리
// ========================================

import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '../../usecases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../usecases/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../usecases/RefreshTokenUseCase';
import { GetUserProfileUseCase } from '../../usecases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../usecases/UpdateUserProfileUseCase';
import { DeactivateUserUseCase } from '../../usecases/DeactivateUserUseCase';
import { VerifyPasswordUseCase } from '../../usecases/VerifyPasswordUseCase';

// Admin Use Cases
import { GetUsersUseCase } from '../../usecases/GetUsersUseCase';
import { GetUserStatsUseCase } from '../../usecases/GetUserStatsUseCase';
import { UpdateUserStatusUseCase } from '../../usecases/UpdateUserStatusUseCase';
import { DeleteUserUseCase } from '../../usecases/DeleteUserUseCase';

export class UserController {
  private readonly registerUserUseCase: RegisterUserUseCase;
  private readonly loginUserUseCase: LoginUserUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;
  private readonly getUserProfileUseCase: GetUserProfileUseCase;
  private readonly updateUserProfileUseCase: UpdateUserProfileUseCase;
  private readonly deactivateUserUseCase: DeactivateUserUseCase;
  private readonly verifyPasswordUseCase: VerifyPasswordUseCase;

  // Admin Use Cases
  private readonly getUsersUseCase: GetUsersUseCase;
  private readonly getUserStatsUseCase: GetUserStatsUseCase;
  private readonly updateUserStatusUseCase: UpdateUserStatusUseCase;
  private readonly deleteUserUseCase: DeleteUserUseCase;

  constructor(
    registerUserUseCase: RegisterUserUseCase,
    loginUserUseCase: LoginUserUseCase,
    refreshTokenUseCase: RefreshTokenUseCase,
    getUserProfileUseCase: GetUserProfileUseCase,
    updateUserProfileUseCase: UpdateUserProfileUseCase,
    deactivateUserUseCase: DeactivateUserUseCase,
    verifyPasswordUseCase: VerifyPasswordUseCase,
    getUsersUseCase: GetUsersUseCase,
    getUserStatsUseCase: GetUserStatsUseCase,
    updateUserStatusUseCase: UpdateUserStatusUseCase,
    deleteUserUseCase: DeleteUserUseCase
  ) {
    this.registerUserUseCase = registerUserUseCase;
    this.loginUserUseCase = loginUserUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.getUserProfileUseCase = getUserProfileUseCase;
    this.updateUserProfileUseCase = updateUserProfileUseCase;
    this.deactivateUserUseCase = deactivateUserUseCase;
    this.verifyPasswordUseCase = verifyPasswordUseCase;
    this.getUsersUseCase = getUsersUseCase;
    this.getUserStatsUseCase = getUserStatsUseCase;
    this.updateUserStatusUseCase = updateUserStatusUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
  }

  /**
   * 회원가입
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.registerUserUseCase.execute(req.body);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: '회원가입이 성공적으로 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '회원가입에 실패했습니다.',
          error: 'REGISTER_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 로그인
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.loginUserUseCase.execute(req.body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '로그인이 성공적으로 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '로그인에 실패했습니다.',
          error: 'LOGIN_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 토큰 갱신
   */
  public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.refreshTokenUseCase.execute(req.body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '토큰이 성공적으로 갱신되었습니다.',
          data: result.data,
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.error || '토큰 갱신에 실패했습니다.',
          error: 'REFRESH_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 조회
   */
  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      const result = await this.getUserProfileUseCase.execute({ userId });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '프로필 조회가 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || '사용자를 찾을 수 없습니다.',
          error: 'USER_NOT_FOUND',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 수정
   */
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      const result = await this.updateUserProfileUseCase.execute({
        userId,
        ...req.body,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '프로필 수정이 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '프로필 수정에 실패했습니다.',
          error: 'UPDATE_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 계정 비활성화
   */
  public deactivateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      const result = await this.deactivateUserUseCase.execute({ userId });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '계정이 비활성화되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '계정 비활성화에 실패했습니다.',
          error: 'DEACTIVATION_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 비밀번호 확인
   */
  public verifyPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { password } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          success: false,
          message: '비밀번호를 입력해주세요.',
          error: 'PASSWORD_REQUIRED',
          data: null,
        });
        return;
      }

      const result = await this.verifyPasswordUseCase.execute({ userId, password });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '비밀번호 확인이 완료되었습니다.',
          data: { verified: true },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '비밀번호가 일치하지 않습니다.',
          error: 'PASSWORD_VERIFICATION_FAILED',
          data: { verified: false },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  // ========================================
  // Admin 전용 메서드들
  // ========================================

  /**
   * 사용자 목록 조회 (관리자용)
   */
  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.',
          error: 'FORBIDDEN',
          data: null,
        });
        return;
      }

      const { page, limit, search, role, isActive } = req.query;

      const result = await this.getUsersUseCase.execute({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        search: search ? (search as string) : undefined,
        role: role ? (role as 'customer' | 'admin') : undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 목록 조회 성공',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 목록 조회에 실패했습니다.',
          error: 'FETCH_USERS_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 통계 조회 (관리자용)
   */
  public getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.',
          error: 'FORBIDDEN',
          data: null,
        });
        return;
      }

      const result = await this.getUserStatsUseCase.execute();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 통계 조회 성공',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 통계 조회에 실패했습니다.',
          error: 'FETCH_STATS_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 상태 변경 (관리자용)
   */
  public updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.',
          error: 'FORBIDDEN',
          data: null,
        });
        return;
      }

      const { userId } = req.params;
      const { isActive } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.',
          error: 'USER_ID_REQUIRED',
          data: null,
        });
        return;
      }

      // 자기 자신 비활성화 방지
      if (userId === req.user?.id && !isActive) {
        res.status(400).json({
          success: false,
          message: '자기 자신의 계정을 비활성화할 수 없습니다.',
          error: 'SELF_DEACTIVATION_FORBIDDEN',
          data: null,
        });
        return;
      }

      const result = await this.updateUserStatusUseCase.execute({
        userId,
        isActive,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 상태 변경 성공',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 상태 변경에 실패했습니다.',
          error: 'UPDATE_STATUS_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 정보 수정 (관리자용, 비밀번호 제외)
   */
  public updateUserByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.',
          error: 'FORBIDDEN',
          data: null,
        });
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.',
          error: 'USER_ID_REQUIRED',
          data: null,
        });
        return;
      }

      // 비밀번호 관련 필드 제거 (관리자는 비밀번호 수정 불가)
      const { password, confirmPassword, ...adminUpdateData } = req.body;

      const result = await this.updateUserProfileUseCase.execute({
        userId,
        ...adminUpdateData,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 정보 수정 성공',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 정보 수정에 실패했습니다.',
          error: 'UPDATE_USER_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 삭제 (관리자용)
   */
  public deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.',
          error: 'FORBIDDEN',
          data: null,
        });
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다.',
          error: 'USER_ID_REQUIRED',
          data: null,
        });
        return;
      }

      // 자기 자신 삭제 방지
      if (userId === req.user?.id) {
        res.status(400).json({
          success: false,
          message: '자기 자신의 계정을 삭제할 수 없습니다.',
          error: 'SELF_DELETION_FORBIDDEN',
          data: null,
        });
        return;
      }

      const result = await this.deleteUserUseCase.execute({ userId });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 삭제 성공',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 삭제에 실패했습니다.',
          error: 'DELETE_USER_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}