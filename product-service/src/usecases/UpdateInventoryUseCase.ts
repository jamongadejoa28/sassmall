// ========================================
// Update Inventory UseCase - 재고 업데이트 유스케이스
// product-service/src/usecases/UpdateInventoryUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { Inventory } from "../entities/Inventory";
import { InventoryRepository } from "../repositories/InventoryRepository";
import { TYPES } from "../infrastructure/di/types";

export interface UpdateInventoryRequest {
  productId: string;
  quantity: number;
  operation: "decrease" | "increase" | "restock";
  reason?: string;
  orderNumber?: string;
}

export interface UpdateInventoryResponse {
  success: boolean;
  message?: string;
  data?: {
    productId: string;
    previousQuantity: number;
    newQuantity: number;
    operation: string;
  };
  error?: string;
}

@injectable()
export class UpdateInventoryUseCase {
  constructor(
    @inject(TYPES.InventoryRepository)
    private inventoryRepository: InventoryRepository
  ) {}

  /**
   * 재고 감소 (주문 완료 시)
   */
  async decreaseInventory(
    request: UpdateInventoryRequest
  ): Promise<UpdateInventoryResponse> {
    try {
      // 1. 재고 정보 조회
      const inventory = await this.inventoryRepository.findByProductId(
        request.productId
      );
      if (!inventory) {
        return {
          success: false,
          error: `상품 ID ${request.productId}의 재고 정보를 찾을 수 없습니다`,
        };
      }

      const previousQuantity = inventory.getAvailableQuantity();

      // 2. 재고 충분성 확인
      if (inventory.getAvailableQuantity() < request.quantity) {
        return {
          success: false,
          error: `재고가 부족합니다. 현재 재고: ${inventory.getAvailableQuantity()}, 요청량: ${request.quantity}`,
        };
      }

      // 3. 재고 감소 수행
      try {
        inventory.reduce(
          request.quantity,
          request.reason || "주문 완료"
        );
      } catch (reduceError) {
        return {
          success: false,
          error: reduceError instanceof Error ? reduceError.message : "재고 감소 실패",
        };
      }

      // 4. 변경사항 저장
      const savedInventory = await this.inventoryRepository.save(inventory);

      console.log(
        `재고 감소 완료 - 상품: ${request.productId}, 감소량: ${request.quantity}, 현재 재고: ${savedInventory.getAvailableQuantity()}`
      );

      return {
        success: true,
        message: "재고가 성공적으로 감소되었습니다",
        data: {
          productId: request.productId,
          previousQuantity,
          newQuantity: savedInventory.getAvailableQuantity(),
          operation: "decrease",
        },
      };
    } catch (error) {
      console.error("재고 감소 중 오류:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "재고 감소 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 재고 증가 (반품/취소 시)
   */
  async increaseInventory(
    request: UpdateInventoryRequest
  ): Promise<UpdateInventoryResponse> {
    try {
      // 1. 재고 정보 조회
      const inventory = await this.inventoryRepository.findByProductId(
        request.productId
      );
      if (!inventory) {
        return {
          success: false,
          error: `상품 ID ${request.productId}의 재고 정보를 찾을 수 없습니다`,
        };
      }

      const previousQuantity = inventory.getAvailableQuantity();

      // 2. 재고 증가 수행
      try {
        inventory.restock(
          request.quantity,
          request.reason || "주문 취소/반품"
        );
      } catch (restockError) {
        return {
          success: false,
          error: restockError instanceof Error ? restockError.message : "재고 증가 실패",
        };
      }

      // 3. 변경사항 저장
      const savedInventory = await this.inventoryRepository.save(inventory);

      console.log(
        `재고 증가 완료 - 상품: ${request.productId}, 증가량: ${request.quantity}, 현재 재고: ${savedInventory.getAvailableQuantity()}`
      );

      return {
        success: true,
        message: "재고가 성공적으로 증가되었습니다",
        data: {
          productId: request.productId,
          previousQuantity,
          newQuantity: savedInventory.getAvailableQuantity(),
          operation: "increase",
        },
      };
    } catch (error) {
      console.error("재고 증가 중 오류:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "재고 증가 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 재고 보충 (관리자용)
   */
  async restockInventory(
    request: UpdateInventoryRequest
  ): Promise<UpdateInventoryResponse> {
    try {
      // 1. 재고 정보 조회
      const inventory = await this.inventoryRepository.findByProductId(
        request.productId
      );
      if (!inventory) {
        return {
          success: false,
          error: `상품 ID ${request.productId}의 재고 정보를 찾을 수 없습니다`,
        };
      }

      const previousQuantity = inventory.getAvailableQuantity();

      // 2. 재고 보충 수행
      try {
        inventory.restock(
          request.quantity,
          request.reason || "관리자 재고 보충"
        );
      } catch (restockError) {
        return {
          success: false,
          error: restockError instanceof Error ? restockError.message : "재고 보충 실패",
        };
      }

      // 3. 변경사항 저장
      const savedInventory = await this.inventoryRepository.save(inventory);

      console.log(
        `재고 보충 완료 - 상품: ${request.productId}, 보충량: ${request.quantity}, 현재 재고: ${savedInventory.getAvailableQuantity()}`
      );

      return {
        success: true,
        message: "재고가 성공적으로 보충되었습니다",
        data: {
          productId: request.productId,
          previousQuantity,
          newQuantity: savedInventory.getAvailableQuantity(),
          operation: "restock",
        },
      };
    } catch (error) {
      console.error("재고 보충 중 오류:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "재고 보충 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 통합 재고 업데이트 메서드
   */
  async execute(
    request: UpdateInventoryRequest
  ): Promise<UpdateInventoryResponse> {
    try {
      // 입력 유효성 검증
      const validationError = this.validateRequest(request);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // 작업 타입에 따라 적절한 메서드 호출
      switch (request.operation) {
        case "decrease":
          return await this.decreaseInventory(request);
        case "increase":
          return await this.increaseInventory(request);
        case "restock":
          return await this.restockInventory(request);
        default:
          return {
            success: false,
            error: `지원하지 않는 작업 타입: ${request.operation}`,
          };
      }
    } catch (error) {
      console.error("재고 업데이트 중 오류:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "재고 업데이트 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 요청 유효성 검증
   */
  private validateRequest(request: UpdateInventoryRequest): string | null {
    if (!request.productId || request.productId.trim().length === 0) {
      return "상품 ID는 필수 항목입니다";
    }

    if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
      return "수량은 1 이상의 정수여야 합니다";
    }

    if (request.quantity > 999999) {
      return "수량이 너무 큽니다 (최대: 999,999)";
    }

    const validOperations = ["decrease", "increase", "restock"];
    if (!validOperations.includes(request.operation)) {
      return `유효하지 않은 작업 타입입니다. 사용 가능한 타입: ${validOperations.join(", ")}`;
    }

    return null; // 유효함
  }
}
