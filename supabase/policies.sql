-- =====================================================================
-- SITO · Permisos, reglas de acceso (RLS) y funciones
--
-- Ejecutar después de schema.sql. Se puede ejecutar más de una vez.
--
-- Resumen de las reglas:
--   · El trabajador ve sus tareas y las de su cuadrilla.
--   · El supervisor ve todo lo de su obra.
--   · Los cambios de estado pasan por funciones que validan el paso
--     (cerrar_tarea, verificar_tarea, atender_incidente, cerrar_incidente).
--   · Un incidente anónimo solo se acepta sin reportero y sin tarea.
--   · El RUT de las demás personas no se puede leer desde la app.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quién soy: funciones que leen el perfil de la sesión actual.
--    Son "security definer" para poder usarlas dentro de las políticas
--    sin que la tabla perfiles se consulte a sí misma en círculo.
-- ---------------------------------------------------------------------
create or replace function public.mi_rol()
returns text
language sql stable security definer
set search_path = public
as $$ select rol from public.perfiles where id = auth.uid() $$;

create or replace function public.mi_obra()
returns uuid
language sql stable security definer
set search_path = public
as $$ select obra_id from public.perfiles where id = auth.uid() $$;

create or replace function public.mi_cuadrilla()
returns uuid
language sql stable security definer
set search_path = public
as $$ select cuadrilla_id from public.perfiles where id = auth.uid() $$;

-- Para la política de fotos de incidentes anónimos, que se suben sin sesión.
create or replace function public.obra_existe(p_obra text)
returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (select 1 from public.obras where id::text = p_obra) $$;

-- ---------------------------------------------------------------------
-- 2. Permisos de tabla. Se quita todo y se entrega solo lo necesario.
--    Las personas sin sesión (rol anon) no leen ni escriben ninguna tabla.
-- ---------------------------------------------------------------------
revoke all on public.obras, public.cuadrillas, public.perfiles, public.plantillas_tarea,
  public.tareas, public.evidencias, public.verificaciones, public.incidentes
  from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.obras, public.cuadrillas, public.plantillas_tarea,
  public.tareas, public.evidencias, public.verificaciones, public.incidentes
  to authenticated;

-- De perfiles se puede leer todo menos el RUT.
grant select (id, nombre, rol, obra_id, cuadrilla_id, consentimiento_at) on public.perfiles to authenticated;

-- El supervisor asigna tareas. Estado, cierre y verificación los maneja el servidor.
grant insert (id, obra_id, cuadrilla_id, asignado_a, plantilla_id, titulo, lugar, sector, checklist, seguridad, fecha, creada_por)
  on public.tareas to authenticated;

-- Cualquier persona de la obra reporta incidentes. Estado y atención los maneja el servidor.
grant insert (id, obra_id, clase, tipo, tarea_id, lugar, sector, nota, anonimo, reportero_id, foto_path, foto_kb, ocurrido_at)
  on public.incidentes to authenticated;

-- ---------------------------------------------------------------------
-- 3. Reglas de acceso por fila (RLS)
-- ---------------------------------------------------------------------
alter table public.obras            enable row level security;
alter table public.cuadrillas       enable row level security;
alter table public.perfiles         enable row level security;
alter table public.plantillas_tarea enable row level security;
alter table public.tareas           enable row level security;
alter table public.evidencias       enable row level security;
alter table public.verificaciones   enable row level security;
alter table public.incidentes       enable row level security;

drop policy if exists obras_ver on public.obras;
create policy obras_ver on public.obras
  for select to authenticated
  using (id = public.mi_obra());

drop policy if exists cuadrillas_ver on public.cuadrillas;
create policy cuadrillas_ver on public.cuadrillas
  for select to authenticated
  using (obra_id = public.mi_obra());

-- Nombres de la gente de la misma obra (para mostrar "Pedro R." o "Asignada por J. Muñoz").
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles
  for select to authenticated
  using (obra_id = public.mi_obra());

drop policy if exists plantillas_ver on public.plantillas_tarea;
create policy plantillas_ver on public.plantillas_tarea
  for select to authenticated
  using (obra_id = public.mi_obra() and public.mi_rol() = 'supervisor');

-- El trabajador ve sus tareas y las de su cuadrilla; el supervisor, todas las de su obra.
drop policy if exists tareas_ver on public.tareas;
create policy tareas_ver on public.tareas
  for select to authenticated
  using (
    obra_id = public.mi_obra()
    and (
      public.mi_rol() = 'supervisor'
      or asignado_a = auth.uid()
      or cuadrilla_id = public.mi_cuadrilla()
    )
  );

drop policy if exists tareas_asignar on public.tareas;
create policy tareas_asignar on public.tareas
  for insert to authenticated
  with check (
    public.mi_rol() = 'supervisor'
    and obra_id = public.mi_obra()
    and creada_por = auth.uid()
    and exists (
      select 1 from public.cuadrillas c
      where c.id = tareas.cuadrilla_id and c.obra_id = public.mi_obra()
    )
    and (
      asignado_a is null
      or exists (
        select 1 from public.perfiles p
        where p.id = tareas.asignado_a and p.cuadrilla_id = tareas.cuadrilla_id
      )
    )
  );

-- Una evidencia se ve si se puede ver su tarea (la consulta interna respeta tareas_ver).
drop policy if exists evidencias_ver on public.evidencias;
create policy evidencias_ver on public.evidencias
  for select to authenticated
  using (exists (select 1 from public.tareas t where t.id = evidencias.tarea_id));

drop policy if exists verificaciones_ver on public.verificaciones;
create policy verificaciones_ver on public.verificaciones
  for select to authenticated
  using (exists (select 1 from public.tareas t where t.id = verificaciones.tarea_id));

-- El supervisor ve todos los incidentes de su obra. El trabajador solo los que reportó con su nombre.
drop policy if exists incidentes_ver on public.incidentes;
create policy incidentes_ver on public.incidentes
  for select to authenticated
  using (
    obra_id = public.mi_obra()
    and (public.mi_rol() = 'supervisor' or reportero_id = auth.uid())
  );

-- Anonimato: si el reporte es anónimo, reportero_id y tarea_id deben venir vacíos.
-- Si va con nombre, el reportero tiene que ser quien lo envía (nadie reporta a nombre de otro).
drop policy if exists incidentes_reportar on public.incidentes;
create policy incidentes_reportar on public.incidentes
  for insert to authenticated
  with check (
    obra_id = public.mi_obra()
    and (
      (anonimo and reportero_id is null and tarea_id is null)
      or (not anonimo and reportero_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 4. Funciones para los cambios de estado.
--    Todas reconocen un reenvío: si el registro ya existe, no hacen nada.
-- ---------------------------------------------------------------------

-- El trabajador cierra una tarea con su checklist y su foto.
create or replace function public.cerrar_tarea(
  p_tarea     uuid,
  p_evidencia uuid,
  p_checklist boolean[],
  p_foto_path text,
  p_foto_kb   int,
  p_tomada_at timestamptz
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_yo     uuid := auth.uid();
  v_perfil public.perfiles%rowtype;
  v_tarea  public.tareas%rowtype;
begin
  select * into v_perfil from public.perfiles where id = v_yo;
  if not found then
    raise exception 'sin_perfil';
  end if;

  select * into v_tarea from public.tareas where id = p_tarea for update;
  if not found or v_tarea.obra_id <> v_perfil.obra_id then
    raise exception 'tarea_no_existe';
  end if;

  -- Reenvío de un cierre que ya llegó.
  if exists (select 1 from public.evidencias where id = p_evidencia) then
    return;
  end if;

  if v_perfil.rol <> 'trabajador' then
    raise exception 'sin_permiso';
  end if;
  if (v_tarea.asignado_a = v_yo or v_tarea.cuadrilla_id = v_perfil.cuadrilla_id) is not true then
    raise exception 'tarea_ajena';
  end if;
  if v_tarea.estado not in ('asignada', 'corregir') then
    raise exception 'tarea_no_abierta';
  end if;
  if p_foto_path is not null
     and p_foto_path <> 'obras/' || v_tarea.obra_id::text || '/tareas/' || p_evidencia::text || '.jpg' then
    raise exception 'foto_invalida';
  end if;

  insert into public.evidencias (id, tarea_id, obra_id, autor_id, checklist, foto_path, foto_kb, tomada_at)
  values (p_evidencia, p_tarea, v_tarea.obra_id, v_yo, coalesce(p_checklist, '{}'), p_foto_path, p_foto_kb, p_tomada_at);

  update public.tareas
     set estado = 'por_verificar', cerrada_at = p_tomada_at, cerrada_por = v_yo, verificada_at = null
   where id = p_tarea;
end $$;

-- El supervisor aprueba una tarea o pide corregirla.
create or replace function public.verificar_tarea(
  p_verificacion uuid,
  p_tarea        uuid,
  p_resultado    text,
  p_motivos      text[],
  p_comentario   text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_yo        uuid := auth.uid();
  v_perfil    public.perfiles%rowtype;
  v_tarea     public.tareas%rowtype;
  v_evidencia uuid;
begin
  select * into v_perfil from public.perfiles where id = v_yo;
  if not found then
    raise exception 'sin_perfil';
  end if;
  if v_perfil.rol <> 'supervisor' then
    raise exception 'sin_permiso';
  end if;

  select * into v_tarea from public.tareas where id = p_tarea for update;
  if not found or v_tarea.obra_id <> v_perfil.obra_id then
    raise exception 'tarea_no_existe';
  end if;

  if exists (select 1 from public.verificaciones where id = p_verificacion) then
    return;
  end if;

  if p_resultado is null or p_resultado not in ('aprobada', 'corregir') then
    raise exception 'resultado_invalido';
  end if;
  if v_tarea.estado <> 'por_verificar' then
    raise exception 'tarea_no_por_verificar';
  end if;

  select id into v_evidencia
    from public.evidencias
   where tarea_id = p_tarea
   order by tomada_at desc
   limit 1;

  insert into public.verificaciones (id, tarea_id, evidencia_id, supervisor_id, resultado, motivos, comentario)
  values (p_verificacion, p_tarea, v_evidencia, v_yo, p_resultado, coalesce(p_motivos, '{}'), nullif(trim(p_comentario), ''));

  update public.tareas
     set estado = case when p_resultado = 'aprobada' then 'verificada' else 'corregir' end,
         verificada_at = case when p_resultado = 'aprobada' then now() end
   where id = p_tarea;
end $$;

-- El supervisor toma un incidente nuevo.
create or replace function public.atender_incidente(p_incidente uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
begin
  if public.mi_rol() is distinct from 'supervisor' then
    raise exception 'sin_permiso';
  end if;
  if not exists (select 1 from public.incidentes where id = p_incidente and obra_id = public.mi_obra()) then
    raise exception 'incidente_no_existe';
  end if;

  update public.incidentes
     set estado = 'en_atencion', atendido_por = v_yo, atendido_at = now()
   where id = p_incidente and estado = 'nuevo';
end $$;

-- El supervisor da por resuelto un incidente.
create or replace function public.cerrar_incidente(p_incidente uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_yo uuid := auth.uid();
begin
  if public.mi_rol() is distinct from 'supervisor' then
    raise exception 'sin_permiso';
  end if;
  if not exists (select 1 from public.incidentes where id = p_incidente and obra_id = public.mi_obra()) then
    raise exception 'incidente_no_existe';
  end if;

  update public.incidentes
     set estado = 'cerrado',
         cerrado_at = now(),
         atendido_por = coalesce(atendido_por, v_yo),
         atendido_at = coalesce(atendido_at, now())
   where id = p_incidente and estado <> 'cerrado';
end $$;

-- La persona acepta el uso de sus datos. Solo se guarda la primera vez.
create or replace function public.aceptar_consentimiento()
returns void
language sql security definer
set search_path = public
as $$
  update public.perfiles
     set consentimiento_at = coalesce(consentimiento_at, now())
   where id = auth.uid()
$$;

-- Las funciones solo las usan personas con sesión.
revoke execute on function
  public.mi_rol(), public.mi_obra(), public.mi_cuadrilla(),
  public.cerrar_tarea(uuid, uuid, boolean[], text, int, timestamptz),
  public.verificar_tarea(uuid, uuid, text, text[], text),
  public.atender_incidente(uuid), public.cerrar_incidente(uuid),
  public.aceptar_consentimiento()
  from public, anon;

grant execute on function
  public.mi_rol(), public.mi_obra(), public.mi_cuadrilla(),
  public.cerrar_tarea(uuid, uuid, boolean[], text, int, timestamptz),
  public.verificar_tarea(uuid, uuid, text, text[], text),
  public.atender_incidente(uuid), public.cerrar_incidente(uuid),
  public.aceptar_consentimiento()
  to authenticated;

revoke execute on function public.obra_existe(text) from public;
grant execute on function public.obra_existe(text), public.hoy_en_obra() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Fotos (Storage): bucket privado "evidencias"
--      obras/<obra>/tareas/<evidencia>.jpg       foto de una tarea terminada
--      obras/<obra>/incidentes/<incidente>.jpg   foto de un incidente
--    Solo JPEG y hasta 1 MB (la app las comprime a unos 300 KB).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Con sesión: cada persona sube fotos solo a la carpeta de su obra.
drop policy if exists evidencias_subir on storage.objects;
create policy evidencias_subir on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] = 'obras'
    and (storage.foldername(name))[2] = public.mi_obra()::text
    and (storage.foldername(name))[3] in ('tareas', 'incidentes')
  );

-- Sin sesión: la foto de un incidente anónimo se sube sin identificar a nadie.
-- Storage guarda en cada archivo quién lo subió; al subirla sin sesión ese dato queda vacío.
drop policy if exists evidencias_subir_anonimo on storage.objects;
create policy evidencias_subir_anonimo on storage.objects
  for insert to anon
  with check (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] = 'obras'
    and public.obra_existe((storage.foldername(name))[2])
    and (storage.foldername(name))[3] = 'incidentes'
  );

-- El supervisor ve las fotos de su obra. El trabajador, las que subió.
drop policy if exists evidencias_ver_fotos on storage.objects;
create policy evidencias_ver_fotos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[2] = public.mi_obra()::text
    and (public.mi_rol() = 'supervisor' or owner_id = auth.uid()::text)
  );
