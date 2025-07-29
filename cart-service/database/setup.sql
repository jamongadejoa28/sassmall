-- ========================================
-- Cart Service 데이터베이스 설정
-- cart-service/database/setup.sql
-- ========================================

-- 1. 새로운 데이터베이스 생성
-- PostgreSQL에서 실행 (기존 postgres DB 또는 관리자 DB에서)
CREATE DATABASE shopping_mall_carts
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    TEMPLATE = template0;

-- 데이터베이스 변경
\c shopping_mall_carts;

-- 2. UUID 확장 기능 활성화 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 3. Cart 테이블 생성
-- ========================================

CREATE TABLE carts (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,                           -- 로그인 사용자 ID (shopping_mall_users DB 참조)
    session_id VARCHAR(255),                -- 비로그인 세션 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건: userId 또는 sessionId 중 하나는 반드시 존재
    CONSTRAINT cart_owner_check CHECK (
        user_id IS NOT NULL OR session_id IS NOT NULL
    ),
    
    -- 인덱스를 위한 제약조건
    CONSTRAINT valid_user_id CHECK (user_id IS NULL OR user_id != '00000000-0000-0000-0000-000000000000'::uuid),
    CONSTRAINT valid_session_id CHECK (session_id IS NULL OR LENGTH(TRIM(session_id)) > 0)
);

-- ========================================
-- 4. Cart Items 테이블 생성
-- ========================================

CREATE TABLE cart_items (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,               -- Product Service의 상품 ID
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(12,2) NOT NULL CHECK (price > 0),  -- 담을 당시 가격 (스냅샷)
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 같은 장바구니 내 같은 상품 중복 방지 (수량 증가로 처리)
    UNIQUE(cart_id, product_id)
);

-- ========================================
-- 5. 성능 최적화 인덱스 생성
-- ========================================

-- Cart 테이블 인덱스
CREATE INDEX idx_carts_user_id ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session_id ON carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_carts_created_at ON carts(created_at);
CREATE INDEX idx_carts_updated_at ON carts(updated_at);

-- Cart Items 테이블 인덱스
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_added_at ON cart_items(added_at);

-- 복합 인덱스 (자주 사용되는 쿼리 최적화)
CREATE INDEX idx_cart_items_cart_product ON cart_items(cart_id, product_id);

-- ========================================
-- 6. 트리거 함수 - updated_at 자동 업데이트
-- ========================================

-- updated_at 자동 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Cart 테이블에 트리거 적용
CREATE TRIGGER update_carts_updated_at 
    BEFORE UPDATE ON carts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. 데이터 정리 함수 (비로그인 장바구니 정리용)
-- ========================================

-- 30일 이상 된 비로그인 장바구니 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_session_carts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 30일 이상 된 세션 장바구니 삭제
    DELETE FROM carts 
    WHERE session_id IS NOT NULL 
    AND user_id IS NULL 
    AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 로그 남기기
    RAISE NOTICE 'Cleaned up % old session carts', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. 통계 및 모니터링 뷰
-- ========================================

-- 장바구니 통계 뷰
CREATE VIEW cart_statistics AS
SELECT 
    COUNT(*) as total_carts,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_carts,
    COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as session_carts,
    AVG(item_count) as avg_items_per_cart,
    AVG(total_amount) as avg_cart_value
FROM (
    SELECT 
        c.id,
        c.user_id,
        c.session_id,
        COUNT(ci.id) as item_count,
        COALESCE(SUM(ci.quantity * ci.price), 0) as total_amount
    FROM carts c
    LEFT JOIN cart_items ci ON c.id = ci.cart_id
    GROUP BY c.id, c.user_id, c.session_id
) cart_summary;

-- 상품별 장바구니 담기 통계
CREATE VIEW popular_cart_products AS
SELECT 
    product_id,
    COUNT(*) as times_added_to_cart,
    SUM(quantity) as total_quantity_in_carts,
    AVG(quantity) as avg_quantity_per_add,
    AVG(price) as avg_price
FROM cart_items
GROUP BY product_id
ORDER BY times_added_to_cart DESC;

-- ========================================
-- 9. 샘플 데이터 (테스트용) - 선택사항
-- ========================================

-- 테스트용 세션 장바구니
INSERT INTO carts (id, session_id) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'test-session-123'),
    ('22222222-2222-2222-2222-222222222222', 'test-session-456');

-- 테스트용 장바구니 아이템 (실제 product_id는 Product Service에서 확인 필요)
INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES 
    ('11111111-1111-1111-1111-111111111111', '660e8400-e29b-41d4-a716-446655440001', 2, 3299000),  -- MacBook Pro
    ('11111111-1111-1111-1111-111111111111', '660e8400-e29b-41d4-a716-446655440003', 1, 1690000),  -- iPhone 15 Pro Max
    ('22222222-2222-2222-2222-222222222222', '660e8400-e29b-41d4-a716-446655440002', 1, 1899000);  -- LG 그램

-- ========================================
-- 10. 권한 설정 (필요시)
-- ========================================

-- cart-service 애플리케이션용 사용자 생성 (필요시)
-- CREATE USER cart_service_user WITH ENCRYPTED PASSWORD 'cart_secure_password_2024';

-- 권한 부여
-- GRANT CONNECT ON DATABASE shopping_mall_carts TO cart_service_user;
-- GRANT USAGE ON SCHEMA public TO cart_service_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cart_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cart_service_user;

-- ========================================
-- 11. 백업 및 유지보수를 위한 스크립트
-- ========================================

-- 데이터베이스 백업 스크립트 예제
-- pg_dump shopping_mall_carts > cart_backup_$(date +%Y%m%d_%H%M%S).sql

-- 정기적으로 실행할 정리 작업 (cron job 권장)
-- SELECT cleanup_old_session_carts();

-- ========================================
-- 12. 개발/테스트 환경을 위한 추가 설정
-- ========================================

-- 개발 환경에서 빠른 데이터 리셋을 위한 함수
CREATE OR REPLACE FUNCTION reset_cart_data()
RETURNS VOID AS $$
BEGIN
    -- 외래키 제약조건 때문에 순서 중요
    DELETE FROM cart_items;
    DELETE FROM carts;
    
    -- 시퀀스 리셋 (AUTO INCREMENT ID 사용 시)
    -- ALTER SEQUENCE carts_id_seq RESTART WITH 1;
    -- ALTER SEQUENCE cart_items_id_seq RESTART WITH 1;
    
    RAISE NOTICE 'All cart data has been reset';
END;
$$ LANGUAGE plpgsql;

-- 테스트 데이터 생성 함수
CREATE OR REPLACE FUNCTION create_test_data()
RETURNS VOID AS $$
BEGIN
    -- 기존 테스트 데이터 삭제
    DELETE FROM cart_items WHERE cart_id IN (
        SELECT id FROM carts WHERE session_id LIKE 'test-%'
    );
    DELETE FROM carts WHERE session_id LIKE 'test-%';
    
    -- 새 테스트 데이터 생성
    INSERT INTO carts (id, session_id) VALUES 
        ('11111111-1111-1111-1111-111111111111', 'test-session-123');
    
    INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES 
        ('11111111-1111-1111-1111-111111111111', '660e8400-e29b-41d4-a716-446655440001', 2, 1000);
    
    RAISE NOTICE 'Test data created successfully';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Cart Service Database Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database: shopping_mall_carts';
    RAISE NOTICE 'Tables created: carts, cart_items';
    RAISE NOTICE 'Indexes created: 7 indexes for performance';
    RAISE NOTICE 'Functions created: cleanup, statistics, test helpers';
    RAISE NOTICE 'Views created: cart_statistics, popular_cart_products';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '1. Update your .env file with database connection info';
    RAISE NOTICE '2. Create TypeORM entities and repositories';
    RAISE NOTICE '3. Run Cart Entity tests to verify setup';
    RAISE NOTICE '';
    RAISE NOTICE '📊 To view statistics: SELECT * FROM cart_statistics;';
    RAISE NOTICE '🧹 To cleanup old carts: SELECT cleanup_old_session_carts();';
    RAISE NOTICE '🧪 To create test data: SELECT create_test_data();';
    RAISE NOTICE '========================================';
END $$;