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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'customer',
    'admin'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    role public.users_role_enum DEFAULT 'customer'::public.users_role_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deactivatedAt" timestamp without time zone,
    "lastLoginAt" timestamp without time zone,
    "refreshToken" character varying(255),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "phoneNumber" character varying(20),
    address character varying(255),
    "postalCode" character varying(10),
    "detailAddress" character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, name, role, "isActive", "deactivatedAt", "lastLoginAt", "refreshToken", "createdAt", "updatedAt", "phoneNumber", address, "postalCode", "detailAddress") FROM stdin;
bd81df36-b6c4-499a-a215-4339eb34a4f0	nerume@gmail.com	$2b$12$YLUvDc0A39pStntNBZE.FerbUBt0ndHgwm2z0watsJXvoGgK0tvRC	fef	customer	t	\N	2025-08-04 10:11:02.821	\N	2025-07-06 11:13:38.484	2025-08-04 10:11:02.821	01034445555	서울 강남구 도산대로 지하 102	06038	길거리
127f9e52-9d3d-4bbc-bdf0-079011fbfe18	usertest@gmail.com	$2b$12$r4vTfmQ6Er196JhRRc7QkeYH7hyGEQ2v17KTtfbkHtG4px/J76zP2	user	customer	t	\N	2025-07-13 08:40:30.739	\N	2025-07-13 08:40:00.449	2025-07-27 01:01:30.588	01033333333	\N	\N	\N
6b9f9264-c89e-43dc-ba42-0a9cbb72b065	rlarkdmf@naver.com	$2b$12$tp4TQl.P323K.wUejFDAyOWUhvAMMUmvh3j2Ksp0kHk.EymuVKl0e	김가을	admin	t	\N	2025-07-10 22:46:17.971	\N	2025-07-10 21:30:21.957	2025-07-10 22:46:17.971	01022223333	\N	\N	\N
cabeef43-723d-4c8b-b386-3b4b3e764039	admin@company.com	$2b$12$4yfruAyltR3oNQ/1evhtsugJ/exwfIX4lzetBMjs/fhJ.SPaQX/zG	관리자	admin	t	\N	2025-08-06 18:03:40.538	\N	2025-07-12 01:02:40.826	2025-08-06 18:03:40.538	01044445555	\N	\N	\N
\.


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- PostgreSQL database dump complete
--

