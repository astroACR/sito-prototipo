/* Carga schema.sql, policies.sql, seed.sql y reset-demo.sql en un PostgreSQL real en memoria (PGlite)
   y comprueba las reglas de acceso con cada tipo de usuario.

   No reemplaza probar contra el proyecto Supabase real (ver "npm run probar:supabase"):
   aquí Auth, Storage y Realtime están imitados por supabase/pruebas/supabase-simulado.sql. */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { ID, USUARIOS, PIN_DEMO } from '../src/datos/semilla.js'

const leer = (nombre) => readFileSync(fileURLToPath(new URL(nombre, import.meta.url)), 'utf8')

const OBRA = ID.obra
const PEDRO = ID.usuario(1)
const LUIS = ID.usuario(2)
const ANA = ID.usuario(3)
const SUPERVISOR = ID.usuario(9)
const uuid = (n) => 'aaaaaaaa-0000-4000-8000-' + String(n).padStart(12, '0')

let pg

/** Ejecuta consultas como lo haría la API: con el rol y la sesión de una persona (o sin sesión). */
async function como(usuarioId, tarea) {
  const rol = usuarioId ? 'authenticated' : 'anon'
  await pg.exec('begin')
  try {
    await pg.exec(`set local role ${rol}`)
    await pg.query(`select set_config('request.jwt.claim.sub', $1, true)`, [usuarioId ?? ''])
    const resultado = await tarea((texto, valores) => pg.query(texto, valores).then((r) => r.rows))
    await pg.exec('commit')
    return resultado
  } catch (error) {
    await pg.exec('rollback')
    throw error
  }
}

const admin = (texto, valores) => pg.query(texto, valores).then((r) => r.rows)

const cerrar = (q, tarea, evidencia, ruta = null) =>
  q(`select public.cerrar_tarea($1, $2, $3, $4, $5, now())`, [tarea, evidencia, [true, true, true], ruta, ruta ? 290 : null])

/* Igual a lo que hace la app: un INSERT simple, sin pedir la fila de vuelta. */
const INSERTAR_INCIDENTE = `insert into public.incidentes
  (id, obra_id, clase, tipo, tarea_id, lugar, anonimo, reportero_id, ocurrido_at)
  values ($1, $2, $3, $4, $5, 'Piso 3', $6, $7, now())`

/** Código de error de PostgreSQL de una consulta que debe fallar. */
const codigoDe = (promesa) => promesa.then(() => null, (error) => error.code)

beforeAll(async () => {
  pg = new PGlite({ extensions: { pgcrypto } })
  await pg.exec(leer('./pruebas/supabase-simulado.sql'))
  await pg.exec(leer('./schema.sql'))
  await pg.exec(leer('./policies.sql'))
  await pg.exec(leer('./seed.sql'))
}, 120000)

describe('archivos SQL', () => {
  it('se pueden ejecutar por segunda vez sin errores ni datos duplicados', async () => {
    await pg.exec(leer('./schema.sql'))
    await pg.exec(leer('./policies.sql'))
    await pg.exec(leer('./seed.sql'))

    const [c] = await admin(`select
      (select count(*)::int from auth.users) as usuarios,
      (select count(*)::int from auth.identities) as identidades,
      (select count(*)::int from public.perfiles) as perfiles,
      (select count(*)::int from public.tareas) as tareas,
      (select count(*)::int from public.tareas where fecha = public.hoy_en_obra()) as de_hoy,
      (select count(*)::int from public.incidentes) as incidentes,
      (select count(*)::int from public.plantillas_tarea) as plantillas`)
    expect(c).toEqual({ usuarios: 7, identidades: 7, perfiles: 7, tareas: 19, de_hoy: 15, incidentes: 1, plantillas: 13 })
  })

  it('cada usuario de ejemplo queda con su correo interno y su clave de 6 números', async () => {
    const filas = await admin(
      `select email, encrypted_password = extensions.crypt($1, encrypted_password) as clave_ok,
              confirmation_token, recovery_token, email_change, email_change_token_new
         from auth.users order by email`,
      [PIN_DEMO],
    )
    expect(filas.map((f) => f.email)).toEqual(USUARIOS.map((u) => u.rut + '@sito.local').sort())
    expect(filas.every((f) => f.clave_ok)).toBe(true)
    /* Supabase Auth falla al ingresar si estos campos quedan en NULL. */
    expect(filas.every((f) => f.confirmation_token === '' && f.recovery_token === '' && f.email_change === '' && f.email_change_token_new === '')).toBe(true)
  })

  it('las tablas quedan publicadas para los avisos en vivo', async () => {
    const filas = await admin(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)
    expect(filas.map((f) => f.tablename)).toEqual(['evidencias', 'incidentes', 'tareas', 'verificaciones'])
  })
})

describe('quién ve qué (RLS)', () => {
  it('el trabajador ve solo las tareas de su cuadrilla', async () => {
    const tareas = await como(PEDRO, (q) => q(`select cuadrilla_id, asignado_a from public.tareas`))
    expect(tareas).toHaveLength(8)
    expect(new Set(tareas.map((t) => t.cuadrilla_id))).toEqual(new Set([ID.cuadrilla(2)]))
    expect(tareas.some((t) => t.asignado_a === null)).toBe(true)
  })

  it('el trabajador no ve plantillas ni incidentes ajenos; sí las evidencias de sus tareas', async () => {
    const r = await como(PEDRO, async (q) => ({
      plantillas: await q(`select id from public.plantillas_tarea`),
      incidentes: await q(`select id from public.incidentes`),
      evidencias: await q(`select tarea_id from public.evidencias`),
      verificaciones: await q(`select tarea_id from public.verificaciones`),
    }))
    expect(r.plantillas).toEqual([])
    expect(r.incidentes).toEqual([])
    expect(r.evidencias.length).toBe(5)
    expect(r.verificaciones.length).toBe(5)
  })

  it('el supervisor ve todo lo de su obra', async () => {
    const r = await como(SUPERVISOR, async (q) => ({
      tareas: await q(`select id from public.tareas`),
      incidentes: await q(`select id, reportero_id, anonimo from public.incidentes`),
      plantillas: await q(`select id from public.plantillas_tarea`),
      evidencias: await q(`select id from public.evidencias`),
    }))
    expect(r.tareas).toHaveLength(19)
    expect(r.incidentes).toEqual([{ id: ID.incidente(1), reportero_id: null, anonimo: true }])
    expect(r.plantillas).toHaveLength(13)
    expect(r.evidencias).toHaveLength(12)
  })

  it('nadie puede leer el RUT de otras personas desde la app', async () => {
    for (const quien of [PEDRO, SUPERVISOR]) {
      await expect(como(quien, (q) => q(`select rut from public.perfiles`))).rejects.toThrow(/permission denied/)
      const nombres = await como(quien, (q) => q(`select id, nombre, rol, obra_id, cuadrilla_id, consentimiento_at from public.perfiles`))
      expect(nombres).toHaveLength(7)
    }
  })

  it('sin sesión no se lee ni se escribe ninguna tabla ni se usa ninguna función', async () => {
    for (const tabla of ['obras', 'cuadrillas', 'perfiles', 'plantillas_tarea', 'tareas', 'evidencias', 'verificaciones', 'incidentes']) {
      await expect(como(null, (q) => q(`select * from public.${tabla}`)), tabla).rejects.toThrow(/permission denied/)
    }
    await expect(como(null, (q) => q(INSERTAR_INCIDENTE, [uuid(900), OBRA, 'riesgo', 'caida', null, true, null]))).rejects.toThrow(/permission denied/)
    await expect(como(null, (q) => q(`select public.atender_incidente($1)`, [ID.incidente(1)]))).rejects.toThrow(/permission denied/)
    await expect(como(null, (q) => q(`select public.mi_rol()`))).rejects.toThrow(/permission denied/)
  })

  it('una persona de otra obra no ve nada de Torre Norte', async () => {
    const otraObra = uuid(1)
    const externo = uuid(2)
    await admin(`insert into public.obras (id, nombre) values ($1, 'Otra obra')`, [otraObra])
    await admin(`insert into auth.users (id, email) values ($1, 'externo@sito.local')`, [externo])
    await admin(`insert into public.perfiles (id, rut, nombre, rol, obra_id) values ($1, '77777777-7', 'Externo', 'supervisor', $2)`, [externo, otraObra])

    const r = await como(externo, async (q) => ({
      tareas: await q(`select id from public.tareas`),
      incidentes: await q(`select id from public.incidentes`),
      perfiles: await q(`select id from public.perfiles`),
    }))
    expect(r.tareas).toEqual([])
    expect(r.incidentes).toEqual([])
    expect(r.perfiles).toEqual([{ id: externo }])
    await expect(como(externo, (q) => q(`select public.atender_incidente($1)`, [ID.incidente(1)]))).rejects.toThrow(/incidente_no_existe/)
    await expect(como(externo, (q) => q(`select public.verificar_tarea($1, $2, 'aprobada', null, null)`, [uuid(3), ID.tarea(8)]))).rejects.toThrow(/tarea_no_existe/)
  })
})

describe('cierre y verificación de tareas', () => {
  it('nadie cambia una tarea directamente: solo por las funciones', async () => {
    await expect(como(PEDRO, (q) => q(`update public.tareas set estado = 'verificada' where id = $1`, [ID.tarea(1)]))).rejects.toThrow(/permission denied/)
    await expect(como(SUPERVISOR, (q) => q(`update public.tareas set estado = 'verificada' where id = $1`, [ID.tarea(1)]))).rejects.toThrow(/permission denied/)
    await expect(como(SUPERVISOR, (q) => q(`delete from public.tareas where id = $1`, [ID.tarea(1)]))).rejects.toThrow(/permission denied/)
    await expect(como(PEDRO, (q) => q(`insert into public.evidencias (id, tarea_id, obra_id, autor_id, tomada_at) values ($1, $2, $3, $4, now())`, [uuid(10), ID.tarea(1), OBRA, PEDRO]))).rejects.toThrow(/permission denied/)
  })

  it('el trabajador cierra su tarea y un reenvío no la duplica', async () => {
    const evidencia = uuid(11)
    const ruta = `obras/${OBRA}/tareas/${evidencia}.jpg`
    await como(PEDRO, (q) => cerrar(q, ID.tarea(1), evidencia, ruta))
    await como(PEDRO, (q) => cerrar(q, ID.tarea(1), evidencia, ruta))

    const [tarea] = await admin(`select estado, cerrada_por from public.tareas where id = $1`, [ID.tarea(1)])
    expect(tarea).toEqual({ estado: 'por_verificar', cerrada_por: PEDRO })
    const evidencias = await admin(`select autor_id, foto_path, checklist from public.evidencias where tarea_id = $1`, [ID.tarea(1)])
    expect(evidencias).toEqual([{ autor_id: PEDRO, foto_path: ruta, checklist: [true, true, true] }])
  })

  it('rechaza cerrar una tarea ajena, una ya cerrada o con una ruta de foto inventada', async () => {
    await expect(como(ANA, (q) => cerrar(q, ID.tarea(2), uuid(12)))).rejects.toThrow(/tarea_no_existe|tarea_ajena/)
    await expect(como(PEDRO, (q) => cerrar(q, ID.tarea(3), uuid(13)))).rejects.toThrow(/tarea_no_abierta/)
    await expect(como(PEDRO, (q) => cerrar(q, ID.tarea(2), uuid(14), `obras/${OBRA}/incidentes/otra.jpg`))).rejects.toThrow(/foto_invalida/)
    await expect(como(SUPERVISOR, (q) => cerrar(q, ID.tarea(2), uuid(15)))).rejects.toThrow(/sin_permiso/)
    const [t] = await admin(`select estado from public.tareas where id = $1`, [ID.tarea(2)])
    expect(t.estado).toBe('asignada')
  })

  it('una tarea de toda la cuadrilla la puede cerrar cualquiera de sus integrantes, una sola vez', async () => {
    await como(LUIS, (q) => cerrar(q, ID.tarea(5), uuid(16)))
    await expect(como(PEDRO, (q) => cerrar(q, ID.tarea(5), uuid(17)))).rejects.toThrow(/tarea_no_abierta/)
  })

  it('solo el supervisor verifica; pedir corrección y aprobar completan el ciclo', async () => {
    await expect(como(PEDRO, (q) => q(`select public.verificar_tarea($1, $2, 'aprobada', null, null)`, [uuid(20), ID.tarea(1)]))).rejects.toThrow(/sin_permiso/)
    await expect(como(SUPERVISOR, (q) => q(`select public.verificar_tarea($1, $2, 'aprobada', null, null)`, [uuid(21), ID.tarea(2)]))).rejects.toThrow(/tarea_no_por_verificar/)
    await expect(como(SUPERVISOR, (q) => q(`select public.verificar_tarea($1, $2, 'quizas', null, null)`, [uuid(22), ID.tarea(1)]))).rejects.toThrow(/resultado_invalido/)

    /* Pide corrección (dos veces: el reenvío no duplica). */
    for (let i = 0; i < 2; i++) {
      await como(SUPERVISOR, (q) => q(`select public.verificar_tarea($1, $2, 'corregir', $3, $4)`, [uuid(23), ID.tarea(1), ['Foto poco clara'], '  Se ve borrosa.  ']))
    }
    expect((await admin(`select estado from public.tareas where id = $1`, [ID.tarea(1)]))[0].estado).toBe('corregir')

    /* El trabajador lee el motivo, corrige y vuelve a cerrar. */
    const motivo = await como(PEDRO, (q) => q(`select resultado, motivos, comentario from public.verificaciones where tarea_id = $1`, [ID.tarea(1)]))
    expect(motivo).toEqual([{ resultado: 'corregir', motivos: ['Foto poco clara'], comentario: 'Se ve borrosa.' }])
    await como(PEDRO, (q) => cerrar(q, ID.tarea(1), uuid(24)))

    /* El supervisor aprueba. */
    await como(SUPERVISOR, (q) => q(`select public.verificar_tarea($1, $2, 'aprobada', null, null)`, [uuid(25), ID.tarea(1)]))
    const [final] = await admin(`select estado, verificada_at is not null as con_fecha from public.tareas where id = $1`, [ID.tarea(1)])
    expect(final).toEqual({ estado: 'verificada', con_fecha: true })
    const historia = await admin(`select resultado, evidencia_id from public.verificaciones where tarea_id = $1 order by creada_at`, [ID.tarea(1)])
    expect(historia).toEqual([
      { resultado: 'corregir', evidencia_id: uuid(11) },
      { resultado: 'aprobada', evidencia_id: uuid(24) },
    ])
  })

  it('solo el supervisor asigna tareas, a cuadrillas y personas de su obra', async () => {
    const nueva = `insert into public.tareas (id, obra_id, cuadrilla_id, asignado_a, plantilla_id, titulo, lugar, sector, checklist, seguridad, fecha, creada_por)
                   values ($1, $2, $3, $4, $5, 'Instalar moldaje losa', 'Piso 4', null, array['Paneles nivelados'], 'Usa arnés.', public.hoy_en_obra(), $6)`
    await expect(como(PEDRO, (q) => q(nueva, [uuid(30), OBRA, ID.cuadrilla(2), null, ID.plantilla(1), PEDRO]))).rejects.toThrow(/row-level security/)
    await expect(como(SUPERVISOR, (q) => q(nueva, [uuid(31), OBRA, ID.cuadrilla(2), ANA, ID.plantilla(1), SUPERVISOR]))).rejects.toThrow(/row-level security/)
    await expect(como(SUPERVISOR, (q) => q(nueva, [uuid(32), OBRA, ID.cuadrilla(2), null, ID.plantilla(1), PEDRO]))).rejects.toThrow(/row-level security/)
    await expect(como(SUPERVISOR, (q) => q(nueva, [uuid(33), uuid(1), ID.cuadrilla(2), null, ID.plantilla(1), SUPERVISOR]))).rejects.toThrow(/row-level security/)
    /* No puede crearla ya verificada: esa columna no se puede escribir. */
    await expect(como(SUPERVISOR, (q) => q(`insert into public.tareas (id, obra_id, cuadrilla_id, titulo, lugar, creada_por, estado) values ($1, $2, $3, 'x', 'y', $4, 'verificada')`, [uuid(34), OBRA, ID.cuadrilla(2), SUPERVISOR]))).rejects.toThrow(/permission denied/)

    await como(SUPERVISOR, (q) => q(nueva, [uuid(35), OBRA, ID.cuadrilla(2), PEDRO, ID.plantilla(1), SUPERVISOR]))
    /* Reenvío: choca con la llave y la app lo toma como "ya recibida". */
    expect(await codigoDe(como(SUPERVISOR, (q) => q(nueva, [uuid(35), OBRA, ID.cuadrilla(2), PEDRO, ID.plantilla(1), SUPERVISOR])))).toBe('23505')
    const visto = await como(PEDRO, (q) => q(`select estado, asignado_a from public.tareas where id = $1`, [uuid(35)]))
    expect(visto).toEqual([{ estado: 'asignada', asignado_a: PEDRO }])
  })
})

describe('incidentes y anonimato', () => {
  it('un incidente anónimo se acepta solo sin reportero y sin tarea', async () => {
    await expect(como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(40), OBRA, 'riesgo', 'caida', null, true, PEDRO]))).rejects.toThrow(/row-level security|anonimo_sin_reportero/)
    await expect(como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(41), OBRA, 'riesgo', 'caida', ID.tarea(2), true, null]))).rejects.toThrow(/row-level security|anonimo_sin_tarea/)

    await como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(42), OBRA, 'riesgo', 'caida', null, true, null]))
    /* Un reenvío choca con la llave (código 23505): la app lo toma como "ya recibido". */
    expect(await codigoDe(como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(42), OBRA, 'riesgo', 'caida', null, true, null])))).toBe('23505')

    /* Por eso la app NO usa "on conflict": PostgreSQL exigiría además poder leer la fila,
       y quien reporta en forma anónima no puede leerla. */
    expect(
      await codigoDe(como(PEDRO, (q) => q(INSERTAR_INCIDENTE + ' on conflict (id) do nothing', [uuid(48), OBRA, 'riesgo', 'caida', null, true, null]))),
    ).toBe('42501')

    expect(await como(PEDRO, (q) => q(`select id from public.incidentes where id = $1`, [uuid(42)]))).toEqual([])
    const [fila] = await admin(`select to_jsonb(i) as todo from public.incidentes i where id = $1`, [uuid(42)])
    expect(fila.todo).toMatchObject({ anonimo: true, reportero_id: null, tarea_id: null, estado: 'nuevo', atendido_por: null })
    expect(JSON.stringify(fila.todo)).not.toContain(PEDRO)
    expect((await admin(`select count(*)::int as n from public.incidentes where id = $1`, [uuid(42)]))[0].n).toBe(1)
  })

  it('un reporte con nombre lleva a quien lo envía, no a otra persona', async () => {
    await expect(como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(43), OBRA, 'problema', 'falta_material', ID.tarea(2), false, LUIS]))).rejects.toThrow(/row-level security/)
    await expect(como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(44), uuid(1), 'riesgo', 'caida', null, false, PEDRO]))).rejects.toThrow(/row-level security/)
    await expect(como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(45), OBRA, 'problema', 'caida', null, false, PEDRO]))).rejects.toThrow(/tipo_segun_clase/)

    await como(PEDRO, (q) => q(INSERTAR_INCIDENTE, [uuid(46), OBRA, 'problema', 'falta_material', ID.tarea(2), false, PEDRO]))
    const propio = await como(PEDRO, (q) => q(`select clase, tarea_id, estado from public.incidentes`))
    expect(propio).toEqual([{ clase: 'problema', tarea_id: ID.tarea(2), estado: 'nuevo' }])
    expect(await como(LUIS, (q) => q(`select id from public.incidentes`))).toEqual([])
  })

  it('quien reporta no puede fijar el estado ni modificar un incidente', async () => {
    await expect(como(PEDRO, (q) => q(`insert into public.incidentes (id, obra_id, clase, tipo, anonimo, ocurrido_at, estado) values ($1, $2, 'riesgo', 'caida', true, now(), 'cerrado')`, [uuid(47), OBRA]))).rejects.toThrow(/permission denied/)
    await expect(como(PEDRO, (q) => q(`update public.incidentes set estado = 'cerrado' where id = $1`, [uuid(46)]))).rejects.toThrow(/permission denied/)
    await expect(como(PEDRO, (q) => q(`select public.cerrar_incidente($1)`, [uuid(46)]))).rejects.toThrow(/sin_permiso/)
  })

  it('el supervisor atiende y cierra; repetir la acción no cambia nada', async () => {
    const id = ID.incidente(1)
    await como(SUPERVISOR, (q) => q(`select public.atender_incidente($1)`, [id]))
    const [primera] = await admin(`select estado, atendido_por, atendido_at from public.incidentes where id = $1`, [id])
    expect(primera).toMatchObject({ estado: 'en_atencion', atendido_por: SUPERVISOR })

    await como(SUPERVISOR, (q) => q(`select public.atender_incidente($1)`, [id]))
    const [segunda] = await admin(`select atendido_at from public.incidentes where id = $1`, [id])
    expect(segunda.atendido_at).toEqual(primera.atendido_at)

    await como(SUPERVISOR, (q) => q(`select public.cerrar_incidente($1)`, [id]))
    await como(SUPERVISOR, (q) => q(`select public.atender_incidente($1)`, [id]))
    expect((await admin(`select estado from public.incidentes where id = $1`, [id]))[0].estado).toBe('cerrado')
  })

  it('aceptar el uso de datos guarda solo la primera fecha', async () => {
    await como(PEDRO, (q) => q(`select public.aceptar_consentimiento()`))
    const [a] = await admin(`select consentimiento_at from public.perfiles where id = $1`, [PEDRO])
    expect(a.consentimiento_at).toBeTruthy()
    await como(PEDRO, (q) => q(`select public.aceptar_consentimiento()`))
    const [b] = await admin(`select consentimiento_at from public.perfiles where id = $1`, [PEDRO])
    expect(b.consentimiento_at).toEqual(a.consentimiento_at)
    const [otro] = await admin(`select consentimiento_at from public.perfiles where id = $1`, [LUIS])
    expect(otro.consentimiento_at).toBeNull()
  })
})

describe('fotos (políticas de Storage)', () => {
  const subir = (q, ruta, dueno) =>
    q(`insert into storage.objects (bucket_id, name, owner, owner_id) values ('evidencias', $1, $2, $3)`, [ruta, dueno, dueno])

  it('el bucket es privado, solo acepta JPEG y hasta 1 MB', async () => {
    const [b] = await admin(`select public, file_size_limit::int as limite, allowed_mime_types from storage.buckets where id = 'evidencias'`)
    expect(b).toEqual({ public: false, limite: 1048576, allowed_mime_types: ['image/jpeg'] })
  })

  it('con sesión, cada persona sube solo a la carpeta de su obra', async () => {
    await como(PEDRO, (q) => subir(q, `obras/${OBRA}/tareas/${uuid(50)}.jpg`, PEDRO))
    await como(PEDRO, (q) => subir(q, `obras/${OBRA}/incidentes/${uuid(51)}.jpg`, PEDRO))
    await expect(como(PEDRO, (q) => subir(q, `obras/${uuid(1)}/tareas/${uuid(52)}.jpg`, PEDRO))).rejects.toThrow(/row-level security/)
    await expect(como(PEDRO, (q) => subir(q, `otra-carpeta/${uuid(53)}.jpg`, PEDRO))).rejects.toThrow(/row-level security/)
    await expect(como(PEDRO, (q) => q(`insert into storage.objects (bucket_id, name) values ('otro', $1)`, [`obras/${OBRA}/tareas/x.jpg`]))).rejects.toThrow()
  })

  it('sin sesión solo se puede subir la foto de un incidente, y queda sin dueño', async () => {
    const ruta = `obras/${OBRA}/incidentes/${uuid(54)}.jpg`
    await como(null, (q) => subir(q, ruta, null))
    await expect(como(null, (q) => subir(q, `obras/${OBRA}/tareas/${uuid(55)}.jpg`, null))).rejects.toThrow(/row-level security/)
    await expect(como(null, (q) => subir(q, `obras/${uuid(999)}/incidentes/${uuid(56)}.jpg`, null))).rejects.toThrow(/row-level security/)
    /* Sin sesión tampoco se puede mirar lo que hay. */
    expect(await como(null, (q) => q(`select name from storage.objects`))).toEqual([])

    const [objeto] = await admin(`select owner, owner_id from storage.objects where name = $1`, [ruta])
    expect(objeto).toEqual({ owner: null, owner_id: null })
  })

  it('el supervisor ve las fotos de su obra; el trabajador, solo las que subió', async () => {
    const deSupervisor = await como(SUPERVISOR, (q) => q(`select name from storage.objects order by name`))
    expect(deSupervisor).toHaveLength(3)
    const dePedro = await como(PEDRO, (q) => q(`select name from storage.objects`))
    expect(dePedro).toHaveLength(2)
    expect(await como(LUIS, (q) => q(`select name from storage.objects`))).toEqual([])
  })
})

describe('reinicio de la demo', () => {
  it('reset-demo.sql deja la jornada como al principio y conserva a los usuarios', async () => {
    await pg.exec(leer('./reset-demo.sql'))
    const [c] = await admin(`select
      (select count(*)::int from public.tareas) as tareas,
      (select estado from public.tareas where id = $1) as moldaje,
      (select count(*)::int from public.evidencias) as evidencias,
      (select count(*)::int from public.verificaciones) as verificaciones,
      (select count(*)::int from public.incidentes) as incidentes,
      (select estado from public.incidentes where id = $2) as incidente,
      (select count(*)::int from public.perfiles where consentimiento_at is not null) as con_consentimiento,
      (select count(*)::int from auth.users) as usuarios`, [ID.tarea(1), ID.incidente(1)])
    expect(c).toEqual({
      tareas: 19, moldaje: 'asignada', evidencias: 12, verificaciones: 10, incidentes: 1,
      incidente: 'nuevo', con_consentimiento: 0, usuarios: 8,
    })
  })
})
