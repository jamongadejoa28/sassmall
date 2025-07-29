import { useAuthStore } from '@frameworks/state/authStore';

export class LogoutUseCase {
  execute(): void {
    const { logout } = useAuthStore.getState();

    // 로그아웃 처리
    logout();

    // 개발 환경에서만 로그아웃 처리 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ LogoutUseCase executed - User logged out');
    }

    // 추가적인 정리 작업 (토큰 무효화, 캐시 정리 등)
    // TODO: API 서버에 로그아웃 요청 전송 (토큰 무효화)
  }
}
