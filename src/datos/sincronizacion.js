/* Sincronización entre el celular y el servidor.

   - encolar():           guarda lo hecho en el celular y lo deja en la cola de envío.
   - enviarPendientes():  manda la cola, en orden. Sin señal, no hace nada y lo deja para después.
   - descargar():         trae lo último del servidor y lo combina con lo que sigue en la cola.
   - ejecutarEnLinea():   para el supervisor, que trabaja con conexión: envía y recién ahí refleja el cambio.

   Todo corre en serie (nunca dos envíos o descargas a la vez) para que una descarga
   vieja no pise un cambio recién hecho. */

import { aplicarLocal } from './operaciones.js'
import { TABLAS_COPIA, guardarMeta } from './local.js'
import { ErrorRed, ErrorRechazo, ErrorSesion } from './errores.js'

const ESTADO_INICIAL = {
  enviando: false,
  descargando: false,
  sinSenal: false,
  sesionVencida: false,
  ultimaDescarga: null,
}

export function crearSincronizador({
  db,
  remoto,
  perfil,
  hayRed = () => globalThis.navigator?.onLine !== false,
  ahora = () => new Date(),
  alRecibirPerfil = () => {},
}) {
  let estado = { ...ESTADO_INICIAL, sinSenal: !hayRed() }
  const oyentes = new Set()
  let cadena = Promise.resolve()
  let descargaEnEspera = null
  let detenido = false

  function poner(cambios) {
    const siguiente = { ...estado, ...cambios }
    const igual = Object.keys(siguiente).every((k) => siguiente[k] === estado[k])
    if (igual) return
    estado = siguiente
    oyentes.forEach((fn) => fn())
  }

  /** Ejecuta una tarea después de la anterior, aunque la anterior haya fallado. */
  function enSerie(tarea) {
    const resultado = cadena.then(tarea, tarea)
    cadena = resultado.catch(() => {})
    return resultado
  }

  async function pendientes({ incluirRechazados = false } = {}) {
    const filas = await db.cola.orderBy('seq').toArray()
    return filas.filter(
      (o) => o.usuario_id === perfil.id && (o.estado === 'pendiente' || (incluirRechazados && o.estado === 'rechazado')),
    )
  }

  /** Guarda la operación en el celular y la deja en la cola. Devuelve apenas queda guardada. */
  async function encolar(operacion, foto = null) {
    await db.transaction('rw', db.tables, async () => {
      if (foto) {
        await db.fotos.put({ id: foto.id, datos: foto.datos, tipo: foto.tipo, kb: foto.kb, guardada_at: ahora().toISOString() })
      }
      await aplicarLocal(db, operacion)
      await db.cola.add({ ...operacion, estado: 'pendiente', intentos: 0, ultimo_error: null, enviado_at: null })
    })
    enviarPendientes().catch(() => {})
  }

  async function descargarInterno() {
    if (detenido) return false
    if (!hayRed()) {
      poner({ sinSenal: true })
      return false
    }
    poner({ descargando: true })
    try {
      const copia = await remoto.descargar(perfil)
      await db.transaction('rw', db.tables, async () => {
        for (const tabla of TABLAS_COPIA) {
          await db[tabla].clear()
          if (copia[tabla]?.length) await db[tabla].bulkPut(copia[tabla])
        }
        /* Lo que todavía no llega al servidor se vuelve a aplicar encima de la copia nueva. */
        for (const op of await pendientes()) await aplicarLocal(db, op)
        await guardarMeta(db, 'ultima_descarga', ahora().toISOString())
      })
      if (copia.perfil) alRecibirPerfil(copia.perfil)
      poner({ sinSenal: false, ultimaDescarga: ahora().toISOString() })
      return true
    } catch (error) {
      if (error instanceof ErrorSesion) poner({ sesionVencida: true })
      else poner({ sinSenal: true })
      return false
    } finally {
      poner({ descargando: false })
    }
  }

  /** Trae lo último del servidor. Varias llamadas seguidas se juntan en una sola. */
  function descargar() {
    if (!descargaEnEspera) {
      descargaEnEspera = enSerie(() => {
        descargaEnEspera = null
        return descargarInterno()
      })
    }
    return descargaEnEspera
  }

  /**
   * Envía la cola en orden.
   * Devuelve { enviados, pendientes, motivo } con motivo 'sin_red' | 'sesion' | null.
   */
  function enviarPendientes(opciones = {}) {
    return enSerie(async () => {
      if (detenido) return { enviados: 0, pendientes: 0, motivo: null }
      const lista = await pendientes(opciones)
      if (!lista.length) return { enviados: 0, pendientes: 0, motivo: null }
      if (!hayRed()) {
        poner({ sinSenal: true })
        return { enviados: 0, pendientes: lista.length, motivo: 'sin_red' }
      }

      poner({ enviando: true })
      let enviados = 0
      let rechazados = 0
      let motivo = null
      try {
        for (const op of lista) {
          try {
            const foto = op.foto_id ? await db.fotos.get(op.foto_id) : null
            await remoto.enviar(op, foto ?? null)
            await db.cola.update(op.seq, { estado: 'enviado', enviado_at: ahora().toISOString(), ultimo_error: null })
            enviados++
            poner({ sinSenal: false, sesionVencida: false })
          } catch (error) {
            const intentos = (op.intentos ?? 0) + 1
            if (error instanceof ErrorRechazo) {
              /* El servidor lo rechazó: se marca y se sigue con el resto de la cola. */
              await db.cola.update(op.seq, { estado: 'rechazado', intentos, ultimo_error: error.message })
              rechazados++
              continue
            }
            await db.cola.update(op.seq, { estado: 'pendiente', intentos, ultimo_error: error?.message ?? String(error) })
            if (error instanceof ErrorSesion) {
              poner({ sesionVencida: true })
              motivo = 'sesion'
            } else {
              poner({ sinSenal: true })
              motivo = 'sin_red'
            }
            break
          }
        }
      } finally {
        poner({ enviando: false })
      }

      /* Tras un envío o un rechazo, la copia del celular se pone al día con el servidor. */
      if (enviados || rechazados) await descargarInterno()
      const quedan = (await pendientes()).length
      return { enviados, rechazados, pendientes: quedan, motivo }
    })
  }

  /** Envía ahora mismo y, solo si el servidor acepta, refleja el cambio en el celular. */
  function ejecutarEnLinea(operacion) {
    return enSerie(async () => {
      if (!hayRed()) {
        poner({ sinSenal: true })
        throw new ErrorRed()
      }
      try {
        await remoto.enviar(operacion, null)
      } catch (error) {
        if (error instanceof ErrorSesion) poner({ sesionVencida: true })
        else if (error instanceof ErrorRed || !(error instanceof ErrorRechazo)) poner({ sinSenal: true })
        throw error
      }
      poner({ sinSenal: false })
      await db.transaction('rw', db.tables, () => aplicarLocal(db, operacion))
      descargar().catch(() => {})
    })
  }

  /** Borra de la cola lo enviado hace más de un día y las fotos viejas que ya llegaron al servidor. */
  async function limpiar() {
    const limiteCola = new Date(ahora().getTime() - 24 * 3600 * 1000).toISOString()
    const limiteFotos = new Date(ahora().getTime() - 7 * 24 * 3600 * 1000).toISOString()
    await db.transaction('rw', db.cola, db.fotos, async () => {
      await db.cola.filter((o) => o.estado === 'enviado' && o.enviado_at < limiteCola).delete()
      const enUso = new Set((await db.cola.toArray()).filter((o) => o.estado !== 'enviado').map((o) => o.foto_id))
      await db.fotos.filter((f) => !enUso.has(f.id) && f.guardada_at < limiteFotos).delete()
    })
  }

  /* ---- Funcionamiento automático en el navegador ---- */
  const limpiezas = []

  /** Empieza a enviar y descargar sola: al abrir, al volver la señal, al volver a la app y cada cierto tiempo. */
  function iniciar({ cadaMs = 20000 } = {}) {
    const ventana = globalThis.window
    const ciclo = () => {
      enviarPendientes().catch(() => {})
      descargar().catch(() => {})
    }

    if (ventana) {
      const alVolverRed = () => {
        poner({ sinSenal: false })
        ciclo()
      }
      const alPerderRed = () => poner({ sinSenal: true })
      const alVolverApp = () => {
        if (globalThis.document?.visibilityState === 'visible') ciclo()
      }
      ventana.addEventListener('online', alVolverRed)
      ventana.addEventListener('offline', alPerderRed)
      globalThis.document?.addEventListener('visibilitychange', alVolverApp)
      limpiezas.push(() => {
        ventana.removeEventListener('online', alVolverRed)
        ventana.removeEventListener('offline', alPerderRed)
        globalThis.document?.removeEventListener('visibilitychange', alVolverApp)
      })
    }

    /* Reintentos: mientras la app está a la vista, vuelve a probar cada cierto tiempo. */
    const reloj = setInterval(() => {
      if (globalThis.document && globalThis.document.visibilityState !== 'visible') return
      ciclo()
    }, cadaMs)
    limpiezas.push(() => clearInterval(reloj))

    /* Avisos en vivo del servidor (Realtime o, en modo demo, cambios en su base). */
    let espera = null
    const dejarDeEscuchar = remoto.suscribir(perfil, () => {
      clearTimeout(espera)
      espera = setTimeout(() => descargar().catch(() => {}), 250)
    })
    limpiezas.push(() => {
      clearTimeout(espera)
      dejarDeEscuchar?.()
    })

    const dejarSesion = remoto.alPerderSesion?.(() => poner({ sesionVencida: true }))
    if (dejarSesion) limpiezas.push(dejarSesion)

    limpiar().catch(() => {})
    ciclo()
  }

  function detener() {
    detenido = true
    limpiezas.splice(0).forEach((fn) => fn())
  }

  return {
    perfil,
    encolar,
    enviarPendientes,
    descargar,
    ejecutarEnLinea,
    limpiar,
    iniciar,
    detener,
    leerEstado: () => estado,
    suscribir(fn) {
      oyentes.add(fn)
      return () => oyentes.delete(fn)
    },
  }
}
