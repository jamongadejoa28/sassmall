// ========================================
// Get Orders Admin UseCase - 관리자 전용 주문 목록 조회
// order-service/src/usecases/GetOrdersAdminUseCase.ts
// ========================================

import { Order } from '../entities/Order';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderRepository, AdminOrderSearchCriteria } from '../adapters/OrderRepository';

export interface GetOrdersAdminRequest {
  search?: string;
  status?: OrderStatus;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  page?: number;
  limit?: number;
  sortBy?: 'orderedAt' | 'totalAmount' | 'status' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface GetOrdersAdminResponse {
  success: boolean;
  orders?: Order[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  errorMessage?: string;
}

/**
 * GetOrdersAdminUseCase - 관리자 전용 주문 목록 조회 유스케이스
 * 
 * 역할:
 * - 관리자가 모든 주문 목록을 조회할 수 있도록 함
 * - 페이징, 검색, 필터링, 정렬 기능 제공
 * - 주문 정보를 관리자 목적에 맞게 변환
 * 
 * 특징:
 * - 모든 사용자의 주문에 접근 가능
 * - 고급 필터링 및 검색 기능
 * - 성능 최적화를 위한 페이징 필수
 */
export class GetOrdersAdminUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(request: GetOrdersAdminRequest): Promise<GetOrdersAdminResponse> {
    try {
      // 입력 값 검증 및 기본값 설정
      const {
        search,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'orderedAt',
        sortOrder = 'desc'
      } = request;

      // 페이지 및 제한 값 검증
      if (page < 1) {
        return {
          success: false,
          errorMessage: '페이지 번호는 1 이상이어야 합니다'
        };
      }

      if (limit < 1 || limit > 100) {
        return {
          success: false,
          errorMessage: '페이지당 항목 수는 1-100 사이여야 합니다'
        };
      }

      // 정렬 필드 검증
      const validSortFields = ['orderedAt', 'totalAmount', 'status', 'orderNumber'];
      if (!validSortFields.includes(sortBy)) {
        return {
          success: false,
          errorMessage: `정렬 기준은 ${validSortFields.join(', ')} 중 하나여야 합니다`
        };
      }

      // 정렬 순서 검증
      if (!['asc', 'desc'].includes(sortOrder)) {
        return {
          success: false,
          errorMessage: '정렬 순서는 asc 또는 desc여야 합니다'
        };
      }

      // 날짜 변환
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return {
            success: false,
            errorMessage: '시작 날짜 형식이 올바르지 않습니다'
          };
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return {
            success: false,
            errorMessage: '종료 날짜 형식이 올바르지 않습니다'
          };
        }
      }

      // Repository 검색 조건 구성
      const criteria: AdminOrderSearchCriteria = {
        search,
        status,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page,
        limit,
        sortBy,
        sortOrder
      };

      // Repository를 통해 주문 목록 조회
      const { orders, total } = await this.orderRepository.findManyForAdmin(criteria);

      // 페이징 정보 계산
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        orders,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: total,
          hasNextPage,
          hasPreviousPage
        }
      };

    } catch (error) {
      console.error('[GetOrdersAdminUseCase] 관리자 주문 목록 조회 실패:', error);
      
      return {
        success: false,
        errorMessage: error instanceof Error 
          ? error.message 
          : '주문 목록을 조회하는 중 오류가 발생했습니다'
      };
    }
  }
}