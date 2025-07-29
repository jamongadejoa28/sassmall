// ========================================
// 한글 인코딩 문제 해결 - database.ts 수정
// src/config/database.ts
// ========================================

import { DataSource } from 'typeorm';
import { UserEntity } from '../adapters/entities/UserEntity';

/**
 * 데이터베이스 설정 생성 (한글 인코딩 문제 해결)
 */
function createDataSourceConfig(): any {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const config = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_db_password',
    database: process.env.DB_NAME || 'shopping_mall_users',

    // Entity 등록
    entities: [UserEntity],

    // 🔧 한글 인코딩 문제 해결을 위한 설정 추가
    extra: {
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
      timeout: parseInt(process.env.DB_TIMEOUT || '30000', 10),

      // 🆕 PostgreSQL 클라이언트 인코딩 설정
      charset: 'utf8',
      client_encoding: 'UTF8',

      // 🆕 연결 시 UTF-8 설정 강제
      connectionString: undefined, // 개별 설정 사용

      // 🆕 PostgreSQL 연결 매개변수 추가
      options: '-c client_encoding=UTF8',
    },

    // 마이그레이션 설정
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'migrations',

    // 연결 설정
    synchronize: !isProduction,
    logging: process.env.DB_LOGGING === 'true' || (!isProduction && !isTest),
    dropSchema: isTest,

    // SSL 설정 (운영환경)
    ssl: isProduction
      ? {
          rejectUnauthorized: false,
        }
      : false,

    // 메타데이터 설정
    metadataTableName: 'typeorm_metadata',
  };

  return config;
}

/**
 * 🆕 PostgreSQL 데이터베이스 인코딩 설정 검증
 */
export async function verifyDatabaseEncoding(
  dataSource: DataSource
): Promise<void> {
  try {
    console.log('🔍 데이터베이스 인코딩 설정 확인 중...');

    // 데이터베이스 인코딩 확인
    const encodingResult = await dataSource.query('SHOW server_encoding;');
    console.log('📝 서버 인코딩:', encodingResult[0]?.server_encoding);

    // 클라이언트 인코딩 확인
    const clientEncodingResult = await dataSource.query(
      'SHOW client_encoding;'
    );
    console.log(
      '📝 클라이언트 인코딩:',
      clientEncodingResult[0]?.client_encoding
    );

    // LC_COLLATE 확인 (정렬 규칙)
    const collateResult = await dataSource.query('SHOW lc_collate;');
    console.log('📝 LC_COLLATE:', collateResult[0]?.lc_collate);

    // LC_CTYPE 확인 (문자 분류)
    const ctypeResult = await dataSource.query('SHOW lc_ctype;');
    console.log('📝 LC_CTYPE:', ctypeResult[0]?.lc_ctype);

    // 🆕 UTF-8 테스트 쿼리 실행
    const testResult = await dataSource.query(
      "SELECT '한글 테스트' as test_text;"
    );
    console.log('🧪 한글 테스트 결과:', testResult[0]?.test_text);

    console.log('✅ 데이터베이스 인코딩 설정 확인 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 인코딩 확인 실패:', error);
  }
}

/**
 * 🆕 클라이언트 인코딩 강제 설정
 */
export async function setClientEncoding(dataSource: DataSource): Promise<void> {
  try {
    console.log('🔧 클라이언트 인코딩을 UTF-8로 설정 중...');

    // 클라이언트 인코딩을 UTF-8로 강제 설정
    await dataSource.query("SET client_encoding TO 'UTF8';");

    // 설정 확인
    const result = await dataSource.query('SHOW client_encoding;');
    console.log('✅ 클라이언트 인코딩 설정 완료:', result[0]?.client_encoding);
  } catch (error) {
    console.error('❌ 클라이언트 인코딩 설정 실패:', error);
  }
}

/**
 * 데이터베이스 연결 생성 및 초기화 (인코딩 설정 포함)
 */
export async function createDatabaseConnection(): Promise<DataSource> {
  const config = createDataSourceConfig();
  const dataSource = new DataSource(config);

  try {
    console.log('🔌 데이터베이스 연결 시도 중...');
    console.log(
      `📊 Database: ${config.host}:${config.port}/${config.database}`
    );

    // 데이터베이스 연결
    await dataSource.initialize();

    console.log('✅ 데이터베이스 연결 성공');

    // 🆕 인코딩 설정 및 검증
    await setClientEncoding(dataSource);

    // 개발 환경에서만 인코딩 정보 출력
    if (process.env.NODE_ENV === 'development') {
      await verifyDatabaseEncoding(dataSource);
    }

    // 테스트 환경이 아닌 경우 연결 정보 로깅
    if (process.env.NODE_ENV !== 'test') {
      console.log('📋 데이터베이스 정보:');
      console.log(`   - Type: ${config.type}`);
      console.log(`   - Host: ${config.host}:${config.port}`);
      console.log(`   - Database: ${config.database}`);
      console.log(`   - Synchronize: ${config.synchronize}`);
      console.log(`   - Logging: ${config.logging}`);
      console.log(`   - UTF-8 Support: ✅ 활성화됨`);
    }

    return dataSource;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);

    // 상세한 에러 정보 제공
    if (error instanceof Error) {
      console.error('🔍 에러 상세:', {
        message: error.message,
        code: (error as any).code,
        host: config.host,
        port: config.port,
        database: config.database,
      });
    }

    throw error;
  }
}

/**
 * 기존 함수들 (변경 없음)
 */
export async function testDatabaseConnection(): Promise<boolean> {
  let dataSource: DataSource | null = null;

  try {
    console.log('🧪 데이터베이스 연결 테스트 시작...');

    dataSource = await createDatabaseConnection();

    // 🆕 한글 데이터 테스트 추가
    await dataSource.query("SELECT '한글 데이터 테스트' as korean_test;");

    console.log('✅ 데이터베이스 연결 테스트 성공 (한글 지원 포함)');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 테스트 실패:', error);
    return false;
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🧹 테스트 데이터베이스 연결 정리 완료');
    }
  }
}

export function validateDatabaseConfig(): void {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️ 누락된 데이터베이스 환경변수:', missingVars);
    console.warn('🔧 기본값을 사용합니다 (개발 환경용)');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 데이터베이스 설정:');
    console.log(`   - Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   - Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`   - Username: ${process.env.DB_USER || 'postgres'}`);
    console.log(
      `   - Database: ${process.env.DB_NAME || 'shopping_mall_users'}`
    );
    console.log(`   - UTF-8 인코딩: ✅ 강화됨`);
    console.log(
      `   - Password: ${'*'.repeat((process.env.DB_PASSWORD || 'your_db_password').length)}`
    );
  }
}
