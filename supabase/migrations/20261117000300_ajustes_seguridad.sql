-- =====================================================================
-- SITO · Ajustes pedidos por el revisor de seguridad de Supabase (db advisors)
--
-- 1. Las funciones que leen el perfil de la sesión (mi_rol, mi_obra, mi_cuadrilla,
--    obra_existe) pasan del esquema "public" a "privado". La API de Supabase solo
--    publica "public", así que dejan de poder llamarse desde internet; las reglas
--    de acceso las siguen usando igual.
-- 2. Las reglas de acceso usan "(select …)" alrededor de esas funciones y de auth.uid(),
--    para que PostgreSQL las calcule una vez por consulta y no una vez por fila.
-- 3. hoy_en_obra() fija su ruta de búsqueda.
-- 4. Índices para las llaves que usan las reglas de acceso.
--
-- Va después de …_politicas.sql. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funciones de la sesión, en un esquema que la API no publica
-- ---------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated;

create or replace function privado.mi_rol()
returns text
language sql stable security definer
set search_path = ''
as $$ select rol from public.perfiles where id = (select auth.uid()) $$;

create or replace function privado.mi_obra()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select obra_id from public.perfiles where id = (select auth.uid()) $$;

create or replace function privado.mi_cuadrilla()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select cuadrilla_id from public.perfiles where id = (select auth.uid()) $$;

-- Para la política de fotos de incidentes anónimos, que se suben sin sesión.
create or replace function privado.obra_existe(p_obra text)
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.obras where id::text = p_obra) $$;

revoke execute on all functions in schema privado from public, anon, authenticated;
grant execute on function privado.mi_rol(), privado.mi_obra(), privado.mi_cuadrilla() to authenticated;
grant execute on function privado.obra_existe(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Reglas de acceso (mismo contenido que en …_politicas.sql, con "(select …)")
-- ---------------------------------------------------------------------
drop policy if exists obras_ver on public.obras;
create policy obras_ver on public.obras
  for select to authenticated
  using (id = (select privado.mi_obra()));

drop policy if exists cuadrillas_ver on public.cuadrillas;
create policy cuadrillas_ver on public.cuadrillas
  for select to authenticated
  using (obra_id = (select privado.mi_obra()));

drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles
  for select to authenticated
  using (obra_id = (select privado.mi_obra()));

drop policy if exists plantillas_ver on public.plantillas_tarea;
create policy plantillas_ver on public.plantillas_tarea
  for select to authenticated
  using (obra_id = (select privado.mi_obra()) and (select privado.mi_rol()) = 'supervisor');

drop policy if exists tareas_ver on public.tareas;
create policy tareas_ver on public.tareas
  for select to authenticated
  using (
    obra_id = (select privado.mi_obra())
    and (
      (select privado.mi_rol()) = 'supervisor'
      or asignado_a = (select auth.uid())
      or cuadrilla_id = (select privado.mi_cuadrilla())
    )
  );

drop policy if exists tareas_asignar on public.tareas;
create policy tareas_asignar on public.tareas
  for insert to authenticated
  with check (
    (select privado.mi_rol()) = 'supervisor'
    and obra_id = (select privado.mi_obra())
    and creada_por = (select auth.uid())
    and exists (
      select 1 from public.cuadrillas c
      where c.id = tareas.cuadrilla_id and c.obra_id = (select privado.mi_obra())
    )
    and (
      asignado_a is null
      or exists (
        select 1 from public.perfiles p
        where p.id = tareas.asignado_a and p.cuadrilla_id = tareas.cuadrilla_id
      )
    )
  );

drop policy if exists incidentes_ver on public.incidentes;
create policy incidentes_ver on public.incidentes
  for select to authenticated
  using (
    obra_id = (select privado.mi_obra())
    and ((select privado.mi_rol()) = 'supervisor' or reportero_id = (select auth.uid()))
  );

drop policy if exists incidentes_reportar on public.incidentes;
create policy incidentes_reportar on public.incidentes
  for insert to authenticated
  with check (
    obra_id = (select privado.mi_obra())
    and (
      (anonimo and reportero_id is null and tarea_id is null)
      or (not anonimo and reportero_id = (select auth.uid()))
    )
  );

drop policy if exists evidencias_subir on storage.objects;
create policy evidencias_subir on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] = 'obras'
    and (storage.foldername(name))[2] = (select privado.mi_obra())::text
    and (storage.foldername(name))[3] in ('tareas', 'incidentes')
  );

drop policy if exists evidencias_subir_anonimo on storage.objects;
create policy evidencias_subir_anonimo on storage.objects
  for insert to anon
  with check (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] = 'obras'
    and privado.obra_existe((storage.foldername(name))[2])
    and (storage.foldername(name))[3] = 'incidentes'
  );

drop policy if exists evidencias_ver_fotos on storage.objects;
create policy evidencias_ver_fotos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[2] = (select privado.mi_obra())::text
    and ((select privado.mi_rol()) = 'supervisor' or owner_id = (select auth.uid())::text)
  );

-- Las funciones de incidentes usaban las versiones de "public": se actualizan.
create or replace function public.atender_incidente(p_incidente uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
begin
  if privado.mi_rol() is distinct from 'supervisor' then
    raise exception 'sin_permiso';
  end if;
  if not exists (select 1 from public.incidentes where id = p_incidente and obra_id = privado.mi_obra()) then
    raise exception 'incidente_no_existe';
  end if;

  update public.incidentes
     set estado = 'en_atencion', atendido_por = v_yo, atendido_at = now()
   where id = p_incidente and estado = 'nuevo';
end $$;

create or replace function public.cerrar_incidente(p_incidente uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
begin
  if privado.mi_rol() is distinct from 'supervisor' then
    raise exception 'sin_permiso';
  end if;
  if not exists (select 1 from public.incidentes where id = p_incidente and obra_id = privado.mi_obra()) then
    raise exception 'incidente_no_existe';
  end if;

  update public.incidentes
     set estado = 'cerrado',
         cerrado_at = now(),
         atendido_por = coalesce(atendido_por, v_yo),
         atendido_at = coalesce(atendido_at, now())
   where id = p_incidente and estado <> 'cerrado';
end $$;

-- Ya nada usa las versiones de "public".
drop function if exists public.mi_rol();
drop function if exists public.mi_obra();
drop function if exists public.mi_cuadrilla();
drop function if exists public.obra_existe(text);

-- ---------------------------------------------------------------------
-- 3. hoy_en_obra() con ruta de búsqueda fija
-- ---------------------------------------------------------------------
alter function public.hoy_en_obra() set search_path = '';

-- ---------------------------------------------------------------------
-- 4. Índices para las llaves que usan las reglas de acceso y la app
-- ---------------------------------------------------------------------
create index if not exists cuadrillas_obra_idx on public.cuadrillas (obra_id);
create index if not exists perfiles_obra_idx on public.perfiles (obra_id);
create index if not exists perfiles_cuadrilla_idx on public.perfiles (cuadrilla_id);
create index if not exists plantillas_obra_idx on public.plantillas_tarea (obra_id);
create index if not exists evidencias_obra_idx on public.evidencias (obra_id);
create index if not exists incidentes_tarea_idx on public.incidentes (tarea_id);
create index if not exists incidentes_reportero_idx on public.incidentes (reportero_id);
