-- =====================================================================
-- SITO · Datos de ejemplo de la obra "Torre Norte"
--
-- ARCHIVO GENERADO: no lo edites a mano. Cambia src/datos/semilla.js y ejecuta "npm run seed".
-- Ejecutar después de schema.sql y policies.sql. Se puede ejecutar más de una vez.
--
-- Usuarios de ejemplo (la clave de todos es 123456):
--   11111111-1  Pedro Rojas     Cuadrilla 2 · Moldaje
--   22222222-2  Luis Soto       Cuadrilla 2 · Moldaje
--   33333333-3  Ana Díaz        Cuadrilla 1 · Enfierradura
--   44444444-4  Marco Vera      Cuadrilla 1 · Enfierradura
--   55555555-5  Carla Pinto     Cuadrilla 3 · Terminaciones
--   66666666-6  Jorge Mella     Cuadrilla 3 · Terminaciones
--   99999999-9  Javiera Muñoz   Supervisor
--
-- Son datos SOLO para la demo. Antes de usar la app con personas reales,
-- borra estos usuarios y crea los verdaderos con claves distintas.
-- =====================================================================

begin;

-- Usuarios de ejemplo en Supabase Auth. El correo interno es <rut>@sito.local y la clave son 6 números.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000001', 'authenticated', 'authenticated', '11111111-1@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000002', 'authenticated', 'authenticated', '22222222-2@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000003', 'authenticated', 'authenticated', '33333333-3@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000004', 'authenticated', 'authenticated', '44444444-4@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000005', 'authenticated', 'authenticated', '55555555-5@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000006', 'authenticated', 'authenticated', '66666666-6@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000003-0000-4000-8000-000000000009', 'authenticated', 'authenticated', '99999999-9@sito.local', extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000001', 'email', '11111111-1@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now()),
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000002', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000002', 'email', '22222222-2@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now()),
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000003', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000003', 'email', '33333333-3@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now()),
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000004', '00000003-0000-4000-8000-000000000004', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000004', 'email', '44444444-4@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now()),
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000005', '00000003-0000-4000-8000-000000000005', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000005', 'email', '55555555-5@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now()),
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000006', '00000003-0000-4000-8000-000000000006', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000006', 'email', '66666666-6@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now()),
  (gen_random_uuid(), '00000003-0000-4000-8000-000000000009', '00000003-0000-4000-8000-000000000009', jsonb_build_object('sub', '00000003-0000-4000-8000-000000000009', 'email', '99999999-9@sito.local', 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- Obra, cuadrillas, perfiles y plantillas de tarea.
insert into public.obras (id, nombre, lugares)
values
  ('00000001-0000-4000-8000-000000000001', 'Torre Norte', array['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4', 'Subterráneo', 'Acceso norte', 'Bodega']::text[])
on conflict (id) do update set nombre = excluded.nombre, lugares = excluded.lugares;

insert into public.cuadrillas (id, obra_id, nombre, especialidad, orden)
values
  ('00000002-0000-4000-8000-000000000001', '00000001-0000-4000-8000-000000000001', 'Cuadrilla 1', 'Enfierradura', 1),
  ('00000002-0000-4000-8000-000000000002', '00000001-0000-4000-8000-000000000001', 'Cuadrilla 2', 'Moldaje', 2),
  ('00000002-0000-4000-8000-000000000003', '00000001-0000-4000-8000-000000000001', 'Cuadrilla 3', 'Terminaciones', 3)
on conflict (id) do update set obra_id = excluded.obra_id, nombre = excluded.nombre, especialidad = excluded.especialidad, orden = excluded.orden;

insert into public.perfiles (id, rut, nombre, rol, obra_id, cuadrilla_id)
values
  ('00000003-0000-4000-8000-000000000001', '11111111-1', 'Pedro Rojas', 'trabajador', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002'),
  ('00000003-0000-4000-8000-000000000002', '22222222-2', 'Luis Soto', 'trabajador', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002'),
  ('00000003-0000-4000-8000-000000000003', '33333333-3', 'Ana Díaz', 'trabajador', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001'),
  ('00000003-0000-4000-8000-000000000004', '44444444-4', 'Marco Vera', 'trabajador', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001'),
  ('00000003-0000-4000-8000-000000000005', '55555555-5', 'Carla Pinto', 'trabajador', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003'),
  ('00000003-0000-4000-8000-000000000006', '66666666-6', 'Jorge Mella', 'trabajador', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003'),
  ('00000003-0000-4000-8000-000000000009', '99999999-9', 'Javiera Muñoz', 'supervisor', '00000001-0000-4000-8000-000000000001', null)
on conflict (id) do update set rut = excluded.rut, nombre = excluded.nombre, rol = excluded.rol, obra_id = excluded.obra_id, cuadrilla_id = excluded.cuadrilla_id;

insert into public.plantillas_tarea (id, obra_id, titulo, checklist, seguridad, orden, activa)
values
  ('00000004-0000-4000-8000-000000000001', '00000001-0000-4000-8000-000000000001', 'Instalar moldaje losa', array['Paneles nivelados', 'Puntales firmes', 'Área despejada']::text[], 'Usa arnés: trabajo sobre 1,8 m de altura.', 1, true),
  ('00000004-0000-4000-8000-000000000002', '00000001-0000-4000-8000-000000000001', 'Revisar alzaprimas', array['Alzaprimas aplomadas', 'Bases firmes', 'Área despejada']::text[], 'Usa casco y guantes durante la revisión.', 2, true),
  ('00000004-0000-4000-8000-000000000003', '00000001-0000-4000-8000-000000000001', 'Limpieza de área de trabajo', array['Escombros retirados', 'Herramientas guardadas', 'Acceso despejado']::text[], 'Usa guantes y zapatos de seguridad.', 3, true),
  ('00000004-0000-4000-8000-000000000004', '00000001-0000-4000-8000-000000000001', 'Instalar moldaje muro', array['Paneles aplomados', 'Tensores apretados', 'Desmoldante aplicado']::text[], 'Usa arnés si trabajas sobre andamio.', 4, true),
  ('00000004-0000-4000-8000-000000000005', '00000001-0000-4000-8000-000000000001', 'Descimbrar muro', array['Hormigón ya resistente', 'Paneles retirados y apilados', 'Clavos y restos retirados']::text[], 'Mantén despejada la zona donde caen los paneles.', 5, true),
  ('00000004-0000-4000-8000-000000000006', '00000001-0000-4000-8000-000000000001', 'Armar enfierradura losa', array['Barras según plano', 'Amarras firmes', 'Separadores puestos']::text[], 'Usa guantes: las puntas de fierro cortan.', 6, true),
  ('00000004-0000-4000-8000-000000000007', '00000001-0000-4000-8000-000000000001', 'Amarrar estribos', array['Distancia según plano', 'Amarras firmes', 'Puntas protegidas']::text[], 'Protege las puntas de fierro con capuchones.', 7, true),
  ('00000004-0000-4000-8000-000000000008', '00000001-0000-4000-8000-000000000001', 'Instalar separadores', array['Separadores cada 1 metro', 'Altura según plano', 'Fierros sin tocar el moldaje']::text[], 'Camina solo por los tablones de paso.', 8, true),
  ('00000004-0000-4000-8000-000000000009', '00000001-0000-4000-8000-000000000001', 'Revisar traslapes', array['Largo de traslape según plano', 'Amarras en cada traslape', 'Fierros limpios']::text[], 'Usa guantes y antiparras.', 9, true),
  ('00000004-0000-4000-8000-000000000010', '00000001-0000-4000-8000-000000000001', 'Estucar muro', array['Muro humedecido', 'Espesor parejo', 'Superficie reglada']::text[], 'Usa antiparras y mascarilla.', 10, true),
  ('00000004-0000-4000-8000-000000000011', '00000001-0000-4000-8000-000000000001', 'Instalar guardapolvos', array['Cortes a 45° en esquinas', 'Fijaciones firmes', 'Juntas selladas']::text[], 'Usa antiparras al cortar.', 11, true),
  ('00000004-0000-4000-8000-000000000012', '00000001-0000-4000-8000-000000000001', 'Pintar cielo', array['Superficie limpia', 'Dos manos aplicadas', 'Piso protegido']::text[], 'Ventila el recinto mientras pintas.', 12, true),
  ('00000004-0000-4000-8000-000000000013', '00000001-0000-4000-8000-000000000001', 'Sellar ventanas', array['Marco limpio y seco', 'Cordón de sello continuo', 'Sin sello en los vidrios']::text[], 'Usa arnés si trabajas desde el exterior.', 13, true)
on conflict (id) do update set obra_id = excluded.obra_id, titulo = excluded.titulo, checklist = excluded.checklist, seguridad = excluded.seguridad, orden = excluded.orden, activa = excluded.activa;

-- Jornada de ejemplo: tareas de hoy y de días anteriores, con sus evidencias, verificaciones e incidentes.
delete from public.incidentes where obra_id = '00000001-0000-4000-8000-000000000001';
delete from public.tareas where obra_id = '00000001-0000-4000-8000-000000000001';

insert into public.tareas (id, obra_id, cuadrilla_id, asignado_a, plantilla_id, titulo, lugar, sector, checklist, seguridad, estado, fecha, creada_por, creada_at, cerrada_at, cerrada_por, verificada_at)
values
  ('00000005-0000-4000-8000-000000000001', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000001', 'Instalar moldaje losa', 'Piso 3', 'Eje B-C', array['Paneles nivelados', 'Puntales firmes', 'Área despejada']::text[], 'Usa arnés: trabajo sobre 1,8 m de altura.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000002', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000002', 'Revisar alzaprimas', 'Piso 3', 'Eje A', array['Alzaprimas aplomadas', 'Bases firmes', 'Área despejada']::text[], 'Usa casco y guantes durante la revisión.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000003', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000003', 'Limpieza de área de trabajo', 'Piso 3', 'Acceso norte', array['Escombros retirados', 'Herramientas guardadas', 'Acceso despejado']::text[], 'Usa guantes y zapatos de seguridad.', 'verificada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '120 minutes', '00000003-0000-4000-8000-000000000001', now() - interval '100 minutes'),
  ('00000005-0000-4000-8000-000000000004', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000005', 'Descimbrar muro', 'Piso 2', 'Eje D', array['Hormigón ya resistente', 'Paneles retirados y apilados', 'Clavos y restos retirados']::text[], 'Mantén despejada la zona donde caen los paneles.', 'corregir', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '90 minutes', '00000003-0000-4000-8000-000000000001', null),
  ('00000005-0000-4000-8000-000000000005', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', null, '00000004-0000-4000-8000-000000000004', 'Instalar moldaje muro', 'Piso 3', 'Eje D-E', array['Paneles aplomados', 'Tensores apretados', 'Desmoldante aplicado']::text[], 'Usa arnés si trabajas sobre andamio.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000006', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000006', 'Armar enfierradura losa', 'Piso 4', 'Eje A-B', array['Barras según plano', 'Amarras firmes', 'Separadores puestos']::text[], 'Usa guantes: las puntas de fierro cortan.', 'verificada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '140 minutes', '00000003-0000-4000-8000-000000000003', now() - interval '120 minutes'),
  ('00000005-0000-4000-8000-000000000007', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000007', 'Amarrar estribos', 'Piso 4', 'Eje C', array['Distancia según plano', 'Amarras firmes', 'Puntas protegidas']::text[], 'Protege las puntas de fierro con capuchones.', 'verificada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '110 minutes', '00000003-0000-4000-8000-000000000004', now() - interval '90 minutes'),
  ('00000005-0000-4000-8000-000000000008', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000008', 'Instalar separadores', 'Piso 4', 'Eje A-B', array['Separadores cada 1 metro', 'Altura según plano', 'Fierros sin tocar el moldaje']::text[], 'Camina solo por los tablones de paso.', 'por_verificar', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '25 minutes', '00000003-0000-4000-8000-000000000003', null),
  ('00000005-0000-4000-8000-000000000009', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000009', 'Revisar traslapes', 'Piso 4', 'Eje D', array['Largo de traslape según plano', 'Amarras en cada traslape', 'Fierros limpios']::text[], 'Usa guantes y antiparras.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000010', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001', null, '00000004-0000-4000-8000-000000000003', 'Limpieza de área de trabajo', 'Piso 4', 'Acceso norte', array['Escombros retirados', 'Herramientas guardadas', 'Acceso despejado']::text[], 'Usa guantes y zapatos de seguridad.', 'verificada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '60 minutes', '00000003-0000-4000-8000-000000000003', now() - interval '40 minutes'),
  ('00000005-0000-4000-8000-000000000011', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000010', 'Estucar muro', 'Piso 1', 'Depto 101', array['Muro humedecido', 'Espesor parejo', 'Superficie reglada']::text[], 'Usa antiparras y mascarilla.', 'verificada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '130 minutes', '00000003-0000-4000-8000-000000000005', now() - interval '110 minutes'),
  ('00000005-0000-4000-8000-000000000012', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000006', '00000004-0000-4000-8000-000000000011', 'Instalar guardapolvos', 'Piso 1', 'Depto 102', array['Cortes a 45° en esquinas', 'Fijaciones firmes', 'Juntas selladas']::text[], 'Usa antiparras al cortar.', 'por_verificar', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', now() - interval '12 minutes', '00000003-0000-4000-8000-000000000006', null),
  ('00000005-0000-4000-8000-000000000013', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000012', 'Pintar cielo', 'Piso 1', 'Depto 103', array['Superficie limpia', 'Dos manos aplicadas', 'Piso protegido']::text[], 'Ventila el recinto mientras pintas.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000014', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000006', '00000004-0000-4000-8000-000000000013', 'Sellar ventanas', 'Piso 2', 'Depto 201', array['Marco limpio y seco', 'Cordón de sello continuo', 'Sin sello en los vidrios']::text[], 'Usa arnés si trabajas desde el exterior.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000015', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000003', null, '00000004-0000-4000-8000-000000000003', 'Limpieza de área de trabajo', 'Piso 1', 'Pasillo', array['Escombros retirados', 'Herramientas guardadas', 'Acceso despejado']::text[], 'Usa guantes y zapatos de seguridad.', 'asignada', public.hoy_en_obra(), '00000003-0000-4000-8000-000000000009', now() - interval '190 minutes', null, null, null),
  ('00000005-0000-4000-8000-000000000016', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000001', 'Instalar moldaje losa', 'Piso 2', 'Eje B-C', array['Paneles nivelados', 'Puntales firmes', 'Área despejada']::text[], 'Usa arnés: trabajo sobre 1,8 m de altura.', 'verificada', public.hoy_en_obra() - 1, '00000003-0000-4000-8000-000000000009', now() - interval '1630 minutes', now() - interval '1560 minutes', '00000003-0000-4000-8000-000000000001', now() - interval '1540 minutes'),
  ('00000005-0000-4000-8000-000000000017', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000002', 'Revisar alzaprimas', 'Piso 2', 'Eje A', array['Alzaprimas aplomadas', 'Bases firmes', 'Área despejada']::text[], 'Usa casco y guantes durante la revisión.', 'verificada', public.hoy_en_obra() - 1, '00000003-0000-4000-8000-000000000009', now() - interval '1630 minutes', now() - interval '1560 minutes', '00000003-0000-4000-8000-000000000001', now() - interval '1540 minutes'),
  ('00000005-0000-4000-8000-000000000018', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000003', 'Limpieza de área de trabajo', 'Piso 2', 'Acceso norte', array['Escombros retirados', 'Herramientas guardadas', 'Acceso despejado']::text[], 'Usa guantes y zapatos de seguridad.', 'verificada', public.hoy_en_obra() - 2, '00000003-0000-4000-8000-000000000009', now() - interval '3070 minutes', now() - interval '3000 minutes', '00000003-0000-4000-8000-000000000001', now() - interval '2980 minutes'),
  ('00000005-0000-4000-8000-000000000019', '00000001-0000-4000-8000-000000000001', '00000002-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000006', 'Armar enfierradura losa', 'Piso 3', 'Eje A-B', array['Barras según plano', 'Amarras firmes', 'Separadores puestos']::text[], 'Usa guantes: las puntas de fierro cortan.', 'verificada', public.hoy_en_obra() - 1, '00000003-0000-4000-8000-000000000009', now() - interval '1630 minutes', now() - interval '1560 minutes', '00000003-0000-4000-8000-000000000003', now() - interval '1540 minutes');

insert into public.evidencias (id, tarea_id, obra_id, autor_id, checklist, foto_path, foto_kb, tomada_at)
values
  ('00000006-0000-4000-8000-000000000003', '00000005-0000-4000-8000-000000000003', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', array[true, true, true]::boolean[], null, null, now() - interval '120 minutes'),
  ('00000006-0000-4000-8000-000000000004', '00000005-0000-4000-8000-000000000004', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', array[true, true, true]::boolean[], null, null, now() - interval '90 minutes'),
  ('00000006-0000-4000-8000-000000000006', '00000005-0000-4000-8000-000000000006', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', array[true, true, true]::boolean[], null, null, now() - interval '140 minutes'),
  ('00000006-0000-4000-8000-000000000007', '00000005-0000-4000-8000-000000000007', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000004', array[true, true, true]::boolean[], null, null, now() - interval '110 minutes'),
  ('00000006-0000-4000-8000-000000000008', '00000005-0000-4000-8000-000000000008', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', array[true, true, true]::boolean[], null, null, now() - interval '25 minutes'),
  ('00000006-0000-4000-8000-000000000010', '00000005-0000-4000-8000-000000000010', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', array[true, true, true]::boolean[], null, null, now() - interval '60 minutes'),
  ('00000006-0000-4000-8000-000000000011', '00000005-0000-4000-8000-000000000011', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000005', array[true, true, true]::boolean[], null, null, now() - interval '130 minutes'),
  ('00000006-0000-4000-8000-000000000012', '00000005-0000-4000-8000-000000000012', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000006', array[true, true, true]::boolean[], null, null, now() - interval '12 minutes'),
  ('00000006-0000-4000-8000-000000000016', '00000005-0000-4000-8000-000000000016', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', array[true, true, true]::boolean[], null, null, now() - interval '1560 minutes'),
  ('00000006-0000-4000-8000-000000000017', '00000005-0000-4000-8000-000000000017', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', array[true, true, true]::boolean[], null, null, now() - interval '1560 minutes'),
  ('00000006-0000-4000-8000-000000000018', '00000005-0000-4000-8000-000000000018', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', array[true, true, true]::boolean[], null, null, now() - interval '3000 minutes'),
  ('00000006-0000-4000-8000-000000000019', '00000005-0000-4000-8000-000000000019', '00000001-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000003', array[true, true, true]::boolean[], null, null, now() - interval '1560 minutes');

insert into public.verificaciones (id, tarea_id, evidencia_id, supervisor_id, resultado, motivos, comentario, creada_at)
values
  ('00000007-0000-4000-8000-000000000003', '00000005-0000-4000-8000-000000000003', '00000006-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '100 minutes'),
  ('00000007-0000-4000-8000-000000000004', '00000005-0000-4000-8000-000000000004', '00000006-0000-4000-8000-000000000004', '00000003-0000-4000-8000-000000000009', 'corregir', array['Falta terminar']::text[], 'Quedan paneles sin retirar en el eje D.', now() - interval '70 minutes'),
  ('00000007-0000-4000-8000-000000000006', '00000005-0000-4000-8000-000000000006', '00000006-0000-4000-8000-000000000006', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '120 minutes'),
  ('00000007-0000-4000-8000-000000000007', '00000005-0000-4000-8000-000000000007', '00000006-0000-4000-8000-000000000007', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '90 minutes'),
  ('00000007-0000-4000-8000-000000000010', '00000005-0000-4000-8000-000000000010', '00000006-0000-4000-8000-000000000010', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '40 minutes'),
  ('00000007-0000-4000-8000-000000000011', '00000005-0000-4000-8000-000000000011', '00000006-0000-4000-8000-000000000011', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '110 minutes'),
  ('00000007-0000-4000-8000-000000000016', '00000005-0000-4000-8000-000000000016', '00000006-0000-4000-8000-000000000016', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '1540 minutes'),
  ('00000007-0000-4000-8000-000000000017', '00000005-0000-4000-8000-000000000017', '00000006-0000-4000-8000-000000000017', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '1540 minutes'),
  ('00000007-0000-4000-8000-000000000018', '00000005-0000-4000-8000-000000000018', '00000006-0000-4000-8000-000000000018', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '2980 minutes'),
  ('00000007-0000-4000-8000-000000000019', '00000005-0000-4000-8000-000000000019', '00000006-0000-4000-8000-000000000019', '00000003-0000-4000-8000-000000000009', 'aprobada', '{}'::text[], null, now() - interval '1540 minutes');

insert into public.incidentes (id, obra_id, clase, tipo, tarea_id, lugar, sector, nota, anonimo, reportero_id, foto_path, foto_kb, ocurrido_at, estado)
values
  ('00000008-0000-4000-8000-000000000001', '00000001-0000-4000-8000-000000000001', 'riesgo', 'caida', null, 'Piso 3', null, null, true, null, null, null, now() - interval '4 minutes', 'nuevo');

commit;
