// ========================================
// 세션 유틸리티 - 비로그인 사용자 고유 식별
// client/src/utils/sessionUtils.ts
// ========================================

import { v4 as uuidv4 } from 'uuid';

// ========================================
// 세션 ID 관리
// ========================================

const SESSION_STORAGE_KEY = 'shopping_session_id';
const SESSION_FINGERPRINT_KEY = 'shopping_fingerprint';

/**
 * 브라우저 고유 식별자 생성
 * 디바이스 특성 기반으로 고유한 fingerprint 생성
 */
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    window.screen.width + 'x' + window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    canvas.toDataURL(),
  ].join('|');

  // 간단한 해시 생성
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32비트 정수로 변환
  }

  return Math.abs(hash).toString(36);
}

/**
 * 세션 ID 생성
 * UUID + 브라우저 fingerprint 조합으로 고유성 보장
 */
export function generateSessionId(): string {
  const uuid = uuidv4();
  const fingerprint = generateBrowserFingerprint();
  const timestamp = Date.now().toString(36);

  return `${uuid}-${fingerprint}-${timestamp}`;
}

/**
 * 세션 ID 가져오기
 * 기존 세션이 있으면 반환, 없으면 새로 생성
 */
export function getSessionId(): string {
  // 1. localStorage에서 기존 세션 확인
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    // 2. 새 세션 생성
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);

    // 3. 생성 시간 기록
    localStorage.setItem(
      `${SESSION_STORAGE_KEY}_created`,
      Date.now().toString()
    );
  }

  return sessionId;
}

/**
 * 세션 ID 갱신
 * 로그인 시나 보안상 필요할 때 사용
 */
export function refreshSessionId(): string {
  const newSessionId = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  localStorage.setItem(`${SESSION_STORAGE_KEY}_created`, Date.now().toString());

  return newSessionId;
}

/**
 * 세션 ID 삭제
 * 로그아웃 시나 세션 초기화가 필요할 때 사용
 */
export function clearSessionId(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(`${SESSION_STORAGE_KEY}_created`);
  localStorage.removeItem(SESSION_FINGERPRINT_KEY);
}

/**
 * 세션 정보 조회
 * 디버깅이나 상태 확인용
 */
export function getSessionInfo(): {
  sessionId: string;
  createdAt: Date | null;
  fingerprint: string;
} {
  const sessionId = getSessionId();
  const createdTimestamp = localStorage.getItem(
    `${SESSION_STORAGE_KEY}_created`
  );
  const createdAt = createdTimestamp
    ? new Date(parseInt(createdTimestamp))
    : null;
  const fingerprint = generateBrowserFingerprint();

  return {
    sessionId,
    createdAt,
    fingerprint,
  };
}

/**
 * 세션 유효성 검사
 * 만료된 세션이나 손상된 세션 감지
 */
export function isSessionValid(): boolean {
  const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  const createdTimestamp = localStorage.getItem(
    `${SESSION_STORAGE_KEY}_created`
  );

  if (!sessionId || !createdTimestamp) {
    return false;
  }

  // 30일 후 만료
  const SESSION_EXPIRY_DAYS = 30;
  const createdDate = new Date(parseInt(createdTimestamp));
  const expiryDate = new Date(
    createdDate.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  return new Date() < expiryDate;
}

/**
 * 세션 정리
 * 만료된 세션이나 잘못된 세션 정리
 */
export function cleanupSession(): void {
  if (!isSessionValid()) {
    clearSessionId();
  }
}

// ========================================
// 세션 이벤트 리스너
// ========================================

/**
 * 페이지 로드 시 세션 초기화
 */
export function initializeSession(): string {
  // 만료된 세션 정리
  cleanupSession();

  // 세션 ID 확보
  const sessionId = getSessionId();

  return sessionId;
}

/**
 * 브라우저 종료 시 임시 데이터 정리
 */
export function setupSessionCleanup(): void {
  // beforeunload 이벤트에서는 localStorage는 유지하고 sessionStorage만 정리
  window.addEventListener('beforeunload', () => {
    // sessionStorage의 임시 데이터만 정리
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('temp_')) {
        sessionStorage.removeItem(key);
      }
    });
  });
}
