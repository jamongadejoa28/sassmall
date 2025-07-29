// ========================================
// Global Type Definitions - cart-service
// cart-service/src/types/global.d.ts
// ========================================

import { DataSource } from 'typeorm';

/**
 * Global 객체 타입 확장
 * 테스트 환경에서 DataSource 인스턴스를 전역으로 관리하기 위한 타입 정의
 */
declare global {
  /**
   * 테스트 환경에서 사용되는 전역 변수들
   */
  var testDataSource: DataSource | undefined;
  
  /**
   * Jest 테스트 환경에서 사용되는 전역 변수들
   */
  namespace NodeJS {
    interface Global {
      testDataSource?: DataSource;
    }
  }
  
  /**
   * globalThis 확장 - any 타입으로 타입 오류 해결
   */
  interface GlobalThis {
    testDataSource?: DataSource;
    [key: string]: any; // 타입 오류 해결을 위한 인덱스 시그니처
  }
}

// 모듈로 인식되도록 export 추가
export {};