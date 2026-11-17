/* Conexión a Supabase (Auth, Postgres con RLS, Storage y Realtime).

   Cumple el mismo contrato que remoto-demo.js (ver el comentario al inicio de ese archivo).
   Las reglas que aquí se asumen están en /supabase/policies.sql.

   Solo usa la clave pública ("anon"). La clave service_role nunca va en la app. */

import { createClient } from '@supabase/supabase-js'
import { ErrorCredenciales, ErrorRechazo, ErrorRed, ErrorSesion } from './errores.js'
import { correoDeRut, normalizarRut } from '../dominio/rut.js'
import { fechaLocal, restarDias } from '../dominio/tiempo.js'
import { DIAS_DE_HISTORIA } from './servidor-demo.js'

const BUCKET = 'evidencias'
const COLUMNAS_PERFIL = 'id,nombre,rol,obra_id,cuadrilla_id,consentimiento_at'
const COLUMNAS_PERFIL_AJENO = 'id,nombre,rol,obra_id,cuadrilla_id'

/* Columnas que la app puede escribir (el resto las pone el servidor). */
const COLUMNAS_TAREA = ['id', 'obra_id', 'cuadrilla_id', 'asignado_a', 'plantilla_id', 'titulo', 'lugar', 'sector', 'checklist', 'seguridad', 'fecha', 'creada_por']
const COLUMNAS_INCIDENTE = ['id', 'obra_id', 'clase', 'tipo', 'tarea_id', 'lugar', 'sector', 'nota', 'anonimo', 'reportero_id', 'foto_path', 'foto_kb', 'ocurrido_at']

/* Mensajes de las funciones SQL, en palabras para quien usa la app. */
const MENSAJES = {
  sin_perfil: 'Tu RUT aún no está inscrito en una obra. Avisa a tu supervisor.',
  sin_permiso: 'Tu usuario no tiene permiso para hacer esto.',
  tarea_no_existe: 'La tarea ya no existe.',
  tarea_ajena: 'La tarea es de otra cuadrilla.',
  tarea_no_abierta: 'La tarea ya estaba cerrada.',
  tarea_no_por_verificar: 'La tarea no está esperando verificación.',
  foto_invalida: 'La foto no corresponde a esta tarea.',
  resultado_invalido: 'La verificación no es válida.',
  incidente_no_existe: 'El incidente ya no existe.',
}

const solo = (fila, columnas) => Object.fromEntries(columnas.map((c) => [c, fila[c] ?? null]))

function esFallaDeRed(error) {
  if (!error) return false
  if (error.name === 'AuthRetryableFetchError' || error.name === 'StorageUnknownError') return true
  if (error.status === 0) return true
  const texto = [error.message, error.details, error.hint].filter(Boolean).join(' ')
  return /failed to fetch|fetch failed|networkerror|network request failed|load failed|timed? ?out|aborted|err_internet|econn|enotfound/i.test(texto)
}

/** Convierte un error de Supabase en uno de los cuatro tipos que entiende la cola de envío. */
function lanzar(error, estadoHttp) {
  if (esFallaDeRed(error)) throw new ErrorRed()
  const estado = Number(estadoHttp ?? error.status ?? error.statusCode ?? 0)
  const codigo = String(error.code ?? '')
  const mensaje = String(error.message ?? '')
  if (estado === 401 || codigo === 'PGRST301' || codigo === 'PGRST303' || /jwt/i.test(mensaje)) throw new ErrorSesion()
  if (estado >= 500 || estado === 429 || estado === 408) throw new ErrorRed('El servidor no respondió.')
  const conocido = Object.keys(MENSAJES).find((clave) => mensaje.includes(clave))
  throw new ErrorRechazo(conocido ? MENSAJES[conocido] : mensaje || 'El servidor no aceptó este registro.', conocido || codigo || 'rechazo')
}

const yaExiste = (error) =>
  String(error?.statusCode ?? error?.status ?? '') === '409' ||
  error?.code === '23505' ||
  /already exists|duplicate/i.test(String(error?.message ?? ''))

export function crearRemotoSupabase({ url, clave, sufijo = '' }) {
  const claveSesion = 'sito-auth' + sufijo
  const cliente = createClient(url, clave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: claveSesion },
  })

  /* Cliente sin sesión: sube la foto de un incidente anónimo sin identificar a nadie. */
  let sinSesion = null
  const clienteSinSesion = () => {
    if (!sinSesion) {
      sinSesion = createClient(url, clave, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sito-sin-sesion' + sufijo },
      })
    }
    return sinSesion
  }

  async function exigirSesion() {
    const { data, error } = await cliente.auth.getSession()
    if (error) {
      if (esFallaDeRed(error)) throw new ErrorRed()
      throw new ErrorSesion()
    }
    if (!data.session) throw new ErrorSesion()
    return data.session
  }

  /** Ejecuta una consulta y devuelve sus filas, o lanza el error ya clasificado. */
  async function pedir(consulta) {
    let respuesta
    try {
      respuesta = await consulta
    } catch (error) {
      throw esFallaDeRed(error) ? new ErrorRed() : error
    }
    if (respuesta.error) lanzar(respuesta.error, respuesta.status)
    return respuesta.data
  }

  async function subirFoto(conCliente, ruta, foto) {
    const blob = new Blob([foto.datos], { type: 'image/jpeg' })
    let respuesta
    try {
      respuesta = await conCliente.storage.from(BUCKET).upload(ruta, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
    } catch (error) {
      throw esFallaDeRed(error) ? new ErrorRed() : error
    }
    /* Si la foto ya estaba arriba (reenvío), se sigue adelante. */
    if (respuesta.error && !yaExiste(respuesta.error)) lanzar(respuesta.error)
  }

  /** INSERT simple. Un choque de llave significa que el servidor ya lo tenía: es un reenvío. */
  async function insertarUnaVez(tabla, fila) {
    let respuesta
    try {
      respuesta = await cliente.from(tabla).insert(fila)
    } catch (error) {
      throw esFallaDeRed(error) ? new ErrorRed() : error
    }
    if (respuesta.error && !yaExiste(respuesta.error)) lanzar(respuesta.error, respuesta.status)
  }

  return {
    modo: 'supabase',

    async ingresar(rut, pin) {
      let respuesta
      try {
        respuesta = await cliente.auth.signInWithPassword({ email: correoDeRut(rut), password: String(pin) })
      } catch (error) {
        throw esFallaDeRed(error) ? new ErrorRed() : error
      }
      const { data, error } = respuesta
      if (error) {
        if (esFallaDeRed(error)) throw new ErrorRed()
        if (error.status === 429) throw new ErrorRechazo('Demasiados intentos. Espera un minuto y prueba de nuevo.', 'muchos_intentos')
        if (error.status === 400 || error.code === 'invalid_credentials') throw new ErrorCredenciales()
        if (Number(error.status) >= 500) throw new ErrorRed('El servidor no respondió.')
        throw new ErrorRechazo(error.message, error.code || 'ingreso')
      }
      const filas = await pedir(cliente.from('perfiles').select(COLUMNAS_PERFIL).eq('id', data.user.id))
      if (!filas?.length) {
        await this.salir()
        throw new ErrorRechazo(MENSAJES.sin_perfil, 'sin_perfil')
      }
      return { ...filas[0], rut: normalizarRut(rut) }
    },

    async salir() {
      try {
        const { error } = await cliente.auth.signOut({ scope: 'local' })
        if (!error) return
      } catch {
        /* sin conexión: se borra la sesión del celular igual */
      }
      try {
        globalThis.localStorage?.removeItem(claveSesion)
      } catch {
        /* nada más que hacer */
      }
    },

    async descargar(perfil) {
      await exigirSesion()
      const hoy = fechaLocal()
      const desde = restarDias(hoy, DIAS_DE_HISTORIA)
      const desdeHora = new Date(Date.now() - DIAS_DE_HISTORIA * 24 * 3600 * 1000).toISOString()
      /* Evidencias y verificaciones se piden con más margen: una tarea antigua que sigue abierta
         todavía necesita mostrar por qué se pidió corregirla. */
      const desdeLargo = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
      const esSupervisor = perfil.rol === 'supervisor'

      const [propio, obras, cuadrillas, perfiles, plantillas, tareas, evidencias, verificaciones, incidentes] = await Promise.all([
        pedir(cliente.from('perfiles').select(COLUMNAS_PERFIL).eq('id', perfil.id)),
        pedir(cliente.from('obras').select('id,nombre,lugares')),
        pedir(cliente.from('cuadrillas').select('id,obra_id,nombre,especialidad,orden')),
        pedir(cliente.from('perfiles').select(COLUMNAS_PERFIL_AJENO)),
        esSupervisor
          ? pedir(cliente.from('plantillas_tarea').select('id,obra_id,titulo,checklist,seguridad,orden,activa').eq('activa', true))
          : Promise.resolve([]),
        pedir(cliente.from('tareas').select('*').or(`estado.in.(asignada,corregir,por_verificar),fecha.gte.${desde}`)),
        pedir(cliente.from('evidencias').select('*').gte('tomada_at', desdeLargo)),
        pedir(cliente.from('verificaciones').select('*').gte('creada_at', desdeLargo)),
        pedir(cliente.from('incidentes').select('*').or(`estado.in.(nuevo,en_atencion),ocurrido_at.gte."${desdeHora}"`)),
      ])

      if (!propio?.length) throw new ErrorSesion('El perfil ya no existe.')
      const idsTareas = new Set(tareas.map((t) => t.id))
      return {
        perfil: { ...propio[0], rut: perfil.rut },
        obras,
        cuadrillas,
        perfiles,
        plantillas,
        tareas,
        evidencias: evidencias.filter((e) => idsTareas.has(e.tarea_id)),
        verificaciones: verificaciones.filter((v) => idsTareas.has(v.tarea_id)),
        incidentes,
      }
    },

    async enviar(operacion, foto = null) {
      await exigirSesion()
      const d = operacion.datos
      switch (operacion.tipo) {
        case 'consentimiento':
          await pedir(cliente.rpc('aceptar_consentimiento'))
          return

        case 'cerrar_tarea': {
          const ev = d.evidencia
          if (foto && ev.foto_path) await subirFoto(cliente, ev.foto_path, foto)
          await pedir(
            cliente.rpc('cerrar_tarea', {
              p_tarea: ev.tarea_id,
              p_evidencia: ev.id,
              p_checklist: ev.checklist,
              p_foto_path: ev.foto_path,
              p_foto_kb: ev.foto_kb,
              p_tomada_at: ev.tomada_at,
            }),
          )
          return
        }

        case 'reportar_incidente': {
          const inc = d.incidente
          if (foto && inc.foto_path) await subirFoto(inc.anonimo ? clienteSinSesion() : cliente, inc.foto_path, foto)
          await insertarUnaVez('incidentes', solo(inc, COLUMNAS_INCIDENTE))
          return
        }

        case 'verificar_tarea': {
          const v = d.verificacion
          await pedir(
            cliente.rpc('verificar_tarea', {
              p_verificacion: v.id,
              p_tarea: v.tarea_id,
              p_resultado: v.resultado,
              p_motivos: v.motivos ?? [],
              p_comentario: v.comentario ?? null,
            }),
          )
          return
        }

        case 'crear_tarea':
          await insertarUnaVez('tareas', solo(d.tarea, COLUMNAS_TAREA))
          return

        case 'atender_incidente':
          await pedir(cliente.rpc('atender_incidente', { p_incidente: d.incidente_id }))
          return

        case 'cerrar_incidente':
          await pedir(cliente.rpc('cerrar_incidente', { p_incidente: d.incidente_id }))
          return

        default:
          throw new ErrorRechazo('Operación desconocida: ' + operacion.tipo, 'operacion_desconocida')
      }
    },

    async bajarFoto(ruta) {
      await exigirSesion()
      let respuesta
      try {
        respuesta = await cliente.storage.from(BUCKET).download(ruta)
      } catch (error) {
        if (esFallaDeRed(error)) throw new ErrorRed()
        return null
      }
      if (respuesta.error) {
        if (esFallaDeRed(respuesta.error)) throw new ErrorRed()
        return null
      }
      return respuesta.data
    },

    suscribir(perfil, alCambiar) {
      const canal = cliente.channel('sito-obra-' + perfil.obra_id + sufijo)
      for (const tabla of ['tareas', 'evidencias', 'verificaciones', 'incidentes']) {
        canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => alCambiar(tabla))
      }
      canal.subscribe()
      return () => {
        cliente.removeChannel(canal)
      }
    },

    alPerderSesion(aviso) {
      const { data } = cliente.auth.onAuthStateChange((evento) => {
        if (evento === 'SIGNED_OUT') aviso()
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
