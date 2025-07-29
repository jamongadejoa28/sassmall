// ========================================
// Product Entity - Domain 계층 (단순화된 버전)
// src/entities/Product.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * Product 생성 데이터 인터페이스 (단순화)
 */
export interface CreateProductData {
  name: string;
  description: string;
  originalPrice: number; // 원가 (필수)
  discountPercentage?: number; // 할인율 (0-100, 선택)
  categoryId: string;
  brand: string;
  sku: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
  imageUrls?: string[];
  thumbnailUrl?: string;
}

/**
 * Product 복원 데이터 인터페이스 (단순화)
 */
export interface RestoreProductData extends CreateProductData {
  id: string;
  price: number; // 계산된 할인가
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product 업데이트 데이터 인터페이스 (단순화)
 */
export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number; // 판매가 수정
  originalPrice?: number; // 원가 수정
  discountPercentage?: number; // 할인율 수정 (0-100)
  brand?: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
  imageUrls?: string[];
  thumbnailUrl?: string;
}

/**
 * Product 요약 정보 인터페이스 (단순화)
 */
export interface ProductSummary {
  id: string;
  name: string;
  price: number;
  originalPrice: number | undefined;
  brand: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  hasDiscount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product Entity - 상품 도메인 객체 (단순화된 버전)
 *
 * 책임:
 * 1. 상품 정보 관리 (이름, 설명, 가격, 브랜드 등)
 * 2. 상품 상태 관리 (활성/비활성, 추천 여부)
 * 3. 할인 가격 관리 (originalPrice 기반)
 * 4. 평점 및 리뷰 정보 관리
 * 5. 이미지 정보 관리
 * 6. 비즈니스 규칙 검증
 */
export class Product {
  private constructor(
    private readonly id: string,
    private name: string,
    private description: string,
    private price: number, // 계산된 할인가
    private originalPrice: number, // 원가
    private discountPercentage: number, // 할인율 (0-100)
    private readonly categoryId: string,
    private brand: string,
    private readonly sku: string,
    private rating: number = 0,
    private reviewCount: number = 0,
    private imageUrls: string[] = [],
    private thumbnailUrl: string | undefined,
    private weight?: number,
    private dimensions?: {
      width: number;
      height: number;
      depth: number;
    },
    private tags: string[] = [],
    private _isActive: boolean = true,
    private _isFeatured: boolean = false,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 새로운 Product 생성 (단순화된 버전)
   */
  static create(data: CreateProductData): Product {
    // 1. 입력 데이터 검증
    Product.validateCreateData(data);

    // 2. 할인율과 할인가 계산
    const discountPercentage = data.discountPercentage || 0;
    const calculatedPrice = Math.round(data.originalPrice * (1 - discountPercentage / 100) * 100) / 100;

    // 3. Product 인스턴스 생성
    const now = new Date();
    return new Product(
      uuidv4(),
      data.name.trim(),
      data.description.trim(),
      calculatedPrice, // 계산된 할인가
      data.originalPrice, // 원가
      discountPercentage, // 할인율
      data.categoryId.trim(),
      data.brand.trim(),
      data.sku.trim().toUpperCase(),
      0, // 초기 평점
      0, // 초기 리뷰 수
      data.imageUrls || [],
      data.thumbnailUrl,
      data.weight,
      data.dimensions,
      data.tags || [],
      true, // 기본적으로 활성 상태
      false, // 기본적으로 추천 상품 아님
      now,
      now
    );
  }

  /**
   * 기존 Product 복원 (DB에서 불러올 때)
   */
  static restore(data: RestoreProductData): Product {
    // 기본 검증만 수행 (DB 데이터는 이미 검증된 것으로 가정)
    if (!data.id || !data.name || !data.sku) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new Product(
      data.id,
      data.name,
      data.description,
      data.price, // 계산된 할인가
      data.originalPrice, // 원가
      data.discountPercentage || 0, // 할인율
      data.categoryId,
      data.brand,
      data.sku,
      data.rating,
      data.reviewCount,
      data.imageUrls || [],
      data.thumbnailUrl,
      data.weight,
      data.dimensions,
      data.tags || [],
      data.isActive,
      data.isFeatured,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증 메서드
  // ========================================

  private static validateCreateData(data: CreateProductData): void {
    // 상품명 검증
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("상품명은 필수입니다");
    }
    if (data.name.trim().length > 300) {
      throw new Error("상품명은 300자를 초과할 수 없습니다");
    }

    // 원가 검증
    if (!data.originalPrice || data.originalPrice <= 0) {
      throw new Error("원가는 0보다 커야 합니다");
    }

    // 할인율 검증
    if (data.discountPercentage !== undefined) {
      if (data.discountPercentage < 0 || data.discountPercentage > 100) {
        throw new Error("할인율은 0-100 범위여야 합니다");
      }
    }

    // SKU 검증 (영문, 숫자, 하이픈만 허용)
    if (!data.sku || !data.sku.trim()) {
      throw new Error("SKU는 필수입니다");
    }
    const skuPattern = /^[A-Za-z0-9\-]+$/;
    if (!skuPattern.test(data.sku.trim())) {
      throw new Error("SKU는 영문, 숫자, 하이픈만 허용됩니다");
    }

    // 브랜드명 검증
    if (!data.brand || data.brand.trim().length === 0) {
      throw new Error("브랜드명은 필수입니다");
    }
    if (data.brand.trim().length > 100) {
      throw new Error("브랜드명은 100자를 초과할 수 없습니다");
    }

    // 카테고리 ID 검증
    if (!data.categoryId || data.categoryId.trim().length === 0) {
      throw new Error("카테고리 ID는 필수입니다");
    }

    // 설명 검증
    if (!data.description || data.description.trim().length === 0) {
      throw new Error("상품 설명은 필수입니다");
    }
  }

  // ========================================
  // Getter 메서드
  // ========================================

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPrice(): number {
    return this.price;
  }

  getCategoryId(): string {
    return this.categoryId;
  }

  getBrand(): string {
    return this.brand;
  }

  getSku(): string {
    return this.sku;
  }

  getWeight(): number | undefined {
    return this.weight;
  }

  getDimensions():
    | { width: number; height: number; depth: number }
    | undefined {
    return this.dimensions;
  }

  getTags(): string[] {
    return [...this.tags]; // 복사본 반환
  }

  isActive(): boolean {
    return this._isActive;
  }

  getOriginalPrice(): number {
    return this.originalPrice;
  }

  getDiscountPercentage(): number {
    return this.discountPercentage;
  }


  getRating(): number {
    return this.rating;
  }

  getReviewCount(): number {
    return this.reviewCount;
  }

  getImageUrls(): string[] {
    return [...this.imageUrls]; // 복사본 반환
  }

  getThumbnailUrl(): string | undefined {
    return this.thumbnailUrl;
  }

  isFeatured(): boolean {
    return this._isFeatured;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ========================================
  // 비즈니스 로직 메서드
  // ========================================

  /**
   * 할인 여부 확인 (원가가 현재가보다 높으면 할인)
   */
  hasDiscount(): boolean {
    return this.originalPrice !== undefined && this.originalPrice > this.price;
  }

  /**
   * 할인율 계산 (퍼센트)
   */
  getDiscountRate(): number {
    if (!this.hasDiscount() || !this.originalPrice) {
      return 0;
    }
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }

  /**
   * 할인 금액 계산
   */
  getDiscountAmount(): number {
    if (!this.hasDiscount() || !this.originalPrice) {
      return 0;
    }
    return this.originalPrice - this.price;
  }

  /**
   * 할인된 가격 반환 (현재 판매가격과 동일)
   */
  getDiscountPrice(): number | undefined {
    // 할인이 있는 경우 현재 price가 할인된 가격
    if (this.hasDiscount()) {
      return this.price;
    }
    return undefined;
  }

  /**
   * 상품 활성화
   */
  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * 상품 비활성화
   */
  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * 상품 정보 업데이트 (단순화된 버전)
   */
  updateDetails(data: UpdateProductData): void {
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("상품명은 필수입니다");
      }
      if (data.name.trim().length > 300) {
        throw new Error("상품명은 300자를 초과할 수 없습니다");
      }
      this.name = data.name.trim();
    }

    if (data.description !== undefined) {
      if (data.description.trim().length === 0) {
        throw new Error("상품 설명은 필수입니다");
      }
      this.description = data.description.trim();
    }

    // 가격 관련 업데이트는 originalPrice와 discountPercentage로부터 계산
    let shouldRecalculatePrice = false;

    if (data.originalPrice !== undefined) {
      if (data.originalPrice <= 0) {
        throw new Error("원가는 0보다 커야 합니다");
      }
      this.originalPrice = data.originalPrice;
      shouldRecalculatePrice = true;
    }

    if (data.discountPercentage !== undefined) {
      if (data.discountPercentage < 0 || data.discountPercentage > 100) {
        throw new Error("할인율은 0-100 사이여야 합니다");
      }
      this.discountPercentage = data.discountPercentage;
      shouldRecalculatePrice = true;
    }

    // originalPrice나 discountPercentage가 변경되면 price 재계산
    if (shouldRecalculatePrice) {
      this.price = Math.round(this.originalPrice * (1 - this.discountPercentage / 100) * 100) / 100;
    }

    // 직접 price 설정은 더 이상 허용하지 않음 (originalPrice + discountPercentage로만 계산)

    if (data.brand !== undefined) {
      if (data.brand.trim().length === 0) {
        throw new Error("브랜드명은 필수입니다");
      }
      if (data.brand.trim().length > 100) {
        throw new Error("브랜드명은 100자를 초과할 수 없습니다");
      }
      this.brand = data.brand.trim();
    }

    if (data.weight !== undefined) {
      this.weight = data.weight;
    }

    if (data.dimensions !== undefined) {
      this.dimensions = { ...data.dimensions };
    }

    if (data.tags !== undefined) {
      this.tags = [...data.tags];
    }

    if (data.imageUrls !== undefined) {
      this.imageUrls = [...data.imageUrls];
    }

    if (data.thumbnailUrl !== undefined) {
      this.thumbnailUrl = data.thumbnailUrl;
    }

    this.updatedAt = new Date();
  }

  /**
   * 추천 상품 설정
   */
  setFeatured(isFeatured: boolean): void {
    this._isFeatured = isFeatured;
    this.updatedAt = new Date();
  }

  /**
   * 평점 업데이트 (리뷰 시스템에서 호출)
   */
  updateRating(newRating: number, newReviewCount: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new Error("평점은 0-5 사이여야 합니다");
    }
    if (newReviewCount < 0) {
      throw new Error("리뷰 수는 0 이상이어야 합니다");
    }

    this.rating = newRating;
    this.reviewCount = newReviewCount;
    this.updatedAt = new Date();
  }

  /**
   * 이미지 추가
   */
  addImage(imageUrl: string): void {
    if (!imageUrl || imageUrl.trim().length === 0) {
      throw new Error("이미지 URL은 필수입니다");
    }

    if (!this.imageUrls.includes(imageUrl)) {
      this.imageUrls.push(imageUrl);
      this.updatedAt = new Date();
    }
  }

  /**
   * 이미지 제거
   */
  removeImage(imageUrl: string): void {
    const index = this.imageUrls.indexOf(imageUrl);
    if (index > -1) {
      this.imageUrls.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  // ========================================
  // 검색 및 필터링 메서드
  // ========================================

  /**
   * 검색 쿼리 매치 여부 확인
   */
  matchesSearchQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const searchableText = [
      this.name.toLowerCase(),
      this.description.toLowerCase(),
      this.brand.toLowerCase(),
      ...this.tags.map((tag) => tag.toLowerCase()),
    ].join(" ");

    return searchableText.includes(lowerQuery);
  }

  /**
   * 가격 범위 필터링
   */
  isInPriceRange(minPrice: number, maxPrice: number): boolean {
    return this.price >= minPrice && this.price <= maxPrice;
  }

  /**
   * 브랜드 매치 여부 확인
   */
  matchesBrand(brand: string): boolean {
    return this.brand.toLowerCase() === brand.toLowerCase();
  }

  /**
   * 평점 범위 필터링
   */
  isInRatingRange(minRating: number): boolean {
    return this.rating >= minRating;
  }

  // ========================================
  // 도메인 규칙 메서드
  // ========================================

  /**
   * 판매 가능 여부 확인
   */
  isAvailableForSale(): boolean {
    return this._isActive;
  }

  /**
   * 인기 상품인지 확인 (평점 4.0 이상, 리뷰 10개 이상)
   */
  isPopular(): boolean {
    return this.rating >= 4.0 && this.reviewCount >= 10;
  }

  /**
   * 고평점 상품인지 확인 (평점 4.5 이상)
   */
  isHighRated(): boolean {
    return this.rating >= 4.5;
  }

  /**
   * 신상품인지 확인 (30일 이내)
   */
  isNewProduct(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.createdAt > thirtyDaysAgo;
  }

  /**
   * 메인 이미지 URL 반환
   */
  getMainImageUrl(): string | undefined {
    return this.thumbnailUrl || (this.imageUrls.length > 0 ? this.imageUrls[0] : undefined);
  }

  /**
   * SEO 친화적 슬러그 생성
   */
  generateSlug(): string {
    return this.name
      .toLowerCase()
      .replace(/[^\w\s가-힣-]/g, "") // 특수문자 제거 (한글 포함)
      .replace(/\s+/g, "-") // 공백을 하이픈으로
      .trim();
  }

  /**
   * 상품 요약 정보 반환 (단순화된 버전)
   */
  getSummary(): ProductSummary {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      originalPrice: this.originalPrice ?? undefined,
      brand: this.brand,
      rating: this.rating,
      reviewCount: this.reviewCount,
      isActive: this._isActive,
      isFeatured: this._isFeatured,
      hasDiscount: this.hasDiscount(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ========================================
  // 도메인 이벤트 (향후 확장용)
  // ========================================

  /**
   * 상품이 생성될 때 발생하는 도메인 이벤트
   */
  getCreatedEvent() {
    return {
      type: "ProductCreated",
      productId: this.id,
      productName: this.name,
      categoryId: this.categoryId,
      price: this.price,
      brand: this.brand,
      isFeatured: this._isFeatured,
      createdAt: this.createdAt,
    };
  }

  /**
   * 상품 정보가 업데이트될 때 발생하는 도메인 이벤트
   */
  getUpdatedEvent() {
    return {
      type: "ProductUpdated",
      productId: this.id,
      productName: this.name,
      price: this.price,
      originalPrice: this.originalPrice,
      rating: this.rating,
      reviewCount: this.reviewCount,
      hasDiscount: this.hasDiscount(),
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 상품이 추천 상품으로 설정될 때 발생하는 도메인 이벤트
   */
  getFeaturedEvent() {
    return {
      type: "ProductFeatured",
      productId: this.id,
      productName: this.name,
      isFeatured: this._isFeatured,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 상품 평점이 업데이트될 때 발생하는 도메인 이벤트
   */
  getRatingUpdatedEvent() {
    return {
      type: "ProductRatingUpdated",
      productId: this.id,
      productName: this.name,
      rating: this.rating,
      reviewCount: this.reviewCount,
      isPopular: this.isPopular(),
      isHighRated: this.isHighRated(),
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 상품이 비활성화될 때 발생하는 도메인 이벤트
   */
  getDeactivatedEvent() {
    return {
      type: "ProductDeactivated",
      productId: this.id,
      productName: this.name,
      deactivatedAt: this.updatedAt,
    };
  }
}
