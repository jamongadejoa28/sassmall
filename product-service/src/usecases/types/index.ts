// ========================================
// Product Use Cases 타입 정의
// src/usecases/types/index.ts
// ========================================

import { Product } from "../../entities/Product";
import { Category } from "../../entities/Category";
import { Inventory } from "../../entities/Inventory";
import { Result } from "../../shared/types/Result";



// ===== 상품 생성 관련 타입 =====
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
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
  discountPercent?: number; // 할인율 (0-100)
  imageUrls?: string[]; // 업로드된 이미지 URL 배열
  thumbnailUrl?: string | undefined; // 썸네일 이미지 URL
  initialStock: {
    quantity: number;
    location: string;
    lowStockThreshold: number;
  };
}

export interface CreateProductResponse {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    brand: string;
    sku: string;
    weight?: number;
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
    tags: string[];
    isActive: boolean;
    createdAt: Date;
  };
  inventory: {
    id: string;
    productId: string;
    quantity: number;
    availableQuantity: number;
    location: string;
    lowStockThreshold: number;
    status: string;
  };
}

// ===== 상품 상세 조회 관련 타입 =====
export interface GetProductDetailRequest {
  productId: string;
  includeInventory?: boolean;
}

export interface GetProductDetailResponse {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    effectivePrice: number; // 할인가 적용된 가격
    categoryId: string;
    categoryName: string;
    categoryPath: string; // "전자제품 > 컴퓨터 > 노트북"
    brand: string;
    sku: string;
    weight?: number;
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
    tags: string[];
    isActive: boolean;
    hasDiscount: boolean;
    originalPrice?: number; // Show original price for discount comparison
    createdAt: Date;
    updatedAt: Date;
  };
  inventory?: {
    quantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
    isLowStock: boolean;
    isOutOfStock: boolean;
    location: string;
    lowStockThreshold: number;
    lastRestockedAt?: Date;
  };
}

// ===== 상품 목록 조회 관련 타입 =====
export interface GetProductsRequest {
  page?: number;
  limit?: number;
  categoryId?: string;
  brand?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: "name" | "price" | "createdAt";
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
}

export interface GetProductsResponse {
  products: Array<{
    id: string;
    name: string;
    price: number;
    effectivePrice: number;
    brand: string;
    categoryName: string;
    tags: string[];
    isActive: boolean;
    hasDiscount: boolean;
    availableQuantity: number;
    isLowStock: boolean;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    categoryId?: string;
    brand?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    search?: string;
  };
}

// ===== 상품 업데이트 관련 타입 =====
export interface UpdateProductRequest {
  productId: string;
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
  discountPercent?: number;
  imageUrls?: string[] | undefined;
  thumbnailUrl?: string | undefined;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  images?: string[];
}

export interface UpdateProductResponse {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    effectivePrice: number;
    brand: string;
    hasDiscount: boolean;
    originalPrice?: number; // Show original price for discount comparison
    updatedAt: Date;
  };
}

// ===== 재고 관리 관련 타입 =====
export interface RestockInventoryRequest {
  productId: string;
  quantity: number;
  reason: string;
  location?: string;
}

export interface RestockInventoryResponse {
  inventory: {
    id: string;
    productId: string;
    quantity: number;
    availableQuantity: number;
    status: string;
    lastRestockedAt: Date;
  };
  restockQuantity: number;
}

export interface ReserveInventoryRequest {
  productId: string;
  quantity: number;
  reason: string;
}

export interface ReserveInventoryResponse {
  inventory: {
    id: string;
    productId: string;
    quantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
  };
  reservedQuantity: number;
}

// ===== Repository 인터페이스 (Dependency Inversion) =====
export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  countByCategory(categoryId: string): Promise<number>;
  findByCategory(
    categoryId: string,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{ products: Product[]; total: number }>;
  search(options: {
    search?: string;
    categoryId?: string;
    categoryName?: string;
    categoryNames?: string[];
    brand?: string | string[];
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    isActive?: boolean;
  }): Promise<{ products: Product[]; total: number }>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<boolean>;
}

export interface CategoryRepository {
  save(category: Category): Promise<Category>;
  create(category: Category): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findAll(options?: {
    isActive?: boolean;
  }): Promise<Category[]>;
  findMany(options?: {
    isActive?: boolean;
    sortBy?: 'sort_order' | 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Category[]>;
  update(category: Category): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface InventoryRepository {
  save(inventory: Inventory): Promise<Inventory>;
  findByProductId(productId: string): Promise<Inventory | null>;
  findByLocation(location: string): Promise<Inventory[]>;
  findLowStock(threshold?: number): Promise<Inventory[]>;
  update(inventory: Inventory): Promise<Inventory>;
  delete(id: string): Promise<void>;
}

// ===== 외부 서비스 인터페이스 =====
export interface EventPublisher {
  publish(event: any): Promise<void>;
}

export interface ImageUploadService {
  uploadProductImages(productId: string, images: Buffer[]): Promise<string[]>;
  deleteProductImages(productId: string, imageUrls: string[]): Promise<void>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

// ===== Use Case 공통 인터페이스 =====
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse>>;
}

// ===== 에러 타입 정의 =====
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ExternalServiceError";
  }
}

// ===== 도메인 이벤트 타입 =====
export interface ProductCreatedEvent {
  type: "ProductCreated";
  productId: string;
  productName: string;
  categoryId: string;
  price: number;
  brand: string;
  createdAt: Date;
}

export interface InventoryCreatedEvent {
  type: "InventoryCreated";
  productId: string;
  quantity: number;
  location: string;
  createdAt: Date;
}

export interface InventoryRestockedEvent {
  type: "InventoryRestocked";
  productId: string;
  quantity: number;
  restockQuantity: number;
  location: string;
  restockedAt: Date;
}

export interface InventoryLowStockEvent {
  type: "InventoryLowStock";
  productId: string;
  availableQuantity: number;
  threshold: number;
  location: string;
  detectedAt: Date;
}
