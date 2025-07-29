// types/CartProduct.ts - 단순화된 스키마에 맞춰 수정
export interface CartProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  brand: string;
  sku: string;
  rating: number;
  review_count: number;
  is_featured: boolean;
  min_order_quantity: number;
  max_order_quantity: number;
  tags: string[];
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity?: number;
    status: string;
    lowStockThreshold?: number;
    location?: string;
  };
  image_urls: string[];
  imageUrls?: string[]; // Product Service 호환용
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}
