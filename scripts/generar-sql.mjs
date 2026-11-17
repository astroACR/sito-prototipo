/* Genera supabase/seed.sql y supabase/reset-demo.sql a partir de src/datos/semilla.js,
   para que Supabase y el modo demo partan siempre con los mismos datos.

   Uso:  npm run seed
   La prueba scripts/generar-sql.test.js falla si los archivos quedaron desactualizados. */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { OBRA, CUADRILLAS, USUARIOS, PLANTILLAS, PIN_DEMO, filasRelativas } from '../src/datos/semilla.js'
import { correoDeRut } from '../src/dominio/rut.js'

const texto = (v) => "'" + String(v).replace(/'/g, "''") + "'"

/** Convierte un valor de JavaScript en un literal SQL. */
function sql(valor, tipo) {
  if (valor === null || valor === undefined) return 'null'
  if (typeof valor === 'object' && !Array.isArray(valor) && 'haceMin' in valor) {
    return valor.haceMin === 0 ? 'now()' : `now() - interval '${valor.haceMin} minutes'`
  }
  if (typeof valor === 'object' && !Array.isArray(valor) && 'haceDias' in valor) {
    return valor.haceDias === 0 ? 'public.hoy_en_obra()' : `public.hoy_en_obra() - ${valor.haceDias}`
  }
  if (Array.isArray(valor)) {
    const de = tipo ?? (typeof valor[0] === 'boolean' ? 'boolean[]' : 'text[]')
    if (!valor.length) return `'{}'::${de}`
    return `array[${valor.map((x) => sql(x)).join(', ')}]::${de}`
  }
  if (typeof valor === 'boolean') return valor ? 'true' : 'false'
  if (typeof valor === 'number') return String(valor)
  return texto(valor)
}

/** INSERT de varias filas. `alChocar` es la cláusula ON CONFLICT. */
function insertar(tabla, columnas, filas, alChocar = '', tipos = {}) {
  if (!filas.length) return ''
  const valores = filas.map((f) => '  (' + columnas.map((c) => sql(f[c], tipos[c])).join(', ') + ')').join(',\n')
  return `insert into ${tabla} (${columnas.join(', ')})\nvalues\n${valores}${alChocar ? '\n' + alChocar : ''};\n`
}

const actualizar = (columnas) =>
  'on conflict (id) do update set ' + columnas.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')

function bloqueJornada() {
  const r = filasRelativas()
  const tiposTexto = { checklist: 'text[]', motivos: 'text[]' }
  return [
    '-- Jornada de ejemplo: tareas de hoy y de días anteriores, con sus evidencias, verificaciones e incidentes.',
    `delete from public.incidentes where obra_id = ${texto(OBRA.id)};`,
    `delete from public.tareas where obra_id = ${texto(OBRA.id)};`,
    '',
    insertar(
      'public.tareas',
      ['id', 'obra_id', 'cuadrilla_id', 'asignado_a', 'plantilla_id', 'titulo', 'lugar', 'sector', 'checklist', 'seguridad', 'estado', 'fecha', 'creada_por', 'creada_at', 'cerrada_at', 'cerrada_por', 'verificada_at'],
      r.tareas,
      '',
      tiposTexto,
    ),
    insertar(
      'public.evidencias',
      ['id', 'tarea_id', 'obra_id', 'autor_id', 'checklist', 'foto_path', 'foto_kb', 'tomada_at'],
      r.evidencias,
      '',
      { checklist: 'boolean[]' },
    ),
    insertar(
      'public.verificaciones',
      ['id', 'tarea_id', 'evidencia_id', 'supervisor_id', 'resultado', 'motivos', 'comentario', 'creada_at'],
      r.verificaciones,
      '',
      tiposTexto,
    ),
    insertar(
      'public.incidentes',
      ['id', 'obra_id', 'clase', 'tipo', 'tarea_id', 'lugar', 'sector', 'nota', 'anonimo', 'reportero_id', 'foto_path', 'foto_kb', 'ocurrido_at', 'estado'],
      r.incidentes,
    ),
  ].join('\n')
}

function bloqueUsuarios() {
  const usuarios = USUARIOS.map((u) => {
    const correo = correoDeRut(u.rut)
    return (
      `  (${texto('00000000-0000-0000-0000-000000000000')}, ${texto(u.id)}, 'authenticated', 'authenticated', ${texto(correo)}, ` +
      `extensions.crypt(${texto(u.pin)}, extensions.gen_salt('bf')), now(), ` +
      `'{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', '')`
    )
  }).join(',\n')

  const identidades = USUARIOS.map((u) => {
    const correo = correoDeRut(u.rut)
    return (
      `  (gen_random_uuid(), ${texto(u.id)}, ${texto(u.id)}, ` +
      `jsonb_build_object('sub', ${texto(u.id)}, 'email', ${texto(correo)}, 'email_verified', true, 'phone_verified', false), ` +
      `'email', now(), now(), now())`
    )
  }).join(',\n')

  return [
    '-- Usuarios de ejemplo en Supabase Auth. El correo interno es <rut>@sito.local y la clave son 6 números.',
    'insert into auth.users (',
    '  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,',
    '  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,',
    '  confirmation_token, recovery_token, email_change, email_change_token_new,',
    '  email_change_token_current, phone_change, phone_change_token, reauthentication_token',
    ')',
    'values',
    usuarios,
    'on conflict (id) do nothing;',
    '',
    'insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)',
    'values',
    identidades,
    'on conflict (provider_id, provider) do nothing;',
    '',
  ].join('\n')
}

function tablaDeUsuarios() {
  const nombreCuadrilla = (id) => CUADRILLAS.find((c) => c.id === id)
  return USUARIOS.map((u) => {
    const c = nombreCuadrilla(u.cuadrilla_id)
    const donde = u.rol === 'supervisor' ? 'Supervisor' : `${c.nombre} · ${c.especialidad}`
    return `--   ${u.rut.padEnd(11)} ${u.nombre.padEnd(15)} ${donde}`
  }).join('\n')
}

export function generarSeed() {
  const cPerfil = ['id', 'rut', 'nombre', 'rol', 'obra_id', 'cuadrilla_id']
  const cPlantilla = ['id', 'obra_id', 'titulo', 'checklist', 'seguridad', 'orden', 'activa']
  const cCuadrilla = ['id', 'obra_id', 'nombre', 'especialidad', 'orden']
  return [
    '-- =====================================================================',
    '-- SITO · Datos de ejemplo de la obra "Torre Norte"',
    '--',
    '-- ARCHIVO GENERADO: no lo edites a mano. Cambia src/datos/semilla.js y ejecuta "npm run seed".',
    '-- Ejecutar después de schema.sql y policies.sql. Se puede ejecutar más de una vez.',
    '--',
    `-- Usuarios de ejemplo (la clave de todos es ${PIN_DEMO}):`,
    tablaDeUsuarios(),
    '--',
    '-- Son datos SOLO para la demo. Antes de usar la app con personas reales,',
    '-- borra estos usuarios y crea los verdaderos con claves distintas.',
    '-- =====================================================================',
    '',
    'begin;',
    '',
    bloqueUsuarios(),
    '-- Obra, cuadrillas, perfiles y plantillas de tarea.',
    insertar('public.obras', ['id', 'nombre', 'lugares'], [OBRA], actualizar(['nombre', 'lugares']), { lugares: 'text[]' }),
    insertar('public.cuadrillas', cCuadrilla, CUADRILLAS, actualizar(cCuadrilla)),
    insertar('public.perfiles', cPerfil, USUARIOS, actualizar(cPerfil)),
    insertar('public.plantillas_tarea', cPlantilla, PLANTILLAS, actualizar(cPlantilla), { checklist: 'text[]' }),
    bloqueJornada(),
    'commit;',
    '',
  ].join('\n')
}

export function generarReset() {
  return [
    '-- =====================================================================',
    '-- SITO · Reinicio de la demo',
    '--',
    '-- ARCHIVO GENERADO: no lo edites a mano. Cambia src/datos/semilla.js y ejecuta "npm run seed".',
    '--',
    '-- Deja la obra "Torre Norte" como al principio, con la jornada de hoy:',
    '--   · borra las tareas, evidencias, verificaciones e incidentes de la obra;',
    '--   · vuelve a cargar la jornada de ejemplo;',
    '--   · borra la aceptación del uso de datos, para mostrar otra vez esa pantalla.',
    '-- No toca los usuarios ni sus claves.',
    '--',
    '-- Las fotos ya subidas quedan en Storage. Para borrarlas, vacía la carpeta',
    '-- "obras" del bucket "evidencias" desde el panel de Supabase.',
    '-- =====================================================================',
    '',
    'begin;',
    '',
    `update public.perfiles set consentimiento_at = null where obra_id = ${texto(OBRA.id)};`,
    '',
    bloqueJornada(),
    'commit;',
    '',
  ].join('\n')
}

const esPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (esPrincipal) {
  const destino = (nombre) => fileURLToPath(new URL('../supabase/' + nombre, import.meta.url))
  writeFileSync(destino('seed.sql'), generarSeed())
  writeFileSync(destino('reset-demo.sql'), generarReset())
  console.log('Listo: supabase/seed.sql y supabase/reset-demo.sql actualizados.')
}
