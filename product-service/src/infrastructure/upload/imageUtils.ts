// ========================================
// Image Utilities
// src/infrastructure/upload/imageUtils.ts
// ========================================

import fs from 'fs';
import path from 'path';

/**
 * 업로드된 파일들로부터 이미지 URL 배열 생성
 * API Gateway를 통해 이미지를 제공하도록 URL 생성
 * 캐시 버스팅을 위한 타임스탬프 추가
 */
export function generateImageUrls(files: Express.Multer.File[], baseUrl: string): string[] {
  // API Gateway URL 사용 (CORS 문제 해결)
  const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';
  const timestamp = Date.now();
  return files.map(file => `${apiGatewayUrl}/uploads/products/${file.filename}?v=${timestamp}`);
}

/**
 * 썸네일 URL 생성
 */
export function generateThumbnailUrl(
  imageUrls: string[],
  thumbnailIndex: number = 0
): string | undefined {
  if (imageUrls.length === 0) return undefined;
  
  const index = Math.max(0, Math.min(thumbnailIndex, imageUrls.length - 1));
  return imageUrls[index];
}

/**
 * 파일 삭제 (상품 삭제 시 사용)
 */
export function deleteImageFiles(imageUrls: string[]): void {
  imageUrls.forEach(url => {
    try {
      // URL에서 파일명 추출
      const filename = path.basename(url);
      const filePath = path.join(process.cwd(), 'uploads', 'products', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete image file: ${url}`, error);
    }
  });
}

/**
 * 기본 이미지 URL 생성 (업로드된 이미지가 없을 때)
 */
export function getPlaceholderImageUrl(baseUrl: string): string {
  return `${baseUrl}/images/placeholder.png`;
}