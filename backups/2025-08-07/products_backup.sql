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
-- Name: calculate_discounted_price(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_discounted_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- discount_percentage가 변경되거나 original_price가 변경된 경우 price 재계산
        IF TG_OP = 'INSERT' OR 
           OLD.discount_percentage IS DISTINCT FROM NEW.discount_percentage OR
           OLD.original_price IS DISTINCT FROM NEW.original_price THEN
          
          -- 할인된 가격 계산 (소수점 둘째자리까지)
          NEW.price = ROUND(
            NEW.original_price * (1 - COALESCE(NEW.discount_percentage, 0) / 100), 
            2
          );
          
          -- 계산된 가격이 0보다 작으면 0으로 설정
          IF NEW.price < 0 THEN
            NEW.price = 0;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.calculate_discounted_price() OWNER TO postgres;

--
-- Name: update_updated_at_simple(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_simple() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW."updated_at" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_updated_at_simple() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: inventories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    available_quantity integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 10 NOT NULL,
    location character varying(100) DEFAULT 'MAIN_WAREHOUSE'::character varying NOT NULL,
    last_restocked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_inventories_available_lte_quantity" CHECK ((available_quantity <= quantity)),
    CONSTRAINT "CHK_inventories_available_non_negative" CHECK ((available_quantity >= 0)),
    CONSTRAINT "CHK_inventories_quantity_non_negative" CHECK ((quantity >= 0)),
    CONSTRAINT "CHK_inventories_threshold_positive" CHECK ((low_stock_threshold > 0))
);


ALTER TABLE public.inventories OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: product_qna; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_qna (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_name character varying(100) NOT NULL,
    question text NOT NULL,
    answer text,
    is_answered boolean DEFAULT false,
    answered_by character varying(100),
    answered_at timestamp without time zone,
    is_public boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_qna OWNER TO postgres;

--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_name character varying(100) NOT NULL,
    rating integer NOT NULL,
    content text NOT NULL,
    is_verified_purchase boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_product_reviews_helpful" CHECK ((helpful_count >= 0)),
    CONSTRAINT "CHK_product_reviews_rating" CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.product_reviews OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(300) NOT NULL,
    description text NOT NULL,
    price numeric(12,2) NOT NULL,
    original_price numeric(12,2),
    brand character varying(100) NOT NULL,
    sku character varying(100) NOT NULL,
    category_id uuid NOT NULL,
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    image_urls jsonb DEFAULT '[]'::jsonb,
    thumbnail_url character varying(500),
    weight numeric(8,2),
    dimensions jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0.00,
    CONSTRAINT "CHK_products_original_price" CHECK (((original_price IS NULL) OR (original_price >= price))),
    CONSTRAINT "CHK_products_price_positive" CHECK ((price > (0)::numeric)),
    CONSTRAINT "CHK_products_rating_valid" CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT "CHK_products_weight_positive" CHECK (((weight IS NULL) OR (weight > (0)::numeric))),
    CONSTRAINT products_discount_percentage_check CHECK (((discount_percentage >= (0)::numeric) AND (discount_percentage <= (100)::numeric)))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_with_details; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.products_with_details AS
 SELECT p.id,
    p.name,
    p.description,
    p.price,
    p.original_price,
    p.brand,
    p.sku,
    p.category_id,
    p.rating,
    p.review_count,
    p.image_urls,
    p.thumbnail_url,
    p.weight,
    p.dimensions,
    p.tags,
    p.is_active,
    p.is_featured,
    p.created_at,
    p.updated_at,
    p.discount_percentage,
    c.name AS category_name,
    c.slug AS category_slug,
    i.quantity AS inventory_quantity,
    i.available_quantity AS inventory_available,
        CASE
            WHEN (i.available_quantity = 0) THEN 'out_of_stock'::text
            WHEN (i.available_quantity <= i.low_stock_threshold) THEN 'low_stock'::text
            ELSE 'sufficient'::text
        END AS inventory_status,
    i.location AS inventory_location
   FROM ((public.products p
     LEFT JOIN public.categories c ON ((p.category_id = c.id)))
     LEFT JOIN public.inventories i ON ((p.id = i.product_id)));


ALTER TABLE public.products_with_details OWNER TO postgres;

--
-- Name: typeorm_metadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.typeorm_metadata (
    type character varying NOT NULL,
    database character varying,
    schema character varying,
    "table" character varying,
    name character varying,
    value text
);


ALTER TABLE public.typeorm_metadata OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, description, sort_order, is_active, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440001	전자제품	electronics	TV, 냉장고, 세탁기, 소형가전 등	1	t	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
550e8400-e29b-41d4-a716-446655440002	컴퓨터/노트북	computers	노트북, 데스크톱, 태블릿, 컴퓨터 주변기기	2	t	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
550e8400-e29b-41d4-a716-446655440003	의류/패션	fashion	남성복, 여성복, 신발, 가방, 액세서리	3	t	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
550e8400-e29b-41d4-a716-446655440004	생활용품	household	주방용품, 생활잡화, 청소용품, 수납정리	4	t	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
550e8400-e29b-41d4-a716-446655440005	도서/문구	books	도서, 전자책, 문구용품, 사무용품	5	t	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
\.


--
-- Data for Name: inventories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventories (id, product_id, quantity, available_quantity, low_stock_threshold, location, last_restocked_at, created_at, updated_at) FROM stdin;
dc5170bf-e1cc-49e0-ae8f-387cd9e384fa	660e8400-e29b-41d4-a716-446655440001	30	27	10	MAIN_WAREHOUSE	2025-06-26 00:18:06.774	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
6f232743-5fb6-4c79-b7c4-bb8f9fea5f69	660e8400-e29b-41d4-a716-446655440002	48	43	10	MAIN_WAREHOUSE	2025-06-29 12:04:04.902	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
48cc716c-38cf-4001-b711-d01c56eed165	660e8400-e29b-41d4-a716-446655440003	37	33	10	MAIN_WAREHOUSE	2025-06-17 07:12:57.294	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
cc4e5666-724e-4e95-94bc-63d91f781f79	660e8400-e29b-41d4-a716-446655440004	28	25	10	MAIN_WAREHOUSE	2025-06-22 19:37:29.239	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
f56afd98-86c2-475d-9caa-9f6935c4eeb8	660e8400-e29b-41d4-a716-446655440005	52	46	10	MAIN_WAREHOUSE	2025-06-26 00:57:52.973	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
af2ced8c-d34b-4665-802e-2bc587e5b19d	660e8400-e29b-41d4-a716-446655440006	27	24	10	MAIN_WAREHOUSE	2025-06-16 19:24:57.467	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
a7b16e14-e012-4595-baa6-76f1bac8e2eb	660e8400-e29b-41d4-a716-446655440007	56	50	10	MAIN_WAREHOUSE	2025-06-26 22:47:45.628	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
3f39bce1-b599-41e0-bf9c-1ad8b779cdf1	660e8400-e29b-41d4-a716-446655440008	67	60	10	MAIN_WAREHOUSE	2025-06-20 12:19:35.626	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
4b03d4a6-65e9-4f05-abdf-dad76196e737	660e8400-e29b-41d4-a716-446655440009	68	61	10	MAIN_WAREHOUSE	2025-06-24 08:39:35.099	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
2820df2c-30cd-4601-a006-83c9beb30837	660e8400-e29b-41d4-a716-446655440010	51	45	10	MAIN_WAREHOUSE	2025-06-19 11:31:03.339	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
f2d23af2-7274-4647-a817-95b5be1b0278	c104e0b9-8916-4694-839c-afad9c674ed2	12	12	10	MAIN_WAREHOUSE	\N	2025-08-03 06:45:21.484	2025-08-03 06:45:21.484
715d9fa4-e819-46ca-a1de-55deb3e5ef41	50c9a1cf-9cdc-4517-aa2f-dd1a765e333d	12	12	10	MAIN_WAREHOUSE	\N	2025-08-04 01:40:54.054	2025-08-04 01:40:54.054
30295dd1-e9ae-4802-a3f1-f692fb68b8c1	ec318eaf-9e88-4668-a694-16ea107789e6	10	10	10	MAIN_WAREHOUSE	\N	2025-08-04 01:41:22.505	2025-08-04 01:41:22.505
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1735550000000	SimplifiedSchema1735550000000
2	1735550100000	SimplifiedSeedData1735550100000
3	1735550200000	FixQnATimestamps1735550200000
4	1735551000000	AddDiscountField1735551000000
\.


--
-- Data for Name: product_qna; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_qna (id, product_id, user_name, question, answer, is_answered, answered_by, answered_at, is_public, created_at, updated_at) FROM stdin;
65ac3076-190d-4937-9bbd-d4593ce92ba4	660e8400-e29b-41d4-a716-446655440007	신동욱	식기세척기 사용 가능한가요?	\N	f	\N	\N	t	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
f9e0e964-b51e-453b-8e77-879d12f53f3f	660e8400-e29b-41d4-a716-446655440006	테스트	테스트임	\N	f	\N	\N	f	2025-07-01 21:13:25.674	2025-07-01 21:13:25.674
b9bc405d-6b40-48b1-a2e5-94a7906448ed	660e8400-e29b-41d4-a716-446655440006	테스트	테스트입니다	\N	f	\N	\N	t	2025-07-01 21:13:40.217	2025-07-01 21:13:40.217
744a66c5-41fd-4c5a-9299-85bd3db7370b	660e8400-e29b-41d4-a716-446655440001	김철수	벽걸이 브라켓은 별도 구매해야 하나요?	네, 벽걸이 브라켓은 별도 구매하셔야 합니다. LG 정품 브라켓을 권장드려요.	t	고객센터	2025-07-06 01:38:45.656	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
bb4f5244-8b11-446b-9a36-6edbdbe9206c	660e8400-e29b-41d4-a716-446655440001	이영미	AS 기간은 얼마나 되나요?	구매일로부터 2년간 무상 A/S가 제공됩니다.	t	고객센터	2025-06-30 08:55:32.066	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
17457aa2-f993-49f9-a370-e8ab17cd6ab3	660e8400-e29b-41d4-a716-446655440003	박준혁	메모리 업그레이드 가능한가요?	M2 MacBook Air는 메모리가 온보드 방식이라 업그레이드가 불가능합니다.	t	기술지원팀	2025-07-05 21:42:45.048	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
37b06dff-9fa5-4968-ba9d-2eaccd838c9c	660e8400-e29b-41d4-a716-446655440003	정수연	충전기 별도 구매 가능한가요?	네, Apple 정품 충전기를 별도 구매하실 수 있습니다.	t	고객센터	2025-07-02 04:31:48.788	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
0b748ac7-db50-45c3-bed9-77e966b4fbab	660e8400-e29b-41d4-a716-446655440006	강태우	사이즈 교환 가능한가요?	새 제품 상태에서 7일 이내 교환 가능합니다.	t	교환팀	2025-07-05 19:17:12.179	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
5389d090-bc77-4567-9349-9a6e77269272	660e8400-e29b-41d4-a716-446655440006	홍지영	260mm면 몇 사이즈인가요?	나이키 기준으로 260mm는 41.5사이즈에 해당합니다.	t	고객센터	2025-07-06 03:34:32.918	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
071a5309-f60b-4a65-80fa-cb7ded800dc0	660e8400-e29b-41d4-a716-446655440009	조민정	중고책인가요 새책인가요?	정품 새책입니다. 포장된 상태로 배송됩니다.	t	상품팀	2025-07-04 17:42:41.242	t	2025-06-30 03:50:25.83744	2025-07-01 16:41:26.99013
21493d1a-a7c6-4300-b47f-8f25f46fb152	660e8400-e29b-41d4-a716-446655440002	네루미	ㅎㅎ	\N	f	\N	\N	t	2025-07-11 03:45:06.497	2025-07-11 03:45:06.497
1471aa7d-6415-41e6-8aca-427538c3d59f	660e8400-e29b-41d4-a716-446655440001	네루미	test	\N	f	\N	\N	t	2025-07-11 04:26:43.168	2025-07-11 04:26:43.168
2a4a1805-c113-4d15-8cdf-11757cef8431	660e8400-e29b-41d4-a716-446655440007	네루미	test	\N	f	\N	\N	t	2025-07-14 03:12:08.666	2025-07-14 03:12:08.666
\.


--
-- Data for Name: product_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_reviews (id, product_id, user_name, rating, content, is_verified_purchase, helpful_count, created_at, updated_at) FROM stdin;
a3fa58e9-469f-4b5c-ac2c-880bf24e8fc7	660e8400-e29b-41d4-a716-446655440001	김지훈	5	화질이 정말 선명하고 색감이 생생해요! OLED 기술력이 대단합니다. 영화 볼 때마다 감탄하고 있어요.	t	4	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
e521497d-14be-40af-9432-a2f5b70d176c	660e8400-e29b-41d4-a716-446655440001	박영희	4	좋긴 한데 가격이 좀 비싸네요. 그래도 화질만큼은 최고입니다.	t	10	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
5ee5aa32-234a-4db6-8191-9f61210791b5	660e8400-e29b-41d4-a716-446655440001	이민수	5	검은색 표현이 완전 블랙이라서 명암비가 엄청나요. 게임할 때도 완전 만족!	f	9	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
0fbfcaa4-d33f-47e8-9c51-a9bbab86332a	660e8400-e29b-41d4-a716-446655440002	최수진	5	레이저 기능이 신기해요! 보이지 않던 먼지까지 다 보여서 깨끗하게 청소할 수 있어요.	t	2	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
440cd82b-b741-4143-b075-7405fbd70ed7	660e8400-e29b-41d4-a716-446655440002	정태호	4	흡입력 좋고 무선이라 편해요. 다만 무거운 편이라 팔이 좀 아파요.	t	9	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
7b0d1ac3-6dca-4c67-8579-8ddad2d0bc12	660e8400-e29b-41d4-a716-446655440003	한소영	5	M2 칩 성능이 정말 뛰어나네요. 배터리도 하루 종일 쓸 수 있어서 만족합니다!	t	18	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
9502a7d3-3f1b-466c-8dae-0ba29aa8acb1	660e8400-e29b-41d4-a716-446655440003	김동현	5	가볍고 얇아서 들고 다니기 편해요. 디자인도 세련되고 성능도 훌륭합니다.	t	6	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
d9a57321-2295-46d1-ba46-e5bb6a2e2a7e	660e8400-e29b-41d4-a716-446655440006	송지은	5	클래식한 디자인이 어떤 옷에나 잘 어울려요. 착용감도 편하고 내구성도 좋네요.	t	2	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
f0e7431b-5452-414b-b292-58b6000efe4d	660e8400-e29b-41d4-a716-446655440006	임현우	4	신발이 좀 무거운 편이긴 하지만 디자인과 품질은 만족해요.	f	10	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
bfc69347-a7c0-4276-9845-65cb73e01afa	660e8400-e29b-41d4-a716-446655440009	오성민	5	드디어 완결까지 다 모았네요! 25년간의 대서사가 정말 감동적이에요.	t	10	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
cc9af84d-aac3-458e-b3d4-127efb00b157	660e8400-e29b-41d4-a716-446655440009	윤미래	5	아이가 너무 좋아해요. 포장 상태도 깔끔하고 정품이라 안심됩니다.	t	0	2025-06-30 03:50:25.83744	2025-06-30 03:50:25.83744
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, price, original_price, brand, sku, category_id, rating, review_count, image_urls, thumbnail_url, weight, dimensions, tags, is_active, is_featured, created_at, updated_at, discount_percentage) FROM stdin;
ec318eaf-9e88-4668-a694-16ea107789e6	test3	test3	9500.00	10000.00	test3	TEST-TEST3	550e8400-e29b-41d4-a716-446655440001	0.00	0	"[]"	\N	\N	\N	"[]"	t	f	2025-08-04 01:41:22.491	2025-08-03 16:47:55.225812	5.00
660e8400-e29b-41d4-a716-446655440002	다이슨 V15 무선청소기	레이저로 먼지를 감지하는 혁신적인 무선청소기입니다. 60분 연속 사용 가능한 대용량 배터리와 5단계 필터링 시스템으로 완벽한 청소를 제공합니다.	890010.00	990000.00	Dyson	DYSON-V15-DETECT	550e8400-e29b-41d4-a716-446655440001	4.80	89	"[\\"http://localhost:3001/uploads/products/product_1754167101472.png\\"]"	http://localhost:3001/uploads/products/product_1754167101472.png	3.10	\N	["무선청소기", "레이저감지", "60분배터리"]	t	f	2025-06-30 03:50:25.83744	2025-08-02 20:38:21.493783	10.10
660e8400-e29b-41d4-a716-446655440005	유니클로 히트텍 크루넥 긴팔T	유니클로만의 히트텍 기술로 따뜻함을 유지하면서도 얇고 가벼운 착용감. 일상복부터 이너웨어까지 다양하게 활용 가능한 필수 아이템입니다.	14925.00	19900.00	UNIQLO	UNIQLO-HEATTECH-LS	550e8400-e29b-41d4-a716-446655440003	4.30	203	"[\\"http://localhost:3001/uploads/products/product_1754168156950.png\\"]"	http://localhost:3001/uploads/products/product_1754168156950.png	0.30	\N	["히트텍", "긴팔", "보온", "일상복"]	t	f	2025-06-30 03:50:25.83744	2025-08-03 16:38:19.472994	25.00
660e8400-e29b-41d4-a716-446655440003	MacBook Air M2 13인치 (256GB)	M2 칩의 강력한 성능과 18시간 배터리 생활. 완전히 새로워진 디자인으로 어디서나 자유롭게 작업하세요. macOS와 완벽한 호환성을 자랑합니다.	1682100.00	1890000.00	Apple	MBA13-M2-256	550e8400-e29b-41d4-a716-446655440002	4.80	127	"[\\"http://localhost:3001/uploads/products/product_1754168149144.png\\"]"	http://localhost:3001/uploads/products/product_1754168149144.png	1.24	{"depth": 21.5, "width": 30.41, "height": 1.13}	["M2칩", "MacBook", "18시간배터리"]	t	t	2025-06-30 03:50:25.83744	2025-08-03 16:39:20.676875	11.00
c104e0b9-8916-4694-839c-afad9c674ed2	test2	test2	16000.00	20000.00	test2	TEST-TEST2	550e8400-e29b-41d4-a716-446655440002	0.00	0	"[\\"http://localhost:3001/uploads/products/product_1754171121432_5bbce04d.png?v=1754171121436\\",\\"http://localhost:3001/uploads/products/product_1754171121432_c118e75d.png?v=1754171121436\\"]"	http://localhost:3001/uploads/products/product_1754171121432_5bbce04d.png?v=1754171121436	100.00	"{\\"width\\":11,\\"height\\":20,\\"depth\\":35}"	"[]"	t	f	2025-08-03 06:45:21.461	2025-08-03 16:39:48.168229	20.00
660e8400-e29b-41d4-a716-446655440001	LG 올레드 55인치 4K 스마트TV	완벽한 블랙 표현의 OLED 디스플레이로 생생한 화질을 경험하세요. webOS 스마트 기능과 돌비 비전 지원으로 최고의 시청 경험을 제공합니다.	1900700.00	2290000.00	LG전자	LG-OLED55C3	550e8400-e29b-41d4-a716-446655440001	4.60	45	"[\\"http://localhost:3001/uploads/products/product_1754167092727.png\\"]"	http://localhost:3001/uploads/products/product_1754167092727.png	21.60	\N	["OLED", "4K", "스마트TV", "돌비비전"]	t	t	2025-06-30 03:50:25.83744	2025-08-02 20:38:12.771812	17.00
660e8400-e29b-41d4-a716-446655440009	원피스 1-105권 완결 세트	전 세계가 사랑하는 모험 만화 원피스 완결판. 루피와 동료들의 위대한 모험을 처음부터 끝까지 완주해보세요. 소장가치가 높은 정품 도서입니다.	945000.00	1050000.00	대원씨아이	ONEPIECE-COMPLETE-SET	550e8400-e29b-41d4-a716-446655440005	4.90	92	"[\\"http://localhost:3001/uploads/products/product_1754168165366.png\\"]"	http://localhost:3001/uploads/products/product_1754168165366.png	15.00	\N	["원피스", "만화", "완결세트", "소장용"]	t	t	2025-06-30 03:50:25.83744	2025-08-02 20:56:05.390785	10.00
660e8400-e29b-41d4-a716-446655440006	나이키 에어포스1 스니커즈	1982년 출시 이후 변함없는 디자인으로 사랑받는 클래식 농구화. 편안한 착용감과 뛰어난 내구성으로 데일리 신발로 완벽합니다.	119000.00	119000.00	Nike	NIKE-AF1-WHITE	550e8400-e29b-41d4-a716-446655440003	4.70	156	"[\\"http://localhost:3001/uploads/products/product_1754168184501.png\\"]"	http://localhost:3001/uploads/products/product_1754168184501.png	0.80	\N	["나이키", "에어포스1", "스니커즈", "클래식"]	t	t	2025-06-30 03:50:25.83744	2025-08-02 20:56:24.546165	0.00
660e8400-e29b-41d4-a716-446655440008	3M 스카치브라이트 수세미 6개입	3M 스카치브라이트 수세미로 강력한 세정력과 내구성을 경험하세요. 코팅팬도 손상시키지 않는 부드러운 재질로 안심하고 사용할 수 있습니다.	8900.00	8900.00	3M	3M-SCOTCH-SPONGE-6	550e8400-e29b-41d4-a716-446655440004	4.20	234	"[\\"http://localhost:3001/uploads/products/product_1754168192555.png\\"]"	http://localhost:3001/uploads/products/product_1754168192555.png	0.10	\N	["수세미", "3M", "6개입", "주방용품"]	t	f	2025-06-30 03:50:25.83744	2025-08-02 20:56:32.585104	0.00
660e8400-e29b-41d4-a716-446655440004	LG 그램 17인치 노트북 (i7, 16GB)	17인치 대화면에 1.35kg 초경량. 22시간 배터리로 하루 종일 업무가 가능합니다. 인텔 12세대 i7 프로세서와 16GB 메모리로 뛰어난 성능을 제공합니다.	1900700.00	2290000.00	LG전자	GRAM17-I7-16GB	550e8400-e29b-41d4-a716-446655440002	4.50	68	"[\\"http://localhost:3001/uploads/products/product_1754168206646.png\\"]"	http://localhost:3001/uploads/products/product_1754168206646.png	1.35	{"depth": 26.0, "width": 37.6, "height": 1.7}	["17인치", "초경량", "22시간배터리"]	t	f	2025-06-30 03:50:25.83744	2025-08-02 20:56:46.647552	17.00
660e8400-e29b-41d4-a716-446655440010	모나미 153 볼펜 12자루 세트 (검정)	1963년 출시 이후 60년간 사랑받는 국민 볼펜. 부드러운 필기감과 뛰어난 내구성으로 학생부터 직장인까지 모두가 선택하는 필수 문구입니다.	5400.00	6000.00	모나미	MONAMI-153-BLACK-12	550e8400-e29b-41d4-a716-446655440005	4.10	445	"[\\"http://localhost:3001/uploads/products/product_1754168218916.png\\"]"	http://localhost:3001/uploads/products/product_1754168218916.png	0.20	\N	["모나미", "볼펜", "12자루", "검정"]	t	f	2025-06-30 03:50:25.83744	2025-08-02 20:56:58.958277	10.00
660e8400-e29b-41d4-a716-446655440007	스테인리스 보온보냉 텀블러 500ml	이중벽 진공 구조로 6시간 보온, 12시간 보냉 효과. 스테인리스 스틸 소재로 위생적이고 내구성이 뛰어납니다. 밀폐형 뚜껑으로 새지 않아요.	20930.00	29900.00	STANLEY	STANLEY-TUMBLER-500	550e8400-e29b-41d4-a716-446655440004	4.40	78	"[\\"http://localhost:3001/uploads/products/product_1754168197947.png\\"]"	http://localhost:3001/uploads/products/product_1754168197947.png	0.50	{"depth": 8.5, "width": 8.5, "height": 20.3}	["텀블러", "보온보냉", "스테인리스", "500ml"]	t	f	2025-06-30 03:50:25.83744	2025-08-03 16:38:41.629584	30.00
50c9a1cf-9cdc-4517-aa2f-dd1a765e333d	test	test	9000.00	10000.00	test	TEST-TEST1	550e8400-e29b-41d4-a716-446655440001	0.00	0	"[\\"http://localhost:3001/uploads/products/product_1754239254002_3230e517.jpg?v=1754239254006\\"]"	http://localhost:3001/uploads/products/product_1754239254002_3230e517.jpg?v=1754239254006	12.00	"{\\"width\\":33.3,\\"height\\":42.7,\\"depth\\":101}"	"[\\"test\\"]"	t	f	2025-08-04 01:40:54.03	2025-08-04 01:40:54.03	10.00
\.


--
-- Data for Name: typeorm_metadata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.typeorm_metadata (type, database, schema, "table", name, value) FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 4, true);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: categories PK_categories_simple; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "PK_categories_simple" PRIMARY KEY (id);


--
-- Name: inventories PK_inventories_simple; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT "PK_inventories_simple" PRIMARY KEY (id);


--
-- Name: product_qna PK_product_qna; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_qna
    ADD CONSTRAINT "PK_product_qna" PRIMARY KEY (id);


--
-- Name: product_reviews PK_product_reviews; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT "PK_product_reviews" PRIMARY KEY (id);


--
-- Name: products PK_products_simple; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_products_simple" PRIMARY KEY (id);


--
-- Name: categories UQ_categories_slug_simple; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_categories_slug_simple" UNIQUE (slug);


--
-- Name: inventories UQ_inventories_product_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT "UQ_inventories_product_id" UNIQUE (product_id);


--
-- Name: products UQ_products_sku_simple; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_products_sku_simple" UNIQUE (sku);


--
-- Name: IDX_categories_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_categories_active" ON public.categories USING btree (is_active);


--
-- Name: IDX_categories_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_categories_sort_order" ON public.categories USING btree (sort_order);


--
-- Name: IDX_inventories_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventories_location" ON public.inventories USING btree (location);


--
-- Name: IDX_inventories_low_stock; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventories_low_stock" ON public.inventories USING btree (available_quantity) WHERE (available_quantity <= low_stock_threshold);


--
-- Name: IDX_inventories_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_inventories_product_id" ON public.inventories USING btree (product_id);


--
-- Name: IDX_product_qna_answered; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_qna_answered" ON public.product_qna USING btree (is_answered);


--
-- Name: IDX_product_qna_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_qna_created_at" ON public.product_qna USING btree (created_at DESC);


--
-- Name: IDX_product_qna_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_qna_product_id" ON public.product_qna USING btree (product_id);


--
-- Name: IDX_product_qna_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_qna_public" ON public.product_qna USING btree (is_public);


--
-- Name: IDX_product_reviews_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_reviews_created_at" ON public.product_reviews USING btree (created_at DESC);


--
-- Name: IDX_product_reviews_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_reviews_product_id" ON public.product_reviews USING btree (product_id);


--
-- Name: IDX_product_reviews_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_reviews_rating" ON public.product_reviews USING btree (rating);


--
-- Name: IDX_product_reviews_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_product_reviews_verified" ON public.product_reviews USING btree (is_verified_purchase) WHERE (is_verified_purchase = true);


--
-- Name: IDX_products_active_featured; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_active_featured" ON public.products USING btree (is_active, is_featured);


--
-- Name: IDX_products_brand; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_brand" ON public.products USING btree (brand);


--
-- Name: IDX_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_category_id" ON public.products USING btree (category_id);


--
-- Name: IDX_products_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_price" ON public.products USING btree (price);


--
-- Name: IDX_products_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_rating" ON public.products USING btree (rating DESC);


--
-- Name: IDX_products_search_text; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_search_text" ON public.products USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || description)));


--
-- Name: IDX_products_tags_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_products_tags_gin" ON public.products USING gin (tags);


--
-- Name: products calculate_price_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER calculate_price_trigger BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.calculate_discounted_price();


--
-- Name: categories update_categories_updated_at_simple; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at_simple BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_simple();


--
-- Name: inventories update_inventories_updated_at_simple; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventories_updated_at_simple BEFORE UPDATE ON public.inventories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_simple();


--
-- Name: product_qna update_product_qna_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_product_qna_updated_at BEFORE UPDATE ON public.product_qna FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_simple();


--
-- Name: product_reviews update_product_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_simple();


--
-- Name: products update_products_updated_at_simple; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at_simple BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_simple();


--
-- Name: inventories FK_inventories_product_simple; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT "FK_inventories_product_simple" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_qna FK_product_qna_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_qna
    ADD CONSTRAINT "FK_product_qna_product" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_reviews FK_product_reviews_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT "FK_product_reviews_product" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products FK_products_category_simple; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_products_category_simple" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

