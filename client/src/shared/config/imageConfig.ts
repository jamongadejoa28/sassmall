// imageConfig.ts - 이미지 관련 환경별 설정
// Clean Architecture: Infrastructure Layer
// 위치: client/src/shared/config/imageConfig.ts

/**
 * 이미지 관련 환경별 설정
 */
export const IMAGE_CONFIG = {
  /**
   * 환경별 베이스 URL
   * - 개발환경: 로컬 파일 시스템 사용 (빈 문자열)
   * - 프로덕션: CDN URL 사용
   */
  baseUrl:
    process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_CDN_URL || 'https://cdn.yourdomain.com'
      : '',

  /**
   * 이미지 로드 실패 시 사용할 플레이스홀더 이미지
   */
  fallbackImagePath: '/images/placeholder.png',

  /**
   * 지원하는 이미지 확장자
   */
  supportedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],

  /**
   * 기본 이미지 확장자
   */
  defaultExtension: '.png',

  /**
   * 이미지 품질 설정
   */
  quality: {
    thumbnail: 'w_300,h_300,c_fill,f_auto,q_auto',
    medium: 'w_600,h_600,c_fill,f_auto,q_auto',
    large: 'w_1200,h_1200,c_fill,f_auto,q_auto',
  },

  /**
   * 카테고리별 이미지 폴더 매핑
   * 향후 확장을 위해 설정으로 분리
   */
  categoryFolderMap: {
    '도서/문구': 'books',
    전자제품: 'electronics',
    '컴퓨터/노트북': 'computers',
    '의류/패션': 'fashion',
    생활용품: 'household',
  } as const,
} as const;

/**
 * 이미지 URL에 품질 파라미터를 추가합니다.
 *
 * @param url 원본 이미지 URL
 * @param quality 품질 설정 ('thumbnail' | 'medium' | 'large')
 * @returns 품질 파라미터가 추가된 URL
 */
export const addImageQuality = (
  url: string,
  quality: keyof typeof IMAGE_CONFIG.quality
): string => {
  if (IMAGE_CONFIG.baseUrl && url.startsWith(IMAGE_CONFIG.baseUrl)) {
    const qualityParam = IMAGE_CONFIG.quality[quality];
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${qualityParam}`;
  }
  return url;
};

/**
 * 환경별 이미지 URL을 생성합니다.
 *
 * @param path 이미지 경로
 * @returns 전체 이미지 URL
 */
export const buildImageUrl = (path: string): string => {
  if (path.startsWith('http')) {
    // 이미 완전한 URL인 경우 그대로 반환
    return path;
  }

  return `${IMAGE_CONFIG.baseUrl}${path}`;
};
