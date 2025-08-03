// Product.ts - Product Entity
// Clean Architecture: Entities Layer
// 위치: client/src/entities/product/Product.ts

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ProductInventory {
  availableQuantity: number;
  inventory_status: string;
  location?: string;
}

export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly original_price: number | null,
    public readonly discountPrice: number | null,
    public readonly discountPercentage: number,
    public readonly brand: string,
    public readonly sku: string,
    public readonly rating: number,
    public readonly review_count: number,
    public readonly is_featured: boolean,
    public readonly is_active: boolean,
    public readonly tags: string[],
    public readonly category: Category,
    public readonly inventory: ProductInventory,
    public readonly image_urls: string[],
    public readonly thumbnail_url: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  /**
   * 재고가 있는지 확인합니다.
   */
  public isInStock(): boolean {
    return this.inventory.availableQuantity > 0;
  }

  /**
   * 요청한 수량만큼 구매 가능한지 확인합니다.
   */
  public isAvailableForQuantity(quantity: number): boolean {
    return this.inventory.availableQuantity >= quantity;
  }

  /**
   * 할인된 가격이 있는지 확인합니다.
   */
  public hasDiscount(): boolean {
    return this.discountPercentage > 0;
  }

  /**
   * 현재 판매 가격을 반환합니다 (할인가 우선).
   */
  public getCurrentPrice(): number {
    if (this.hasDiscount() && this.original_price) {
      return this.original_price * (1 - this.discountPercentage / 100);
    }
    return this.price;
  }

  /**
   * 가격을 한국 원화 형식으로 포맷팅합니다.
   */
  public getFormattedPrice(): string {
    return new Intl.NumberFormat('ko-KR').format(this.getCurrentPrice()) + '원';
  }

  /**
   * 원래 가격을 포맷팅합니다 (할인 전 가격).
   */
  public getFormattedOriginalPrice(): string {
    const originalPrice = this.original_price || this.price;
    return new Intl.NumberFormat('ko-KR').format(originalPrice) + '원';
  }

  /**
   * 할인 정보를 반환합니다.
   */
  public getDiscountInfo(): {
    hasDiscount: boolean;
    percentage: number;
    savedAmount: number;
  } {
    if (!this.hasDiscount()) {
      return { hasDiscount: false, percentage: 0, savedAmount: 0 };
    }

    const originalPrice = this.original_price || this.price;
    const discountedPrice = this.getCurrentPrice();
    const savedAmount = originalPrice - discountedPrice;

    return {
      hasDiscount: true,
      percentage: this.discountPercentage,
      savedAmount: savedAmount,
    };
  }

  /**
   * 평점을 별 문자열로 반환합니다.
   */
  public getRatingStars(): string {
    return (
      '★'.repeat(Math.floor(this.rating)) +
      '☆'.repeat(5 - Math.floor(this.rating))
    );
  }

  /**
   * 재고 상태를 텍스트로 반환합니다.
   */
  public getStockStatusText(): string {
    const quantity = this.inventory.availableQuantity;
    if (quantity === 0) {
      return '품절';
    } else if (quantity < 20) {
      return '품절 임박';
    } else {
      return '재고 충분';
    }
  }

  /**
   * 재고 상태에 따른 CSS 클래스를 반환합니다.
   */
  public getStockStatusColor(): string {
    const quantity = this.inventory.availableQuantity;
    if (quantity === 0) {
      return 'text-red-600 bg-red-50';
    } else if (quantity < 20) {
      return 'text-yellow-600 bg-yellow-50';
    } else {
      return 'text-green-600 bg-green-50';
    }
  }

  /**
   * 첫 번째 이미지 URL을 반환합니다 (썸네일 우선).
   */
  public getPrimaryImageUrl(): string {
    if (this.thumbnail_url) {
      return this.thumbnail_url;
    }
    if (this.image_urls && this.image_urls.length > 0) {
      return this.image_urls[0];
    }
    // Fallback to placeholder image instead of static category-based path
    const publicUrl = process.env.PUBLIC_URL || '';
    return `${publicUrl}/images/placeholder.png`;
  }

  /**
   * 상품이 추천 상품인지 확인합니다.
   */
  public isFeatured(): boolean {
    return this.is_featured;
  }

  /**
   * 상품이 활성 상태인지 확인합니다.
   */
  public isActive(): boolean {
    return this.is_active;
  }

  /**
   * API 응답에서 Product 인스턴스를 생성합니다.
   */
  public static fromApiResponse(data: any): Product {
    return new Product(
      data.id,
      data.name,
      data.description,
      data.price,
      data.original_price || null,
      data.discountPrice || null,
      data.discountPercentage || 0,
      data.brand,
      data.sku,
      data.rating || 0,
      data.review_count || 0,
      data.is_featured || false,
      data.is_active !== false, // 기본값 true
      data.tags || [],
      data.category,
      {
        availableQuantity: data.inventory?.availableQuantity || 0,
        inventory_status: data.inventory?.inventory_status || 'out_of_stock',
        location: data.inventory?.location,
      },
      data.image_urls || [],
      data.thumbnail_url || null,
      data.createdAt || data.created_at || '',
      data.updatedAt || data.updated_at || ''
    );
  }
}
