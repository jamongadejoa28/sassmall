-- ========================================
-- Order Service 데이터베이스 설정
-- order-service/database/setup.sql
-- ========================================

-- Note: Database creation is handled by Docker POSTGRES_DB environment variable
-- This script runs within the shopping_mall_orders database context

-- 1. UUID 확장 기능 활성화 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. 주문 상태 enum 타입 생성
-- ========================================

CREATE TYPE order_status AS ENUM (
    'PENDING',                 -- 주문 대기
    'PAYMENT_IN_PROGRESS',     -- 결제 진행 중
    'PAYMENT_COMPLETED',       -- 결제 완료
    'PAYMENT_FAILED',          -- 결제 실패
    'CONFIRMED',               -- 주문 확인 완료
    'PREPARING_SHIPMENT',      -- 배송 준비
    'SHIPPING',                -- 배송 중
    'DELIVERED',               -- 배송 완료
    'CANCELLED',               -- 주문 취소
    'REFUND_IN_PROGRESS',      -- 환불 처리 중
    'REFUNDED'                 -- 환불 완료
);

-- 결제 방법 enum 타입
CREATE TYPE payment_method AS ENUM (
    'KAKAOPAY',
    'CARD',
    'BANK_TRANSFER'
);

-- ========================================
-- 3. Orders 테이블 생성
-- ========================================

CREATE TABLE orders (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,     -- 주문번호 (ORDYYYYMMDD + 8자리)
    user_id UUID NOT NULL,                        -- 주문자 ID (shopping_mall_users DB 참조)
    status order_status NOT NULL DEFAULT 'PENDING',
    
    -- 배송 정보
    shipping_postal_code VARCHAR(10) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    shipping_detail_address VARCHAR(255),
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    
    -- 결제 정보
    payment_method payment_method NOT NULL,
    payment_id VARCHAR(255),                      -- 카카오페이 등 결제 시스템의 결제 ID
    
    -- 주문 금액 정보
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    
    -- 기타
    memo TEXT,                                    -- 주문 메모
    
    -- 시간 정보
    ordered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT valid_phone CHECK (recipient_phone ~ '^010[0-9]{8}$'),
    CONSTRAINT valid_postal_code CHECK (shipping_postal_code ~ '^[0-9]{5}$'),
    CONSTRAINT amount_consistency CHECK (total_amount = subtotal + shipping_fee)
);

-- ========================================
-- 4. Order Items 테이블 생성
-- ========================================

CREATE TABLE order_items (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- 상품 정보 (주문 시점 스냅샷)
    product_id UUID NOT NULL,                     -- Product Service의 상품 ID
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(12,2) NOT NULL CHECK (product_price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 999),
    total_price DECIMAL(12,2) NOT NULL CHECK (total_price > 0),
    
    -- 추가 상품 정보
    product_image_url TEXT,
    product_options JSONB,                        -- 상품 옵션 (색상, 크기 등)
    
    -- 시간 정보
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT price_calculation CHECK (total_price = product_price * quantity),
    CONSTRAINT unique_product_per_order UNIQUE(order_id, product_id)
);

-- ========================================
-- 5. Payments 테이블 생성 (결제 내역 추적)
-- ========================================

CREATE TABLE payments (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- 결제 정보
    payment_id VARCHAR(255) NOT NULL UNIQUE,      -- 외부 결제 시스템 ID (카카오페이 etc)
    payment_method payment_method NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    
    -- 결제 상태
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- ready, approved, failed, cancelled, refunded
    
    -- 외부 결제 시스템 정보
    payment_system_data JSONB,                    -- 카카오페이 응답 등 원본 데이터
    
    -- 시간 정보
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========================================
-- 6. 성능 최적화 인덱스 생성
-- ========================================

-- Orders 테이블 인덱스
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_payment_id ON orders(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Order Items 테이블 인덱스
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_created_at ON order_items(created_at);

-- Payments 테이블 인덱스
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_payment_id ON payments(payment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_requested_at ON payments(requested_at);

-- 복합 인덱스 (자주 사용되는 쿼리 최적화)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_status_ordered_at ON orders(status, ordered_at);

-- ========================================
-- 8. 트리거 함수 - updated_at 자동 업데이트
-- ========================================

-- updated_at 자동 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON order_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. 주문번호 생성 함수
-- ========================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    date_str VARCHAR(8);
    random_str VARCHAR(8);
    order_number VARCHAR(50);
    attempt_count INTEGER := 0;
BEGIN
    -- 최대 10번 시도
    WHILE attempt_count < 10 LOOP
        -- 날짜 부분 생성 (YYYYMMDD)
        date_str := TO_CHAR(NOW(), 'YYYYMMDD');
        
        -- 랜덤 문자열 생성 (8자리 대문자 알파벳 + 숫자)
        random_str := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        
        -- 주문번호 조합
        order_number := 'ORD' || date_str || random_str;
        
        -- 중복 체크
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = order_number) THEN
            RETURN order_number;
        END IF;
        
        attempt_count := attempt_count + 1;
    END LOOP;
    
    -- 10번 시도해도 실패하면 타임스탬프 추가
    RETURN 'ORD' || date_str || EXTRACT(EPOCH FROM NOW())::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 10. 주문 상태 변경 검증 함수
-- ========================================

CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    old_status order_status;
    new_status order_status;
BEGIN
    old_status := OLD.status;
    new_status := NEW.status;
    
    -- 같은 상태로 변경하는 경우는 허용
    IF old_status = new_status THEN
        RETURN NEW;
    END IF;
    
    -- 상태 변경 규칙 검증
    CASE old_status
        WHEN 'PENDING' THEN
            IF new_status NOT IN ('PAYMENT_IN_PROGRESS', 'CANCELLED') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'PAYMENT_IN_PROGRESS' THEN
            IF new_status NOT IN ('PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'PAYMENT_COMPLETED' THEN
            IF new_status NOT IN ('CONFIRMED', 'REFUND_IN_PROGRESS') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'PAYMENT_FAILED' THEN
            IF new_status NOT IN ('PAYMENT_IN_PROGRESS', 'CANCELLED') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'CONFIRMED' THEN
            IF new_status NOT IN ('PREPARING_SHIPMENT', 'REFUND_IN_PROGRESS') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'PREPARING_SHIPMENT' THEN
            IF new_status NOT IN ('SHIPPING', 'REFUND_IN_PROGRESS') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'SHIPPING' THEN
            IF new_status NOT IN ('DELIVERED', 'REFUND_IN_PROGRESS') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'DELIVERED' THEN
            IF new_status NOT IN ('REFUND_IN_PROGRESS') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'REFUND_IN_PROGRESS' THEN
            IF new_status NOT IN ('REFUNDED') THEN
                RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
            END IF;
        WHEN 'CANCELLED', 'REFUNDED' THEN
            RAISE EXCEPTION 'Cannot change status from %', old_status;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주문 상태 변경 트리거 적용
CREATE TRIGGER validate_order_status_transition 
    BEFORE UPDATE OF status ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION validate_status_transition();

-- ========================================
-- 11. 통계 및 모니터링 뷰
-- ========================================

-- 주문 통계 뷰
CREATE VIEW order_statistics AS
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'PAYMENT_COMPLETED' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
    AVG(total_amount) as avg_order_value,
    SUM(total_amount) as total_revenue,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
FROM orders;

-- 일별 주문 통계
CREATE VIEW daily_order_stats AS
SELECT 
    DATE(ordered_at) as order_date,
    COUNT(*) as order_count,
    SUM(total_amount) as daily_revenue,
    AVG(total_amount) as avg_order_value,
    COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_count
FROM orders
GROUP BY DATE(ordered_at)
ORDER BY order_date DESC;

-- 인기 상품 통계
CREATE VIEW popular_products AS
SELECT 
    oi.product_id,
    oi.product_name,
    COUNT(*) as order_count,
    SUM(oi.quantity) as total_quantity_sold,
    AVG(oi.product_price) as avg_price,
    SUM(oi.total_price) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status NOT IN ('CANCELLED', 'REFUNDED')
GROUP BY oi.product_id, oi.product_name
ORDER BY total_quantity_sold DESC;

-- ========================================
-- 12. 데이터 정리 및 아카이브 함수
-- ========================================

-- 취소된 주문 정리 함수 (90일 이상 된 취소 주문)
CREATE OR REPLACE FUNCTION cleanup_old_cancelled_orders()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM orders 
    WHERE status = 'CANCELLED' 
    AND updated_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old cancelled orders', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 13. 샘플 데이터 (테스트용)
-- ========================================

-- 테스트용 주문 데이터
INSERT INTO orders (
    id, order_number, user_id, status, 
    shipping_postal_code, shipping_address, shipping_detail_address,
    recipient_name, recipient_phone,
    payment_method, subtotal, shipping_fee, total_amount,
    memo
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'ORD202401011234ABCD',
    '88888888-8888-8888-8888-888888888888',  -- 테스트 사용자 ID
    'DELIVERED',
    '12345',
    '서울특별시 강남구 테헤란로 123',
    '101동 202호',
    '홍길동',
    '01012345678',
    'KAKAOPAY',
    50000,
    0,
    50000,
    '테스트 주문입니다'
),
(
    '22222222-2222-2222-2222-222222222222',
    'ORD202401021234EFGH',
    '88888888-8888-8888-8888-888888888888',
    'SHIPPING',
    '54321',
    '부산광역시 해운대구 센텀중앙로 456',
    NULL,
    '김철수',
    '01098765432',
    'CARD',
    30000,
    3000,
    33000,
    NULL
);

-- 테스트용 주문 항목 데이터
INSERT INTO order_items (
    order_id, product_id, product_name, product_price, quantity, total_price,
    product_image_url
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '660e8400-e29b-41d4-a716-446655440001',
    'MacBook Pro 14인치',
    3299000,
    1,
    3299000,
    'https://example.com/macbook-pro.jpg'
),
(
    '22222222-2222-2222-2222-222222222222',
    '660e8400-e29b-41d4-a716-446655440002',
    'LG 그램 17인치',
    1890000,
    1,
    1890000,
    'https://example.com/lg-gram.jpg'
);

-- ========================================
-- 14. 개발/테스트 환경을 위한 추가 설정
-- ========================================

-- 테스트 데이터 리셋 함수
CREATE OR REPLACE FUNCTION reset_order_data()
RETURNS VOID AS $$
BEGIN
    DELETE FROM payments;
    DELETE FROM order_items;
    DELETE FROM orders;
    
    RAISE NOTICE 'All order data has been reset';
END;
$$ LANGUAGE plpgsql;

-- 테스트 데이터 생성 함수
CREATE OR REPLACE FUNCTION create_test_order_data()
RETURNS VOID AS $$
BEGIN
    -- 기존 테스트 데이터 삭제
    DELETE FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE order_number LIKE 'ORD2024%TEST%'
    );
    DELETE FROM orders WHERE order_number LIKE 'ORD2024%TEST%';
    
    -- 새 테스트 데이터 생성
    INSERT INTO orders (
        id, order_number, user_id, status,
        shipping_postal_code, shipping_address, recipient_name, recipient_phone,
        payment_method, subtotal, shipping_fee, total_amount
    ) VALUES (
        '99999999-9999-9999-9999-999999999999',
        'ORD20240101TEST1234',
        '88888888-8888-8888-8888-888888888888',
        'PENDING',
        '12345',
        '테스트 주소',
        '테스트 사용자',
        '01012345678',
        'KAKAOPAY',
        25000,
        3000,
        28000
    );
    
    INSERT INTO order_items (
        order_id, product_id, product_name, product_price, quantity, total_price
    ) VALUES (
        '99999999-9999-9999-9999-999999999999',
        '660e8400-e29b-41d4-a716-446655440001',
        '테스트 상품',
        25000,
        1,
        25000
    );
    
    RAISE NOTICE 'Test order data created successfully';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 완료 메시지
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Order Service Database Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database: shopping_mall_orders';
    RAISE NOTICE 'Tables created: orders, order_items, payments';
    RAISE NOTICE 'Types created: order_status, payment_method';
    RAISE NOTICE 'Indexes created: 15+ indexes for performance';
    RAISE NOTICE 'Functions created: order number generation, status validation, cleanup';
    RAISE NOTICE 'Views created: order_statistics, daily_order_stats, popular_products';
    RAISE NOTICE 'Triggers created: updated_at auto-update, status transition validation';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '1. Add order service to docker-compose.yml';
    RAISE NOTICE '2. Create TypeORM entities and repositories';
    RAISE NOTICE '3. Implement order UseCase classes';
    RAISE NOTICE '4. Integrate with KakaoPay API';
    RAISE NOTICE '';
    RAISE NOTICE '📊 To view statistics: SELECT * FROM order_statistics;';
    RAISE NOTICE '🧹 To cleanup old orders: SELECT cleanup_old_cancelled_orders();';
    RAISE NOTICE '🧪 To create test data: SELECT create_test_order_data();';
    RAISE NOTICE '📝 To generate order number: SELECT generate_order_number();';
    RAISE NOTICE '========================================';
END $$;