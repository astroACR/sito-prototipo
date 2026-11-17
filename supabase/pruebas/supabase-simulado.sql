-- Imitación mínima de lo que Supabase ya trae creado (roles, auth, storage, realtime).
-- Solo la usan las pruebas automáticas (supabase/sql.test.js), que cargan los archivos SQL
-- del proyecto en un PostgreSQL en memoria. NO se ejecuta en Supabase.

create schema if not exists extensions;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

-- Supabase entrega por defecto todos los permisos de las tablas y funciones nuevas a estos roles.
-- Se imita para comprobar que policies.sql de verdad los quita.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant usage on schema public, extensions to anon, authenticated, service_role;

-- ---- auth ----
create schema auth;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  confirmation_token varchar(255),
  recovery_token varchar(255),
  email_change varchar(255),
  email_change_token_new varchar(255),
  email_change_token_current varchar(255) default '',
  phone_change text default '',
  phone_change_token varchar(255) default '',
  reauthentication_token varchar(255) default ''
);

create table auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  constraint identities_provider_id_provider_unique unique (provider_id, provider)
);

create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated, service_role;

-- ---- storage ----
create schema storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;

create function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare
  _partes text[];
begin
  select string_to_array(name, '/') into _partes;
  return _partes[1 : array_length(_partes, 1) - 1];
end $$;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;

-- ---- realtime ----
create publication supabase_realtime;
