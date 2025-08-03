export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number; // 원가 (항상 포함)
  discountPercentage: number; // 할인율 (항상 포함, 0일 수 있음)
  discountPrice?: number; // 할인된 가격 - 호환성을 위해 유지
  original_price?: number; // 기존 호환성을 위해 유지
  discount_percent?: number; // 할인율 (0-100) - 기존 호환성
  brand: string;
  sku: string;
  category: Category;
  rating: number;
  review_count: number;
  image_urls: string[];
  images?: string[]; // 상품 이미지 URL 배열
  thumbnail_url?: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  min_order_quantity?: number;
  max_order_quantity?: number;
  inventory: {
    available_quantity: number;
    inventory_status: string;
    location: string;
    low_stock_threshold?: number;
  };
  createdAt: string;
  updatedAt: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductFilter {
  search?: string;
  category?: string;
  brand?: string[];
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  rating?: number | undefined;
  tags?: string[];
  sortBy?: 'price' | 'rating' | 'review_count' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  isActive?: boolean | undefined; // 상품 활성화 상태 필터 (관리자용: undefined=모든상품, true/false=특정상태)
}

// 상품평 인터페이스 추가
export interface ProductReview {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  content: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

// 상품문의 인터페이스 추가
export interface ProductQnA {
  id: string;
  product_id: string;
  user_name: string;
  question: string;
  answer?: string;
  is_answered: boolean;
  answered_by?: string;
  answered_at?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
