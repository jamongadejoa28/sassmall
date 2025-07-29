// ========================================
// Inventory Entity - Domain 계층
// src/entities/Inventory.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * 재고 상태 열거형
 */
export enum InventoryStatus {
  SUFFICIENT = "sufficient", // 재고 충분
  LOW_STOCK = "low_stock", // 재고 부족
  OUT_OF_STOCK = "out_of_stock", // 재고 없음
}

/**
 * Inventory 생성 데이터 인터페이스
 */
export interface CreateInventoryData {
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  location: string;
}

/**
 * Inventory 복원 데이터 인터페이스
 */
export interface RestoreInventoryData {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  location: string;
  lastRestockedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory 요약 정보 인터페이스
 */
export interface InventorySummary {
  id: string;
  productId: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  status: InventoryStatus;
  location: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lowStockThreshold: number;
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory Entity - 재고 도메인 객체
 *
 * 책임:
 * 1. 재고 수량 관리 (전체, 예약, 사용 가능)
 * 2. 재고 상태 자동 계산 (충분/부족/품절)
 * 3. 재고 입고/출고 처리
 * 4. 예약 재고 관리
 * 5. 재고 임계값 관리
 * 6. 재고 변동 이벤트 발행
 * 7. 비즈니스 규칙 검증
 */
export class Inventory {
  private lastRestockQuantity: number = 0; // 최근 입고 수량 추적

  private constructor(
    private readonly id: string,
    private readonly productId: string,
    private quantity: number,
    private reservedQuantity: number,
    private lowStockThreshold: number,
    private readonly location: string,
    private lastRestockedAt?: Date,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 새로운 Inventory 생성
   */
  static create(data: CreateInventoryData): Inventory {
    // 1. 입력 데이터 검증
    Inventory.validateCreateData(data);

    // 2. Inventory 인스턴스 생성
    const now = new Date();
    return new Inventory(
      uuidv4(),
      data.productId.trim(),
      data.quantity,
      data.reservedQuantity,
      data.lowStockThreshold,
      data.location.trim(),
      undefined, // 새 재고는 입고 이력 없음
      now,
      now
    );
  }

  /**
   * 기존 Inventory 복원 (DB에서 불러올 때)
   */
  static restore(data: RestoreInventoryData): Inventory {
    // 기본 검증만 수행
    if (!data.id || !data.productId) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new Inventory(
      data.id,
      data.productId,
      data.quantity,
      data.reservedQuantity,
      data.lowStockThreshold,
      data.location,
      data.lastRestockedAt,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증 메서드
  // ========================================

  private static validateCreateData(data: CreateInventoryData): void {
    // 상품 ID 검증
    if (!data.productId || data.productId.trim().length === 0) {
      throw new Error("상품 ID는 필수입니다");
    }

    // 재고 수량 검증
    if (data.quantity < 0) {
      throw new Error("재고 수량은 0 이상이어야 합니다");
    }

    // 예약 수량 검증
    if (data.reservedQuantity < 0) {
      throw new Error("예약 수량은 0 이상이어야 합니다");
    }

    // 예약 수량이 전체 수량을 초과하지 않는지 검증
    if (data.reservedQuantity > data.quantity) {
      throw new Error("예약 수량은 전체 수량을 초과할 수 없습니다");
    }

    // 부족 임계값 검증
    if (data.lowStockThreshold < 0) {
      throw new Error("부족 임계값은 0 이상이어야 합니다");
    }

    // 위치 검증
    if (!data.location || data.location.trim().length === 0) {
      throw new Error("저장 위치는 필수입니다");
    }
  }

  // ========================================
  // Getter 메서드
  // ========================================

  getId(): string {
    return this.id;
  }

  getProductId(): string {
    return this.productId;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getReservedQuantity(): number {
    return this.reservedQuantity;
  }

  getLowStockThreshold(): number {
    return this.lowStockThreshold;
  }

  getLocation(): string {
    return this.location;
  }

  getLastRestockedAt(): Date | undefined {
    return this.lastRestockedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ========================================
  // 계산된 속성 메서드
  // ========================================

  /**
   * 사용 가능한 재고 수량 계산
   */
  getAvailableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }

  /**
   * 재고 상태 계산
   */
  getStatus(): InventoryStatus {
    const availableQuantity = this.getAvailableQuantity();

    if (availableQuantity === 0) {
      return InventoryStatus.OUT_OF_STOCK;
    }

    if (availableQuantity <= this.lowStockThreshold) {
      return InventoryStatus.LOW_STOCK;
    }

    return InventoryStatus.SUFFICIENT;
  }

  /**
   * 재고 부족 여부 확인
   */
  isLowStock(): boolean {
    return this.getStatus() === InventoryStatus.LOW_STOCK;
  }

  /**
   * 재고 품절 여부 확인
   */
  isOutOfStock(): boolean {
    return this.getStatus() === InventoryStatus.OUT_OF_STOCK;
  }

  // ========================================
  // 재고 변동 메서드
  // ========================================

  /**
   * 재고 입고 처리
   */
  restock(quantity: number, reason: string): void {
    // 입력 검증
    if (quantity <= 0) {
      throw new Error("입고 수량은 0보다 커야 합니다");
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error("입고 이유는 필수입니다");
    }

    // 재고 수량 증가
    this.quantity += quantity;
    this.lastRestockQuantity = quantity; // 최근 입고 수량 저장
    this.lastRestockedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 재고 출고 처리
   */
  reduce(quantity: number, reason: string): void {
    // 입력 검증
    if (quantity <= 0) {
      throw new Error("출고 수량은 0보다 커야 합니다");
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error("출고 이유는 필수입니다");
    }

    // 사용 가능한 재고 확인
    const availableQuantity = this.getAvailableQuantity();
    if (quantity > availableQuantity) {
      throw new Error("출고 수량이 사용 가능한 재고를 초과합니다");
    }

    // 재고 수량 감소
    this.quantity -= quantity;
    this.updatedAt = new Date();
  }

  /**
   * 재고 예약 처리
   */
  reserve(quantity: number, reason: string): void {
    // 입력 검증
    if (quantity <= 0) {
      throw new Error("예약 수량은 0보다 커야 합니다");
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error("예약 이유는 필수입니다");
    }

    // 사용 가능한 재고 확인
    const availableQuantity = this.getAvailableQuantity();
    if (quantity > availableQuantity) {
      throw new Error("예약 수량이 사용 가능한 재고를 초과합니다");
    }

    // 예약 수량 증가
    this.reservedQuantity += quantity;
    this.updatedAt = new Date();
  }

  /**
   * 예약 해제 처리
   */
  releaseReservation(quantity: number, reason: string): void {
    // 입력 검증
    if (quantity <= 0) {
      throw new Error("해제 수량은 0보다 커야 합니다");
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error("해제 이유는 필수입니다");
    }

    // 예약 수량 확인
    if (quantity > this.reservedQuantity) {
      throw new Error("해제할 예약 수량이 현재 예약량을 초과합니다");
    }

    // 예약 수량 감소
    this.reservedQuantity -= quantity;
    this.updatedAt = new Date();
  }

  /**
   * 부족 임계값 업데이트
   */
  updateLowStockThreshold(threshold: number): void {
    if (threshold < 0) {
      throw new Error("부족 임계값은 0 이상이어야 합니다");
    }

    this.lowStockThreshold = threshold;
    this.updatedAt = new Date();
  }

  // ========================================
  // 정보 제공 메서드
  // ========================================

  /**
   * 재고 요약 정보 반환
   */
  getSummary(): InventorySummary {
    const summary: InventorySummary = {
      id: this.id,
      productId: this.productId,
      quantity: this.quantity,
      availableQuantity: this.getAvailableQuantity(),
      reservedQuantity: this.reservedQuantity,
      status: this.getStatus(),
      location: this.location,
      isLowStock: this.isLowStock(),
      isOutOfStock: this.isOutOfStock(),
      lowStockThreshold: this.lowStockThreshold,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    // lastRestockedAt는 조건부로 추가
    if (this.lastRestockedAt !== undefined) {
      summary.lastRestockedAt = this.lastRestockedAt;
    }

    return summary;
  }

  // ========================================
  // 도메인 이벤트 (향후 확장용)
  // ========================================

  /**
   * 재고 입고 이벤트
   */
  getRestockEvent() {
    return {
      type: "InventoryRestocked",
      productId: this.productId,
      quantity: this.quantity,
      restockQuantity: this.lastRestockQuantity, // 최근 입고 수량 사용
      location: this.location,
      restockedAt: this.lastRestockedAt || this.updatedAt,
    };
  }

  /**
   * 재고 부족 이벤트
   */
  getLowStockEvent() {
    return {
      type: "InventoryLowStock",
      productId: this.productId,
      availableQuantity: this.getAvailableQuantity(),
      threshold: this.lowStockThreshold,
      location: this.location,
      detectedAt: this.updatedAt,
    };
  }

  /**
   * 재고 품절 이벤트
   */
  getOutOfStockEvent() {
    return {
      type: "InventoryOutOfStock",
      productId: this.productId,
      location: this.location,
      detectedAt: this.updatedAt,
    };
  }
}
