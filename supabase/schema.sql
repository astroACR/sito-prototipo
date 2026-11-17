-- =====================================================================
-- SITO · Esquema de la base de datos (Supabase / PostgreSQL)
--
-- Orden de ejecución en el editor SQL de Supabase:
--   1. schema.sql      (este archivo: tablas)
--   2. policies.sql    (permisos, reglas de acceso y funciones)
--   3. seed.sql        (datos de ejemplo de la obra "Torre Norte")
--
-- Se puede ejecutar más de una vez sin dañar los datos existentes.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- La jornada de trabajo se cuenta con la fecha de Chile, no con la del servidor (UTC).
create or replace function public.hoy_en_obra()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Santiago')::date $$;

-- ---------------------------------------------------------------------
-- Obras y cuadrillas
-- ---------------------------------------------------------------------
create table if not exists public.obras (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  -- Lugares que se pueden elegir al asignar una tarea o reportar un incidente.
  lugares   text[] not null default '{}',
  creada_at timestamptz not null default now()
);

create table if not exists public.cuadrillas (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.obras(id) on delete cascade,
  nombre       text not null,
  especialidad text,
  orden        int not null default 0
);

-- ---------------------------------------------------------------------
-- Perfiles: una fila por persona, ligada a su usuario de Supabase Auth.
-- El ingreso es con RUT y clave de 6 números; por dentro el correo es <rut>@sito.local.
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  rut               text not null unique,
  nombre            text not null,
  rol               text not null check (rol in ('trabajador', 'supervisor')),
  obra_id           uuid not null references public.obras(id),
  cuadrilla_id      uuid references public.cuadrillas(id),
  -- Momento en que la persona aceptó el uso de sus datos (Ley N° 21.719). Vacío = aún no acepta.
  consentimiento_at timestamptz,
  creado_at         timestamptz not null default now(),
  constraint trabajador_con_cuadrilla check (rol <> 'trabajador' or cuadrilla_id is not null)
);

-- ---------------------------------------------------------------------
-- Plantillas: tareas tipo con su checklist, para asignar eligiendo en vez de escribir.
-- ---------------------------------------------------------------------
create table if not exists public.plantillas_tarea (
  id        uuid primary key default gen_random_uuid(),
  obra_id   uuid not null references public.obras(id) on delete cascade,
  titulo    text not null,
  checklist text[] not null default '{}',
  seguridad text,
  orden     int not null default 0,
  activa    boolean not null default true
);

-- ---------------------------------------------------------------------
-- Tareas
--   asignada → por_verificar → verificada
--                   ↓
--                corregir → por_verificar → …
-- "Pendiente de envío" no existe aquí: es una marca del celular.
-- El id lo genera el celular (UUID), para que un reenvío nunca duplique la fila.
-- ---------------------------------------------------------------------
create table if not exists public.tareas (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references public.obras(id) on delete cascade,
  cuadrilla_id  uuid not null references public.cuadrillas(id),
  -- Vacío = la tarea es de toda la cuadrilla.
  asignado_a    uuid references public.perfiles(id),
  plantilla_id  uuid references public.plantillas_tarea(id) on delete set null,
  -- Título, checklist y nota de seguridad se copian de la plantilla al asignar.
  titulo        text not null,
  lugar         text not null,
  sector        text,
  checklist     text[] not null default '{}',
  seguridad     text,
  estado        text not null default 'asignada'
                check (estado in ('asignada', 'por_verificar', 'verificada', 'corregir')),
  fecha         date not null default public.hoy_en_obra(),
  creada_por    uuid references public.perfiles(id),
  creada_at     timestamptz not null default now(),
  cerrada_at    timestamptz,
  cerrada_por   uuid references public.perfiles(id),
  verificada_at timestamptz
);

create index if not exists tareas_obra_fecha_idx on public.tareas (obra_id, fecha);
create index if not exists tareas_cuadrilla_idx on public.tareas (cuadrilla_id);
create index if not exists tareas_asignado_idx on public.tareas (asignado_a);

-- ---------------------------------------------------------------------
-- Evidencias: lo que el trabajador entrega al cerrar una tarea (checklist y foto).
-- Una tarea corregida tiene más de una evidencia.
-- ---------------------------------------------------------------------
create table if not exists public.evidencias (
  id          uuid primary key,
  tarea_id    uuid not null references public.tareas(id) on delete cascade,
  obra_id     uuid not null references public.obras(id) on delete cascade,
  autor_id    uuid not null references public.perfiles(id),
  checklist   boolean[] not null default '{}',
  -- Ruta en el bucket "evidencias": obras/<obra>/tareas/<id de la evidencia>.jpg
  foto_path   text,
  foto_kb     int,
  tomada_at   timestamptz not null,
  recibida_at timestamptz not null default now()
);

create index if not exists evidencias_tarea_idx on public.evidencias (tarea_id);

-- ---------------------------------------------------------------------
-- Verificaciones: cada decisión del supervisor sobre una tarea cerrada.
-- ---------------------------------------------------------------------
create table if not exists public.verificaciones (
  id            uuid primary key,
  tarea_id      uuid not null references public.tareas(id) on delete cascade,
  evidencia_id  uuid references public.evidencias(id) on delete set null,
  supervisor_id uuid not null references public.perfiles(id),
  resultado     text not null check (resultado in ('aprobada', 'corregir')),
  motivos       text[] not null default '{}',
  comentario    text,
  creada_at     timestamptz not null default now()
);

create index if not exists verificaciones_tarea_idx on public.verificaciones (tarea_id);

-- ---------------------------------------------------------------------
-- Incidentes
--   clase 'riesgo'   : riesgo de seguridad. Puede ser anónimo.
--   clase 'problema' : algo que frena una tarea (falta material, sin acceso). Siempre con nombre.
--
-- Anonimato (Ley N° 21.719): un incidente anónimo no guarda quién lo reportó
-- ni la tarea desde la que se abrió (una tarea de una sola persona la delataría).
-- ---------------------------------------------------------------------
create table if not exists public.incidentes (
  id           uuid primary key,
  obra_id      uuid not null references public.obras(id) on delete cascade,
  clase        text not null check (clase in ('riesgo', 'problema')),
  tipo         text not null,
  tarea_id     uuid references public.tareas(id) on delete set null,
  lugar        text,
  sector       text,
  nota         text,
  anonimo      boolean not null default false,
  reportero_id uuid references public.perfiles(id),
  -- Ruta en el bucket "evidencias": obras/<obra>/incidentes/<id del incidente>.jpg
  foto_path    text,
  foto_kb      int,
  ocurrido_at  timestamptz not null,
  recibido_at  timestamptz not null default now(),
  estado       text not null default 'nuevo' check (estado in ('nuevo', 'en_atencion', 'cerrado')),
  atendido_por uuid references public.perfiles(id),
  atendido_at  timestamptz,
  cerrado_at   timestamptz,
  constraint tipo_segun_clase check (
    (clase = 'riesgo' and tipo in ('caida', 'material', 'equipo', 'otro'))
    or (clase = 'problema' and tipo in ('falta_material', 'sin_acceso', 'otro'))
  ),
  constraint anonimo_sin_reportero check (not anonimo or reportero_id is null),
  constraint anonimo_sin_tarea check (not anonimo or tarea_id is null),
  constraint con_nombre_lleva_reportero check (anonimo or reportero_id is not null),
  constraint problema_con_nombre check (clase <> 'problema' or not anonimo)
);

create index if not exists incidentes_obra_estado_idx on public.incidentes (obra_id, estado);

-- ---------------------------------------------------------------------
-- Avisos en vivo (Realtime): el panel del supervisor se actualiza solo
-- cuando llega un incidente o cambia una tarea.
-- ---------------------------------------------------------------------
do $$
declare
  v_tabla text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_tabla in array array['tareas', 'evidencias', 'verificaciones', 'incidentes'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_tabla
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_tabla);
      end if;
    end loop;
  end if;
end $$;
