// ImageService.ts - 이미지 URL 생성을 담당하는 서비스
// Clean Architecture: Infrastructure Layer
// 위치: client/src/shared/services/ImageService.ts

interface ProductData {
  sku: string;
  image_urls?: string[];
  thumbnail_url?: string | null;
  category: {
    slug: string;
  };
}

/**
 * 상품 이미지 URL 생성을 담당하는 서비스 클래스
 *
 * 이미지 소스 우선순위:
 * 1. API 제공 이미지 URL (image_urls)
 * 2. 썸네일 URL (thumbnail_url)
 * 3. 로컬 파일 시스템 규칙 기반 경로
 */
export class ImageService {
  private readonly categorySlugMap = new Map<string, string>([
    // 실제 DB에서 오는 한글 slug와 이미지 폴더명 매핑
    ['전자제품', 'electronics'],
    ['컴퓨터노트북', 'computers'],
    ['도서문구', 'books'],
    ['의류패션', 'fashion'],
    ['생활용품', 'household'],
    // 영어 slug도 지원 (혹시 변경될 경우 대비)
    ['electronics', 'electronics'],
    ['computers', 'computers'],
    ['books', 'books'],
    ['fashion', 'fashion'],
    ['household', 'household'],
  ]);

  private readonly baseImagePath = '/images';
  private readonly defaultImageExtension = '.png';

  /**
   * 상품 데이터를 기반으로 이미지 URL을 생성합니다.
   *
   * @param product 상품 데이터
   * @returns 이미지 URL
   */
  getProductImageUrl(product: ProductData): string {
    // 1순위: API에서 제공하는 이미지 URL 배열
    if (this.hasValidImageUrls(product.image_urls)) {
      return product.image_urls![0];
    }

    // 2순위: 썸네일 URL
    if (this.hasValidThumbnailUrl(product.thumbnail_url)) {
      return product.thumbnail_url!;
    }

    // 3순위: 로컬 파일 시스템 규칙 기반 경로 생성
    return this.buildLocalImagePath(product);
  }

  /**
   * 이미지 URL 배열이 유효한지 확인합니다.
   */
  private hasValidImageUrls(imageUrls?: string[]): boolean {
    return (
      imageUrls !== undefined &&
      imageUrls.length > 0 &&
      imageUrls[0].trim() !== ''
    );
  }

  /**
   * 썸네일 URL이 유효한지 확인합니다.
   */
  private hasValidThumbnailUrl(thumbnailUrl?: string | null): boolean {
    return (
      thumbnailUrl !== null &&
      thumbnailUrl !== undefined &&
      thumbnailUrl.trim() !== ''
    );
  }

  /**
   * 로컬 파일 시스템 규칙에 따라 이미지 경로를 생성합니다.
   *
   * @param product 상품 데이터
   * @returns 로컬 이미지 경로
   */
  private buildLocalImagePath(product: ProductData): string {
    const categoryFolder = this.resolveCategoryFolder(product.category.slug);
    return `${this.baseImagePath}/${categoryFolder}/${product.sku}${this.defaultImageExtension}`;
  }

  /**
   * 카테고리 slug를 실제 폴더명으로 변환합니다.
   *
   * @param categorySlug 카테고리 slug
   * @returns 실제 폴더명
   */
  private resolveCategoryFolder(categorySlug: string): string {
    // 1. 직접 매핑이 있는지 확인
    if (this.categorySlugMap.has(categorySlug)) {
      return this.categorySlugMap.get(categorySlug)!;
    }

    // 2. 소문자로 변환해서 매핑이 있는지 확인
    const lowerSlug = categorySlug.toLowerCase();
    if (this.categorySlugMap.has(lowerSlug)) {
      return this.categorySlugMap.get(lowerSlug)!;
    }

    // 3. 기본값으로 소문자 변환된 slug 반환
    return lowerSlug;
  }

  /**
   * 새로운 카테고리 매핑을 추가합니다.
   *
   * @param slug 카테고리 slug
   * @param folderName 실제 폴더명
   */
  addCategoryMapping(slug: string, folderName: string): void {
    this.categorySlugMap.set(slug, folderName);
  }

  /**
   * 모든 카테고리 매핑을 반환합니다. (디버깅용)
   */
  getCategoryMappings(): Map<string, string> {
    return new Map(this.categorySlugMap);
  }
}

// 싱글톤 인스턴스 export
export const imageService = new ImageService();
