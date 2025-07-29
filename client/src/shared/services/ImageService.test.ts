// ImageService.test.ts - 이미지 서비스 테스트
// 위치: client/src/shared/services/ImageService.test.ts

import { ImageService } from './ImageService';

describe('ImageService', () => {
  let imageService: ImageService;

  beforeEach(() => {
    imageService = new ImageService();
  });

  describe('getProductImageUrl', () => {
    it('should return API image URL when available', () => {
      const product = {
        sku: 'TEST-SKU',
        image_urls: ['https://example.com/image.jpg'],
        category: { slug: 'electronics' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should return thumbnail URL when API images not available', () => {
      const product = {
        sku: 'TEST-SKU',
        image_urls: [],
        thumbnail_url: 'https://example.com/thumb.jpg',
        category: { slug: 'electronics' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('https://example.com/thumb.jpg');
    });

    it('should return local path for electronics category with Korean slug', () => {
      const product = {
        sku: 'DYSON-V15-DETECT',
        category: { slug: '전자제품' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/electronics/DYSON-V15-DETECT.png');
    });

    it('should return local path for computers category with Korean slug', () => {
      const product = {
        sku: 'MBA13-M2-256',
        category: { slug: '컴퓨터노트북' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/computers/MBA13-M2-256.png');
    });

    it('should return local path for household category with Korean slug', () => {
      const product = {
        sku: '3M-SCOTCH-SPONGE-6',
        category: { slug: '생활용품' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/household/3M-SCOTCH-SPONGE-6.png');
    });

    it('should return local path for books category with Korean slug', () => {
      const product = {
        sku: 'MONAMI-153-BLACK-12',
        category: { slug: '도서문구' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/books/MONAMI-153-BLACK-12.png');
    });

    it('should return local path for fashion category with Korean slug', () => {
      const product = {
        sku: 'NIKE-AF1-WHITE',
        category: { slug: '의류패션' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/fashion/NIKE-AF1-WHITE.png');
    });

    it('should handle English slug for electronics category', () => {
      const product = {
        sku: 'TEST-PRODUCT',
        category: { slug: 'electronics' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/electronics/TEST-PRODUCT.png');
    });

    it('should handle unknown category by using lowercase slug', () => {
      const product = {
        sku: 'UNKNOWN-PRODUCT',
        category: { slug: 'unknown-category' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/unknown-category/UNKNOWN-PRODUCT.png');
    });

    it('should handle category slug case insensitively', () => {
      const product = {
        sku: 'TEST-PRODUCT',
        category: { slug: 'ELECTRONICS' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/electronics/TEST-PRODUCT.png');
    });
  });

  describe('getCategoryMappings', () => {
    it('should return all category mappings', () => {
      const mappings = imageService.getCategoryMappings();

      expect(mappings.get('전자제품')).toBe('electronics');
      expect(mappings.get('컴퓨터노트북')).toBe('computers');
      expect(mappings.get('생활용품')).toBe('household');
      expect(mappings.get('도서문구')).toBe('books');
      expect(mappings.get('의류패션')).toBe('fashion');
    });
  });

  describe('addCategoryMapping', () => {
    it('should add new category mapping', () => {
      imageService.addCategoryMapping('새카테고리', 'new-category');

      const product = {
        sku: 'TEST-PRODUCT',
        category: { slug: '새카테고리' },
      };

      const result = imageService.getProductImageUrl(product);
      expect(result).toBe('/images/new-category/TEST-PRODUCT.png');
    });
  });
});
