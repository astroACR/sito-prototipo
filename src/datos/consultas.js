/* Consultas: lo que las pantallas leen.

   Todo se lee de la base del celular, así que responde al instante y sin señal.
   Cada consulta se vuelve a ejecutar sola cuando cambian los datos
   (por una acción en el celular o por una descarga del servidor). */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, sesion, estadoSincronizacion } from './nucleo.js'
import { obtenerFoto } from './acciones.js'

const porId = (filas) => new Map((filas ?? []).map((f) => [f.id, f]))

/** Persona que está usando el celular, o null si nadie ha ingresado. */
export function usePerfil() {
  return useSyncExternalStore(sesion.suscribir, sesion.leer)
}

/** { enviando, descargando, sinSenal, sesionVencida, ultimaDescarga } */
export function useEstadoSincronizacion() {
  return useSyncExternalStore(estadoSincronizacion.suscribir, estadoSincronizacion.leer)
}

/** Obra de la persona: { id, nombre, lugares }. */
export function useObra() {
  const perfil = usePerfil()
  return useLiveQuery(() => (perfil ? db.obras.get(perfil.obra_id) : undefined), [perfil?.obra_id])
}

export function useCuadrillas() {
  return useLiveQuery(() => db.cuadrillas.toArray().then((c) => c.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))), [])
}

/** Mapa id → persona de la obra (para mostrar nombres). */
export function usePersonas() {
  return useLiveQuery(() => db.perfiles.toArray().then(porId), [])
}

export function usePlantillas() {
  return useLiveQuery(() => db.plantillas.toArray().then((p) => p.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))), [])
}

/** Todas las tareas que el celular tiene guardadas. undefined mientras carga. */
export function useTareas() {
  return useLiveQuery(() => db.tareas.toArray(), [])
}

/**
 * Una tarea con lo necesario para mostrarla:
 * { tarea, evidencia (la última), verificacion (la última), problema (aviso abierto), pendienteEnvio }.
 * `cargando` es true hasta que termina la primera lectura.
 */
export function useTarea(tareaId) {
  const datos = useLiveQuery(async () => {
    const tarea = await db.tareas.get(tareaId)
    if (!tarea) return { tarea: null }
    const ultima = (filas, campo) => filas.sort((a, b) => String(b[campo]).localeCompare(String(a[campo])))[0] ?? null
    const evidencia = ultima(await db.evidencias.where('tarea_id').equals(tareaId).toArray(), 'tomada_at')
    const verificacion = ultima(await db.verificaciones.where('tarea_id').equals(tareaId).toArray(), 'creada_at')
    const problema =
      (await db.incidentes.where('tarea_id').equals(tareaId).toArray())
        .filter((i) => i.clase === 'problema' && i.estado !== 'cerrado')
        .sort((a, b) => String(b.ocurrido_at).localeCompare(String(a.ocurrido_at)))[0] ?? null
    const enCola = await db.cola.where('ref_id').equals(tareaId).toArray()
    const pendienteEnvio = enCola.some((o) => o.tipo === 'cerrar_tarea' && o.estado !== 'enviado')
    return { tarea, evidencia, verificacion, problema, pendienteEnvio }
  }, [tareaId])
  return datos ? { ...datos, cargando: false } : { tarea: null, cargando: true }
}

/**
 * Cola de envío de la persona actual, lista para mostrar:
 * { pendientes, rechazados, enviados, total } donde total = lo que falta por enviar.
 */
export function useCola() {
  const perfil = usePerfil()
  const filas = useLiveQuery(
    () => (perfil ? db.cola.where('usuario_id').equals(perfil.id).sortBy('seq') : []),
    [perfil?.id],
  )
  const visibles = (filas ?? []).filter((o) => o.resumen)
  const pendientes = visibles.filter((o) => o.estado === 'pendiente')
  const rechazados = visibles.filter((o) => o.estado === 'rechazado')
  const enviados = visibles.filter((o) => o.estado === 'enviado').reverse()
  return { pendientes, rechazados, enviados, total: pendientes.length + rechazados.length, cargando: filas === undefined }
}

/** Ids de las tareas cuyo cierre todavía no llega al servidor. */
export function useTareasPendientesDeEnvio() {
  const { pendientes, rechazados } = useCola()
  return new Set([...pendientes, ...rechazados].filter((o) => o.tipo === 'cerrar_tarea').map((o) => o.ref_id))
}

/** Todos los incidentes guardados en el celular (el supervisor ve los de la obra). */
export function useIncidentes() {
  return useLiveQuery(
    () => db.incidentes.toArray().then((i) => i.sort((a, b) => String(b.ocurrido_at).localeCompare(String(a.ocurrido_at)))),
    [],
  )
}

export function useIncidente(id) {
  const datos = useLiveQuery(async () => ({ incidente: (await db.incidentes.get(id)) ?? null }), [id])
  return datos ? { ...datos, cargando: false } : { incidente: null, cargando: true }
}

/** Última evidencia de cada tarea: mapa tarea_id → evidencia. */
export function useUltimasEvidencias() {
  return useLiveQuery(async () => {
    const mapa = new Map()
    for (const e of await db.evidencias.toArray()) {
      const actual = mapa.get(e.tarea_id)
      if (!actual || String(e.tomada_at) > String(actual.tomada_at)) mapa.set(e.tarea_id, e)
    }
    return mapa
  }, [])
}

/** Avance guardado de una tarea sin terminar: { checks, foto } o null. undefined mientras carga. */
export function useBorrador(tareaId) {
  return useLiveQuery(() => db.borradores.get(tareaId).then((b) => b ?? null), [tareaId])
}

/**
 * Dirección para mostrar una foto en <img>.
 * Devuelve { url, estado } con estado 'cargando' | 'lista' | 'sin_foto'.
 */
export function useFoto(id, ruta) {
  const [foto, setFoto] = useState({ url: null, estado: id ? 'cargando' : 'sin_foto' })

  useEffect(() => {
    if (!id) {
      setFoto({ url: null, estado: 'sin_foto' })
      return undefined
    }
    let vigente = true
    let url = null
    setFoto({ url: null, estado: 'cargando' })
    obtenerFoto(id, ruta)
      .then((blob) => {
        if (!vigente) return
        if (!blob) {
          setFoto({ url: null, estado: 'sin_foto' })
          return
        }
        url = URL.createObjectURL(blob)
        setFoto({ url, estado: 'lista' })
      })
      .catch(() => vigente && setFoto({ url: null, estado: 'sin_foto' }))
    return () => {
      vigente = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, ruta])

  return foto
}

/** Hora actual que se renueva sola, para textos como "hace 4 min". */
export function useAhora(cadaMs = 30000) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), cadaMs)
    return () => clearInterval(reloj)
  }, [cadaMs])
  return ahora
}
