/* Servidor de demostración.

   Hace el papel de Supabase cuando no hay credenciales: vive en una segunda base
   IndexedDB del mismo navegador y aplica las mismas reglas que las políticas y
   funciones SQL de /supabase (quién ve qué, qué cambios de estado se aceptan,
   anonimato de los incidentes).

   Como es una base aparte, el celular "envía" de verdad: la cola de envío y la
   sincronización funcionan igual que contra el servidor real. */

import Dexie, { liveQuery } from 'dexie'
import { ErrorCredenciales, ErrorRechazo } from './errores.js'
import { OBRA, CUADRILLAS, USUARIOS, PLANTILLAS, datosDeLaJornada, perfilDe } from './semilla.js'
import { normalizarRut } from '../dominio/rut.js'
import { puedeCerrar, puedeVerificar, estadoTrasVerificar, estaAbierta } from '../dominio/tareas.js'
import { motivoDeRechazo, estaAbierto } from '../dominio/incidentes.js'
import { fechaLocal, restarDias } from '../dominio/tiempo.js'

/** Días hacia atrás que se descargan al celular, además de todo lo que sigue abierto. */
export const DIAS_DE_HISTORIA = 14

export function crearServidorDemo({ nombre = 'sito-demo-servidor', ahora = () => new Date() } = {}) {
  const db = new Dexie(nombre)
  db.version(1).stores({
    meta: 'clave',
    obras: 'id',
    cuadrillas: 'id, obra_id',
    perfiles: 'id, obra_id',
    credenciales: 'rut',
    plantillas: 'id, obra_id',
    tareas: 'id, obra_id, cuadrilla_id, estado',
    evidencias: 'id, tarea_id',
    verificaciones: 'id, tarea_id',
    incidentes: 'id, obra_id, estado',
    fotos: 'ruta',
  })

  let listo = null

  async function sembrar() {
    const jornada = datosDeLaJornada(ahora())
    await db.transaction('rw', db.tables, async () => {
      for (const tabla of db.tables) await tabla.clear()
      await db.obras.put(OBRA)
      await db.cuadrillas.bulkPut(CUADRILLAS)
      await db.perfiles.bulkPut(USUARIOS.map(perfilDe))
      await db.credenciales.bulkPut(USUARIOS.map((u) => ({ rut: u.rut, pin: u.pin, perfil_id: u.id })))
      await db.plantillas.bulkPut(PLANTILLAS)
      await db.tareas.bulkPut(jornada.tareas)
      await db.evidencias.bulkPut(jornada.evidencias)
      await db.verificaciones.bulkPut(jornada.verificaciones)
      await db.incidentes.bulkPut(jornada.incidentes)
      await db.meta.put({ clave: 'sembrado', valor: ahora().toISOString() })
      await db.meta.put({ clave: 'revision', valor: Date.now() })
    })
  }

  /** Carga los datos de ejemplo la primera vez. */
  function asegurarDatos() {
    if (!listo) {
      listo = db.meta.get('sembrado').then((fila) => (fila ? null : sembrar()))
      listo.catch(() => {
        listo = null
      })
    }
    return listo
  }

  /** Vuelve a dejar los datos de ejemplo como al principio, con la jornada de hoy. */
  async function reiniciar() {
    await sembrar()
    listo = Promise.resolve()
  }

  async function marcarCambio() {
    await db.meta.put({ clave: 'revision', valor: Date.now() + Math.random() })
  }

  async function perfilRequerido(perfilId) {
    const perfil = await db.perfiles.get(perfilId)
    if (!perfil) throw new ErrorRechazo('La persona no existe en esta obra.', 'sin_perfil')
    return perfil
  }

  async function ingresar(rut, pin) {
    await asegurarDatos()
    const cred = await db.credenciales.get(normalizarRut(rut))
    if (!cred || cred.pin !== String(pin)) throw new ErrorCredenciales()
    return db.perfiles.get(cred.perfil_id)
  }

  /** Lo que una persona tiene derecho a ver, igual que las políticas RLS del servidor real. */
  async function descargar(perfilId) {
    await asegurarDatos()
    const perfil = await perfilRequerido(perfilId)
    const esSupervisor = perfil.rol === 'supervisor'
    const desde = restarDias(fechaLocal(ahora()), DIAS_DE_HISTORIA)

    const obras = await db.obras.where('id').equals(perfil.obra_id).toArray()
    const cuadrillas = await db.cuadrillas.where('obra_id').equals(perfil.obra_id).toArray()
    /* De las demás personas solo viaja lo necesario para mostrarlas: nunca el RUT. */
    const perfiles = (await db.perfiles.where('obra_id').equals(perfil.obra_id).toArray()).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      rol: p.rol,
      obra_id: p.obra_id,
      cuadrilla_id: p.cuadrilla_id,
    }))
    const plantillas = esSupervisor
      ? (await db.plantillas.where('obra_id').equals(perfil.obra_id).toArray()).filter((p) => p.activa)
      : []

    const tareas = (await db.tareas.where('obra_id').equals(perfil.obra_id).toArray()).filter((t) => {
      const visible = esSupervisor || t.asignado_a === perfil.id || (perfil.cuadrilla_id && t.cuadrilla_id === perfil.cuadrilla_id)
      const vigente = estaAbierta(t) || t.estado === 'por_verificar' || t.fecha >= desde
      return visible && vigente
    })
    const idsTareas = new Set(tareas.map((t) => t.id))
    const evidencias = (await db.evidencias.toArray()).filter((e) => idsTareas.has(e.tarea_id))
    const verificaciones = (await db.verificaciones.toArray()).filter((v) => idsTareas.has(v.tarea_id))

    const incidentes = (await db.incidentes.where('obra_id').equals(perfil.obra_id).toArray()).filter((i) => {
      const visible = esSupervisor || i.reportero_id === perfil.id
      const vigente = estaAbierto(i) || fechaLocal(i.ocurrido_at) >= desde
      return visible && vigente
    })

    return { perfil, obras, cuadrillas, perfiles, plantillas, tareas, evidencias, verificaciones, incidentes }
  }

  function rechazar(mensaje, codigo) {
    throw new ErrorRechazo(mensaje, codigo)
  }

  /**
   * Recibe una operación. Si ya la había recibido, no hace nada (reenvío seguro).
   * @param op        operación creada con nuevaOperacion
   * @param perfilId  quién la envía (la sesión)
   * @param foto      { datos: ArrayBuffer, tipo } o null
   */
  async function recibir(op, perfilId, foto = null) {
    await asegurarDatos()
    await db.transaction('rw', db.tables, async () => {
      const perfil = await perfilRequerido(perfilId)
      const d = op.datos
      const momento = ahora().toISOString()

      switch (op.tipo) {
        case 'consentimiento': {
          if (!perfil.consentimiento_at) await db.perfiles.update(perfil.id, { consentimiento_at: d.aceptado_at })
          break
        }

        case 'cerrar_tarea': {
          const ev = d.evidencia
          if (await db.evidencias.get(ev.id)) break
          const tarea = await db.tareas.get(ev.tarea_id)
          if (!tarea || tarea.obra_id !== perfil.obra_id) rechazar('La tarea ya no existe.', 'tarea_no_existe')
          if (perfil.rol !== 'trabajador') rechazar('Solo un trabajador puede cerrar una tarea.', 'sin_permiso')
          const suya = tarea.asignado_a === perfil.id || (perfil.cuadrilla_id && tarea.cuadrilla_id === perfil.cuadrilla_id)
          if (!suya) rechazar('La tarea es de otra cuadrilla.', 'tarea_ajena')
          if (!puedeCerrar(tarea.estado)) rechazar('La tarea ya estaba cerrada.', 'tarea_no_abierta')
          if (foto && ev.foto_path) await db.fotos.put({ ruta: ev.foto_path, datos: foto.datos, tipo: foto.tipo })
          await db.evidencias.put({ ...ev, obra_id: tarea.obra_id, autor_id: perfil.id, recibida_at: momento })
          await db.tareas.update(tarea.id, { estado: 'por_verificar', cerrada_at: ev.tomada_at, cerrada_por: perfil.id, verificada_at: null })
          break
        }

        case 'reportar_incidente': {
          const inc = d.incidente
          if (await db.incidentes.get(inc.id)) break
          const motivo = motivoDeRechazo(inc, perfil)
          if (motivo) rechazar(motivo, 'incidente_invalido')
          if (foto && inc.foto_path) await db.fotos.put({ ruta: inc.foto_path, datos: foto.datos, tipo: foto.tipo })
          await db.incidentes.put({ ...inc, estado: 'nuevo', atendido_por: null, atendido_at: null, cerrado_at: null, recibido_at: momento })
          break
        }

        case 'verificar_tarea': {
          const v = d.verificacion
          if (await db.verificaciones.get(v.id)) break
          if (perfil.rol !== 'supervisor') rechazar('Solo un supervisor puede verificar.', 'sin_permiso')
          const tarea = await db.tareas.get(v.tarea_id)
          if (!tarea || tarea.obra_id !== perfil.obra_id) rechazar('La tarea ya no existe.', 'tarea_no_existe')
          if (!puedeVerificar(tarea.estado)) rechazar('La tarea no está esperando verificación.', 'tarea_no_por_verificar')
          const evidencias = await db.evidencias.where('tarea_id').equals(tarea.id).toArray()
          const ultima = evidencias.sort((a, b) => String(b.tomada_at).localeCompare(String(a.tomada_at)))[0]
          await db.verificaciones.put({ ...v, supervisor_id: perfil.id, evidencia_id: ultima ? ultima.id : null })
          await db.tareas.update(tarea.id, {
            estado: estadoTrasVerificar(v.resultado),
            verificada_at: v.resultado === 'aprobada' ? v.creada_at : null,
          })
          break
        }

        case 'crear_tarea': {
          const t = d.tarea
          if (await db.tareas.get(t.id)) break
          if (perfil.rol !== 'supervisor') rechazar('Solo un supervisor puede asignar tareas.', 'sin_permiso')
          if (t.obra_id !== perfil.obra_id) rechazar('La tarea es de otra obra.', 'otra_obra')
          const cuadrilla = await db.cuadrillas.get(t.cuadrilla_id)
          if (!cuadrilla || cuadrilla.obra_id !== perfil.obra_id) rechazar('La cuadrilla no existe.', 'sin_cuadrilla')
          await db.tareas.put({ ...t, estado: 'asignada', creada_por: perfil.id, cerrada_at: null, cerrada_por: null, verificada_at: null })
          break
        }

        case 'atender_incidente':
        case 'cerrar_incidente': {
          if (perfil.rol !== 'supervisor') rechazar('Solo un supervisor puede atender incidentes.', 'sin_permiso')
          const inc = await db.incidentes.get(d.incidente_id)
          if (!inc || inc.obra_id !== perfil.obra_id) rechazar('El incidente ya no existe.', 'incidente_no_existe')
          if (op.tipo === 'atender_incidente') {
            if (inc.estado === 'nuevo') await db.incidentes.update(inc.id, { estado: 'en_atencion', atendido_por: perfil.id, atendido_at: d.en })
          } else if (inc.estado !== 'cerrado') {
            await db.incidentes.update(inc.id, {
              estado: 'cerrado',
              cerrado_at: d.en,
              atendido_por: inc.atendido_por ?? perfil.id,
              atendido_at: inc.atendido_at ?? d.en,
            })
          }
          break
        }

        default:
          rechazar('Operación desconocida.', 'operacion_desconocida')
      }

      await marcarCambio()
    })
  }

  /** Devuelve la foto guardada en una ruta, si quien la pide puede verla. */
  async function foto(ruta, perfilId) {
    const perfil = await perfilRequerido(perfilId)
    if (!String(ruta).startsWith('obras/' + perfil.obra_id + '/')) return null
    return (await db.fotos.get(ruta)) ?? null
  }

  /** Avisa cada vez que algo cambia en el servidor (el equivalente a Realtime). */
  function observar(alCambiar) {
    let primera = true
    const suscripcion = liveQuery(() => db.meta.get('revision')).subscribe({
      next: () => {
        if (primera) {
          primera = false
          return
        }
        alCambiar()
      },
      error: () => {},
    })
    return () => suscripcion.unsubscribe()
  }

  return { db, asegurarDatos, reiniciar, ingresar, descargar, recibir, foto, observar }
}
