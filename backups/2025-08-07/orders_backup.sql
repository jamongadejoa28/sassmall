--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'PAYMENT_IN_PROGRESS',
    'PAYMENT_COMPLETED',
    'PAYMENT_FAILED',
    'CONFIRMED',
    'PREPARING_SHIPMENT',
    'SHIPPING',
    'DELIVERED',
    'CANCELLED',
    'REFUND_IN_PROGRESS',
    'REFUNDED'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method AS ENUM (
    'KAKAOPAY',
    'CARD',
    'BANK_TRANSFER',
    'TOSSPAYMENTS'
);


ALTER TYPE public.payment_method OWNER TO postgres;

--
-- Name: cleanup_old_cancelled_orders(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_cancelled_orders() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.cleanup_old_cancelled_orders() OWNER TO postgres;

--
-- Name: create_test_order_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_test_order_data() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.create_test_order_data() OWNER TO postgres;

--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_order_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.generate_order_number() OWNER TO postgres;

--
-- Name: reset_order_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reset_order_data() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM payments;
    DELETE FROM order_items;
    DELETE FROM orders;
    
    RAISE NOTICE 'All order data has been reset';
END;
$$;


ALTER FUNCTION public.reset_order_data() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_status_transition(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.validate_status_transition() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    user_id uuid NOT NULL,
    status public.order_status DEFAULT 'PENDING'::public.order_status NOT NULL,
    shipping_postal_code character varying(10) NOT NULL,
    shipping_address character varying(255) NOT NULL,
    shipping_detail_address character varying(255),
    recipient_name character varying(100) NOT NULL,
    recipient_phone character varying(20) NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_id character varying(255),
    subtotal numeric(12,2) NOT NULL,
    shipping_fee numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    memo text,
    ordered_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT amount_consistency CHECK ((total_amount = (subtotal + shipping_fee))),
    CONSTRAINT orders_shipping_fee_check CHECK ((shipping_fee >= (0)::numeric)),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT valid_phone CHECK (((recipient_phone)::text ~ '^010[0-9]{8}$'::text)),
    CONSTRAINT valid_postal_code CHECK (((shipping_postal_code)::text ~ '^[0-9]{5}$'::text))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: daily_order_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.daily_order_stats AS
 SELECT date(orders.ordered_at) AS order_date,
    count(*) AS order_count,
    sum(orders.total_amount) AS daily_revenue,
    avg(orders.total_amount) AS avg_order_value,
    count(
        CASE
            WHEN (orders.status = 'DELIVERED'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS delivered_count
   FROM public.orders
  GROUP BY (date(orders.ordered_at))
  ORDER BY (date(orders.ordered_at)) DESC;


ALTER TABLE public.daily_order_stats OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    product_price numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    total_price numeric(12,2) NOT NULL,
    product_image_url text,
    product_options jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_product_price_check CHECK ((product_price > (0)::numeric)),
    CONSTRAINT order_items_quantity_check CHECK (((quantity > 0) AND (quantity <= 999))),
    CONSTRAINT order_items_total_price_check CHECK ((total_price > (0)::numeric)),
    CONSTRAINT price_calculation CHECK ((total_price = (product_price * (quantity)::numeric)))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_statistics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.order_statistics AS
 SELECT count(*) AS total_orders,
    count(
        CASE
            WHEN (orders.status = 'PENDING'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS pending_orders,
    count(
        CASE
            WHEN (orders.status = 'PAYMENT_COMPLETED'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS paid_orders,
    count(
        CASE
            WHEN (orders.status = 'DELIVERED'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS delivered_orders,
    count(
        CASE
            WHEN (orders.status = 'CANCELLED'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS cancelled_orders,
    avg(orders.total_amount) AS avg_order_value,
    sum(orders.total_amount) AS total_revenue,
    avg((EXTRACT(epoch FROM (orders.updated_at - orders.created_at)) / (3600)::numeric)) AS avg_processing_hours
   FROM public.orders;


ALTER TABLE public.order_statistics OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    payment_id character varying(255) NOT NULL,
    payment_method public.payment_method NOT NULL,
    amount numeric(12,2) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    payment_system_data jsonb,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    failed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: popular_products; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.popular_products AS
 SELECT oi.product_id,
    oi.product_name,
    count(*) AS order_count,
    sum(oi.quantity) AS total_quantity_sold,
    avg(oi.product_price) AS avg_price,
    sum(oi.total_price) AS total_revenue
   FROM (public.order_items oi
     JOIN public.orders o ON ((oi.order_id = o.id)))
  WHERE (o.status <> ALL (ARRAY['CANCELLED'::public.order_status, 'REFUNDED'::public.order_status]))
  GROUP BY oi.product_id, oi.product_name
  ORDER BY (sum(oi.quantity)) DESC;


ALTER TABLE public.popular_products OWNER TO postgres;

--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, product_price, quantity, total_price, product_image_url, product_options, created_at, updated_at) FROM stdin;
a8f19ee7-698e-4e23-8327-e8b3ad02bf70	804d4997-59c9-46cb-a02f-212f2d115e6e	660e8400-e29b-41d4-a716-446655440006	나이키 에어포스1 스니커즈	119000.00	1	119000.00		{}	2025-07-09 05:49:35.691+00	2025-07-09 05:49:35.691+00
18c05a9c-b455-4649-bf5a-d9a543047fec	3f7b6b6b-2d71-4ca6-b718-73af9120933f	660e8400-e29b-41d4-a716-446655440006	나이키 에어포스1 스니커즈	119000.00	1	119000.00		{}	2025-07-09 05:50:54.671+00	2025-07-09 05:50:54.671+00
e577506f-54bc-4421-a286-53eaf09885fa	24ff44ff-4724-4153-bda3-3851109878fb	660e8400-e29b-41d4-a716-446655440003	MacBook Air M2 13인치 (256GB)	1690000.00	1	1690000.00		{}	2025-07-10 13:57:37.938+00	2025-07-10 13:57:37.938+00
5d650eb5-e0f2-4e65-86cf-a662df45fc3b	13417ab7-920c-4596-adb9-2f8499b30c13	660e8400-e29b-41d4-a716-446655440002	다이슨 V15 무선청소기	890000.00	1	890000.00		{}	2025-07-13 18:13:34.87+00	2025-07-13 18:13:34.87+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, user_id, status, shipping_postal_code, shipping_address, shipping_detail_address, recipient_name, recipient_phone, payment_method, payment_id, subtotal, shipping_fee, total_amount, memo, ordered_at, created_at, updated_at) FROM stdin;
3f7b6b6b-2d71-4ca6-b718-73af9120933f	ORD20250709UOKG5G4D	bd81df36-b6c4-499a-a215-4339eb34a4f0	PAYMENT_COMPLETED	06036	서울 강남구 가로수길 14	101gg	네루미	01033334444	TOSSPAYMENTS	\N	119000.00	0.00	119000.00	\N	2025-07-09 05:50:54.671+00	2025-07-09 05:50:54.671+00	2025-07-09 05:51:14.422468+00
804d4997-59c9-46cb-a02f-212f2d115e6e	ORD20250709P7TZVJGL	bd81df36-b6c4-499a-a215-4339eb34a4f0	CANCELLED	06035	서울 강남구 가로수길 15	3434	네루미	01033334444	TOSSPAYMENTS	\N	119000.00	0.00	119000.00	fdfd	2025-07-09 05:49:35.691+00	2025-07-09 05:49:35.691+00	2025-07-09 05:51:59.281196+00
24ff44ff-4724-4153-bda3-3851109878fb	ORD202507105BVUE1K5	bd81df36-b6c4-499a-a215-4339eb34a4f0	CANCELLED	15382	경기 안산시 단원구 라성안길 7	123	네루미	01000000000	TOSSPAYMENTS	\N	1690000.00	0.00	1690000.00	\N	2025-07-10 13:57:37.938+00	2025-07-10 13:57:37.938+00	2025-07-10 18:56:48.732692+00
13417ab7-920c-4596-adb9-2f8499b30c13	ORD20250714DRI6XF5A	bd81df36-b6c4-499a-a215-4339eb34a4f0	PAYMENT_COMPLETED	06267	서울 강남구 강남대로 238	ㅇㅇㅇ	네루미	01055553333	TOSSPAYMENTS	\N	890000.00	0.00	890000.00	\N	2025-07-13 18:13:34.87+00	2025-07-13 18:13:34.87+00	2025-07-13 18:14:42.882914+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, payment_id, payment_method, amount, status, payment_system_data, requested_at, approved_at, failed_at, created_at, updated_at) FROM stdin;
766aaa3e-0917-441d-91d0-29e7bdb8e283	3f7b6b6b-2d71-4ca6-b718-73af9120933f	tgen_20250709145055QP457	TOSSPAYMENTS	119000.00	approved	{"method": "카드", "status": "DONE", "orderId": "3f7b6b6b-2d71-4ca6-b718-73af9120933f", "mockMode": true, "approvedAt": "2025-07-09T05:51:14.358Z", "paymentKey": "tgen_20250709145055QP457", "receiptUrl": "https://mockreceipt.example.com", "rawResponse": {"method": "카드", "status": "DONE", "orderId": "3f7b6b6b-2d71-4ca6-b718-73af9120933f", "approvedAt": "2025-07-09T05:51:14.358Z", "paymentKey": "tgen_20250709145055QP457", "receiptUrl": "https://mockreceipt.example.com", "totalAmount": 119000}, "totalAmount": 119000, "createdByApproval": true}	2025-07-09 05:51:14.349+00	2025-07-09 05:51:14.358+00	\N	2025-07-09 05:51:14.349+00	2025-07-09 05:51:14.366313+00
377ee7fd-5aad-4562-ad63-56353d3b39fc	13417ab7-920c-4596-adb9-2f8499b30c13	tgen_20250714031335YAyH5	TOSSPAYMENTS	890000.00	approved	{"method": "카드", "status": "DONE", "orderId": "13417ab7-920c-4596-adb9-2f8499b30c13", "mockMode": true, "approvedAt": "2025-07-13T18:14:42.802Z", "paymentKey": "tgen_20250714031335YAyH5", "receiptUrl": "https://mockreceipt.example.com", "rawResponse": {"method": "카드", "status": "DONE", "orderId": "13417ab7-920c-4596-adb9-2f8499b30c13", "approvedAt": "2025-07-13T18:14:42.802Z", "paymentKey": "tgen_20250714031335YAyH5", "receiptUrl": "https://mockreceipt.example.com", "totalAmount": 890000}, "totalAmount": 890000, "createdByApproval": true}	2025-07-13 18:14:42.789+00	2025-07-13 18:14:42.802+00	\N	2025-07-13 18:14:42.789+00	2025-07-13 18:14:42.811783+00
\.


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_id_key UNIQUE (payment_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: order_items unique_product_per_order; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT unique_product_per_order UNIQUE (order_id, product_id);


--
-- Name: idx_order_items_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_created_at ON public.order_items USING btree (created_at);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_ordered_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_ordered_at ON public.orders USING btree (ordered_at);


--
-- Name: idx_orders_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_payment_id ON public.orders USING btree (payment_id) WHERE (payment_id IS NOT NULL);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_status_ordered_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status_ordered_at ON public.orders USING btree (status, ordered_at);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_orders_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user_status ON public.orders USING btree (user_id, status);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_payment_id ON public.payments USING btree (payment_id);


--
-- Name: idx_payments_requested_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_requested_at ON public.payments USING btree (requested_at);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: order_items update_order_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders validate_order_status_transition; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_order_status_transition BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_status_transition();


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

