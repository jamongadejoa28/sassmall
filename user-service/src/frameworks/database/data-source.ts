import { DataSource } from 'typeorm';
// import { User } from '@entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_db_password',
  database: process.env.DB_NAME || 'shopping_mall_users',
  synchronize: process.env.NODE_ENV === 'development', // 개발환경에서만 true
  logging: process.env.NODE_ENV === 'development',
  //   entities: [User],
  migrations: ['src/frameworks/database/migrations/*.ts'],
  subscribers: ['src/frameworks/database/subscribers/*.ts'],
  extra: {
    // 연결 풀 설정
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});

// 데이터베이스 연결 초기화
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('📦 Database connected successfully');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// 데이터베이스 연결 종료
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('📦 Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};
