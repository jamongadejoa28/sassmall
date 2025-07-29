// ========================================
// DI Container - cart-service (수정됨 - 간단하고 안전한 바인딩)
// cart-service/src/infrastructure/di/Container.ts
// ========================================

import { Container } from "inversify";
import { DataSource } from "typeorm";
import "reflect-metadata";

// DI 심볼 import
import { TYPES } from "./types";

// Interfaces from UseCases
import {
  CartRepository,
  ProductServiceClient,
  CacheService,
} from "../../usecases/types";

// Implementations
import { CartRepositoryImpl } from "../../adapters/CartRepositoryImpl";
import { MockProductServiceClient } from "../../adapters/MockProductServiceClient";
import { HttpProductServiceClient } from "../../adapters/ProductServiceClient";
import { CacheServiceImpl } from "../../adapters/CacheServiceImpl";

// Config
import { RedisConfig } from "../config/RedisConfig";

// Use Cases
import { AddToCartUseCase } from "../../usecases/AddToCartUseCase";
import { GetCartUseCase } from "../../usecases/GetCartUseCase";
import { RemoveFromCartUseCase } from "../../usecases/RemoveFromCartUseCase";
import { UpdateCartItemUseCase } from "../../usecases/UpdateCartItemUseCase";
import { TransferCartUseCase } from "../../usecases/TransferCartUseCase";
import { ClearCartUseCase } from "../../usecases/ClearCartUseCase";
import { DeleteCartUseCase } from "../../usecases/DeleteCartUseCase";
import { CleanupSessionCartUseCase } from "../../usecases/CleanupSessionCartUseCase";

// Controllers
import { CartController } from "../../frameworks/controllers/CartController";

/**
 * DI 컨테이너 설정 클래스 (간단하고 안전한 바인딩)
 */
export class DIContainer {
  private static instance: Container;

  /**
   * 컨테이너 인스턴스 생성 및 바인딩 설정
   */
  static async create(): Promise<Container> {
    if (!DIContainer.instance) {
      const container = new Container();

      console.log("🔧 [CartService-DIContainer] 바인딩 시작...");

      try {
        // 1. 인프라스트럭처 바인딩
        await DIContainer.bindInfrastructure(container);
        console.log("✅ [CartService-DIContainer] 인프라스트럭처 바인딩 완료");

        // 2. 리포지토리 바인딩
        DIContainer.bindRepositories(container);
        console.log("✅ [CartService-DIContainer] 리포지토리 바인딩 완료");

        // 3. 서비스 바인딩
        DIContainer.bindServices(container);
        console.log("✅ [CartService-DIContainer] 서비스 바인딩 완료");

        // 4. 유스케이스 바인딩
        DIContainer.bindUseCases(container);
        console.log("✅ [CartService-DIContainer] 유스케이스 바인딩 완료");

        // 5. 컨트롤러 바인딩
        DIContainer.bindControllers(container);
        console.log("✅ [CartService-DIContainer] 컨트롤러 바인딩 완료");

        DIContainer.instance = container;
        console.log("🎉 [CartService-DIContainer] 전체 바인딩 완료");
      } catch (error) {
        console.error("❌ [CartService-DIContainer] 바인딩 실패:", error);
        throw error;
      }
    }

    return DIContainer.instance;
  }

  /**
   * 인프라스트럭처 바인딩
   */
  private static async bindInfrastructure(container: Container): Promise<void> {
    try {
      console.log("🔧 [CartService-DIContainer] 인프라스트럭처 바인딩 시작...");

      // 🔧 Redis 설정 바인딩
      try {
        const redisConfig = RedisConfig.fromEnvironment();
        container
          .bind<RedisConfig>(TYPES.RedisConfig)
          .toConstantValue(redisConfig);
        console.log("✅ [CartService-DIContainer] Redis 설정 바인딩 완료");
      } catch (redisError) {
        console.error(
          "❌ [CartService-DIContainer] Redis 설정 실패:",
          redisError
        );
        throw redisError;
      }

      // 🔧 PostgreSQL DataSource 바인딩 (테스트 환경 대응)
      try {
        let dataSource: DataSource;

        if (process.env.NODE_ENV === "test") {
          // 테스트 환경: global.testDataSource 또는 직접 생성
          console.log(
            "🧪 [CartService-DIContainer] 테스트 환경: DataSource 초기화"
          );

          if ((global as any).testDataSource && (global as any).testDataSource.isInitialized) {
            console.log("✅ [CartService-DIContainer] global.testDataSource 사용");
            dataSource = (global as any).testDataSource;
          } else {
            console.log("⚠️ [CartService-DIContainer] global.testDataSource 없음, 직접 생성");
            
            // 테스트용 DataSource 직접 생성
            const { TestDataSource } = await import("../database/test-data-source");
            
            if (!TestDataSource.isInitialized) {
              await TestDataSource.initialize();
              console.log("✅ [CartService-DIContainer] 테스트 DataSource 초기화 완료");
            }
            
            dataSource = TestDataSource;
            
            // global에 저장
            (global as any).testDataSource = dataSource;
          }
        } else {
          // 운영/개발 환경: AppDataSource 사용
          console.log(
            "🚀 [CartService-DIContainer] 운영 환경: AppDataSource 사용"
          );

          const { AppDataSource } = await import("../database/data-source");

          if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log(
              "✅ [CartService-DIContainer] 운영 DataSource 초기화 완료"
            );
          }

          dataSource = AppDataSource;
        }

        container
          .bind<DataSource>(TYPES.DataSource)
          .toConstantValue(dataSource);
        console.log("✅ [CartService-DIContainer] DataSource 바인딩 완료");
      } catch (dbError) {
        console.error(
          "❌ [CartService-DIContainer] DataSource 바인딩 실패:",
          dbError
        );
        console.error("   - 환경:", process.env.NODE_ENV);
        console.error(
          "   - global.testDataSource 존재:",
          !!(global as any).testDataSource
        );
        console.error(
          "   - global.testDataSource 초기화:",
          (global as any).testDataSource?.isInitialized
        );
        throw dbError;
      }

      console.log("🎉 [CartService-DIContainer] 인프라스트럭처 바인딩 완료");
    } catch (error) {
      console.error(
        "❌ [CartService-DIContainer] 인프라스트럭처 바인딩 전체 실패:",
        error
      );
      throw error;
    }
  }

  /**
   * 리포지토리 바인딩
   */
  private static bindRepositories(container: Container): void {
    try {
      container
        .bind<CartRepository>(TYPES.CartRepository)
        .to(CartRepositoryImpl)
        .inSingletonScope();

      console.log("🗂️ [CartService-DIContainer] CartRepository 바인딩 완료");
    } catch (error) {
      console.error(
        "❌ [CartService-DIContainer] 리포지토리 바인딩 실패:",
        error
      );
      throw error;
    }
  }

  /**
   * 서비스 바인딩 (간단한 방식)
   */
  private static bindServices(container: Container): void {
    try {
      // 🔧 ProductServiceClient 바인딩 (환경에 따라 실제 또는 Mock 사용)
      const useRealProductService = process.env.USE_REAL_PRODUCT_SERVICE !== 'false' && process.env.NODE_ENV !== 'test';
      
      if (useRealProductService) {
        container
          .bind<ProductServiceClient>(TYPES.ProductServiceClient)
          .to(HttpProductServiceClient)
          .inSingletonScope();
        console.log(
          "🛍️ [CartService-DIContainer] ProductServiceClient(Http) 바인딩 완료"
        );
      } else {
        container
          .bind<ProductServiceClient>(TYPES.ProductServiceClient)
          .to(MockProductServiceClient)
          .inSingletonScope();
        console.log(
          "🛍️ [CartService-DIContainer] ProductServiceClient(Mock) 바인딩 완료"
        );
      }

      // 🔧 CacheService 바인딩 (항상 실제 Redis 사용)
      container
        .bind<CacheService>(TYPES.CacheService)
        .toDynamicValue(() => {
          try {
            const redisConfig = container.get<RedisConfig>(TYPES.RedisConfig);

            const connectionConfig = {
              host: redisConfig.getConnectionConfig().host,
              port: redisConfig.getConnectionConfig().port,
              password: redisConfig.getConnectionConfig().password,
              db: redisConfig.getConnectionConfig().db,
              keyPrefix: redisConfig.getConnectionConfig().keyPrefix,
            };

            console.log(`🔗 [CartService-DIContainer] Redis CacheService 연결: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.db}`);
            return new CacheServiceImpl(connectionConfig);
          } catch (error) {
            console.error(
              "❌ [CartService-DIContainer] CacheService 생성 실패:",
              error
            );
            throw error;
          }
        })
        .inSingletonScope();

      console.log("📊 [CartService-DIContainer] CacheService 바인딩 완료");
    } catch (error) {
      console.error("❌ [CartService-DIContainer] 서비스 바인딩 실패:", error);
      throw error;
    }
  }

  /**
   * 유스케이스 바인딩
   */
  private static bindUseCases(container: Container): void {
    try {
      // 모든 UseCase들을 inTransientScope로 바인딩
      container
        .bind<AddToCartUseCase>(TYPES.AddToCartUseCase)
        .to(AddToCartUseCase)
        .inTransientScope();

      container
        .bind<GetCartUseCase>(TYPES.GetCartUseCase)
        .to(GetCartUseCase)
        .inTransientScope();

      container
        .bind<RemoveFromCartUseCase>(TYPES.RemoveFromCartUseCase)
        .to(RemoveFromCartUseCase)
        .inTransientScope();

      container
        .bind<UpdateCartItemUseCase>(TYPES.UpdateCartItemUseCase)
        .to(UpdateCartItemUseCase)
        .inTransientScope();

      container
        .bind<TransferCartUseCase>(TYPES.TransferCartUseCase)
        .to(TransferCartUseCase)
        .inTransientScope();

      container
        .bind<ClearCartUseCase>(TYPES.ClearCartUseCase)
        .to(ClearCartUseCase)
        .inTransientScope();

      container
        .bind<DeleteCartUseCase>(TYPES.DeleteCartUseCase)
        .to(DeleteCartUseCase)
        .inTransientScope();

      container
        .bind<CleanupSessionCartUseCase>(TYPES.CleanupSessionCartUseCase)
        .to(CleanupSessionCartUseCase)
        .inTransientScope();

      console.log("🎯 [CartService-DIContainer] 모든 UseCase 바인딩 완료");
    } catch (error) {
      console.error(
        "❌ [CartService-DIContainer] 유스케이스 바인딩 실패:",
        error
      );
      throw error;
    }
  }

  /**
   * 컨트롤러 바인딩
   */
  private static bindControllers(container: Container): void {
    try {
      container
        .bind<CartController>(TYPES.CartController)
        .to(CartController)
        .inSingletonScope();

      console.log("🎮 [CartService-DIContainer] CartController 바인딩 완료");
    } catch (error) {
      console.error(
        "❌ [CartService-DIContainer] 컨트롤러 바인딩 실패:",
        error
      );
      throw error;
    }
  }

  /**
   * 컨테이너 인스턴스 반환
   */
  static getContainer(): Container {
    if (!DIContainer.instance) {
      throw new Error(
        "DI 컨테이너가 초기화되지 않았습니다. DIContainer.create()를 먼저 호출하세요."
      );
    }
    return DIContainer.instance;
  }

  /**
   * 컨테이너 정리
   */
  static async cleanup(): Promise<void> {
    if (DIContainer.instance) {
      try {
        // Redis 연결 정리
        try {
          const redisConfig = DIContainer.instance.get<RedisConfig>(
            TYPES.RedisConfig
          );
          await redisConfig.disconnect();
          console.log("📡 [CartService-DIContainer] Redis 연결 정리 완료");
        } catch (error) {
          console.warn(
            "⚠️ [CartService-DIContainer] Redis 정리 중 경고:",
            error
          );
        }

        // PostgreSQL 연결 정리
        try {
          const dataSource = DIContainer.instance.get<DataSource>(
            TYPES.DataSource
          );
          if (dataSource?.isInitialized) {
            await dataSource.destroy();
            console.log(
              "🗄️ [CartService-DIContainer] PostgreSQL 연결 정리 완료"
            );
          }
        } catch (error) {
          console.warn("⚠️ [CartService-DIContainer] DB 정리 중 경고:", error);
        }

        // 컨테이너 정리
        DIContainer.instance.unbindAll();
        DIContainer.instance = undefined as any;
        console.log("🧹 [CartService-DIContainer] 모든 리소스 정리 완료");
      } catch (error) {
        console.error(
          "❌ [CartService-DIContainer] 리소스 정리 중 오류:",
          error
        );
      }
    }
  }
}

/**
 * 🔧 테스트용 Mock CacheService (Redis 연결 실패 시 fallback)
 */
class MockCacheService implements CacheService {
  private mockData = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.mockData.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.mockData.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.mockData.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Mock implementation
  }

  async getStats(): Promise<{
    isConnected: boolean;
    totalKeys: number;
    usedMemory: string;
    hitRate?: number;
  }> {
    return {
      isConnected: false,
      totalKeys: this.mockData.size,
      usedMemory: "0MB",
      hitRate: 0,
    };
  }

  async disconnect?(): Promise<void> {
    this.mockData.clear();
  }
}
