/* Acciones: todo lo que una persona puede hacer en la app.

   - Las del trabajador se guardan primero en el celular y quedan en la cola de envío:
     funcionan igual con o sin señal.
   - Las del supervisor se envían en el momento y necesitan conexión. Si no la hay,
     lanzan ErrorRed y no cambian nada. */

import {
  db,
  remoto,
  sesion,
  servidorDemo,
  arrancar,
  detener,
  obtenerSincronizador,
  prepararCelularPara,
  pedirAlmacenamientoPersistente,
} from './nucleo.js'
import { vaciarCopia } from './local.js'
import { nuevaOperacion, nuevoId, rutaFotoTarea, rutaFotoIncidente } from './operaciones.js'
import { prepararIncidente, etiquetaIncidente } from '../dominio/incidentes.js'
import { fechaLocal } from '../dominio/tiempo.js'

const ahora = () => new Date().toISOString()

function perfilActual() {
  const perfil = sesion.leer()
  if (!perfil) throw new Error('No hay una sesión iniciada.')
  return perfil
}

/* ------------------------------------------------------------------ */
/* Sesión                                                              */
/* ------------------------------------------------------------------ */

/** Ingresa con RUT y clave. Necesita conexión. Devuelve el perfil. */
export async function ingresar(rut, pin) {
  const perfil = await remoto.ingresar(rut, pin)
  await prepararCelularPara(perfil)
  const sinc = arrancar(perfil)
  /* Primera descarga antes de mostrar la app, para no partir con la lista vacía.
     La sesión se activa recién después: activarla cambia de pantalla, y hacerlo antes
     provocaba un segundo cambio de pantalla al terminar la descarga. */
  await sinc.descargar().catch(() => {})
  sesion.poner(perfil)
  pedirAlmacenamientoPersistente()
  return sesion.leer()
}

/** Cierra la sesión. Lo que quedó sin enviar se conserva y sale cuando la misma persona vuelva a ingresar. */
export async function salir() {
  detener()
  await remoto.salir().catch(() => {})
  await vaciarCopia(db).catch(() => {})
  sesion.quitar()
}

/** Registra que la persona aceptó el uso de sus datos. */
export async function aceptarConsentimiento() {
  const perfil = perfilActual()
  const aceptado_at = ahora()
  const op = nuevaOperacion('consentimiento', perfil.id, { aceptado_at })
  await obtenerSincronizador().encolar(op)
  sesion.actualizar({ consentimiento_at: aceptado_at })
  pedirAlmacenamientoPersistente()
}

/* ------------------------------------------------------------------ */
/* Trabajador                                                          */
/* ------------------------------------------------------------------ */

/** Guarda el avance de una tarea sin terminar (casillas marcadas, foto tomada). */
export async function guardarBorrador(tareaId, cambios) {
  await db.transaction('rw', db.borradores, async () => {
    const actual = (await db.borradores.get(tareaId)) ?? { tarea_id: tareaId, checks: [], foto: null }
    await db.borradores.put({ ...actual, ...cambios, tarea_id: tareaId })
  })
}

export async function borrarBorrador(tareaId) {
  await db.borradores.delete(tareaId)
}

/**
 * Termina una tarea con su checklist y su foto.
 * @param tarea   fila de la tarea
 * @param checks  casillas marcadas, en el orden del checklist
 * @param foto    { datos, tipo, kb, tomada_at } ya comprimida
 */
export async function cerrarTarea({ tarea, checks, foto }) {
  const perfil = perfilActual()
  const id = nuevoId()
  const evidencia = {
    id,
    tarea_id: tarea.id,
    obra_id: tarea.obra_id,
    autor_id: perfil.id,
    checklist: tarea.checklist.map((_, i) => !!checks[i]),
    foto_path: foto ? rutaFotoTarea(tarea.obra_id, id) : null,
    foto_kb: foto ? foto.kb : null,
    tomada_at: foto?.tomada_at ?? ahora(),
  }
  const op = nuevaOperacion('cerrar_tarea', perfil.id, { evidencia }, {
    id,
    ref_id: tarea.id,
    foto_id: foto ? id : null,
    resumen: { clase: 'tarea', titulo: tarea.titulo, detalle: 'Tarea con foto' },
  })
  await obtenerSincronizador().encolar(op, foto ? { id, datos: foto.datos, tipo: foto.tipo, kb: foto.kb } : null)
  await borrarBorrador(tarea.id)
  return evidencia
}

/**
 * Reporta un riesgo de seguridad (puede ser anónimo) o un problema que frena una tarea.
 * @param datos { clase, tipo, anonimo, lugar, sector, tarea_id, nota, foto }
 */
export async function reportarIncidente(datos) {
  const perfil = perfilActual()
  const id = nuevoId()
  const incidente = prepararIncidente(
    {
      id,
      clase: datos.clase,
      tipo: datos.tipo,
      anonimo: datos.anonimo,
      tarea_id: datos.tarea_id ?? null,
      lugar: datos.lugar ?? null,
      sector: datos.sector ?? null,
      nota: datos.nota?.trim() || null,
      foto_path: datos.foto ? rutaFotoIncidente(perfil.obra_id, id) : null,
      foto_kb: datos.foto ? datos.foto.kb : null,
      ocurrido_at: ahora(),
    },
    perfil,
  )
  const detalle = incidente.clase === 'problema' ? 'Aviso a tu supervisor' : incidente.anonimo ? 'Reporte anónimo' : 'Reporte con tu nombre'
  const op = nuevaOperacion('reportar_incidente', perfil.id, { incidente }, {
    id,
    ref_id: incidente.tarea_id,
    foto_id: datos.foto ? id : null,
    resumen: { clase: incidente.clase, titulo: etiquetaIncidente(incidente), detalle },
  })
  await obtenerSincronizador().encolar(op, datos.foto ? { id, datos: datos.foto.datos, tipo: datos.foto.tipo, kb: datos.foto.kb } : null)
  return incidente
}

/** "Enviar ahora": intenta mandar todo lo pendiente, incluido lo que el servidor había rechazado. */
export function enviarAhora() {
  return obtenerSincronizador().enviarPendientes({ incluirRechazados: true })
}

/** Trae lo último del servidor. */
export function refrescar() {
  return obtenerSincronizador().descargar()
}

/* ------------------------------------------------------------------ */
/* Supervisor (necesita conexión)                                      */
/* ------------------------------------------------------------------ */

/** Aprueba una tarea ('aprobada') o pide corregirla ('corregir', con motivos). */
export async function verificarTarea({ tarea, resultado, motivos = [], comentario = null }) {
  const perfil = perfilActual()
  const id = nuevoId()
  const verificacion = {
    id,
    tarea_id: tarea.id,
    evidencia_id: null,
    supervisor_id: perfil.id,
    resultado,
    motivos,
    comentario: comentario?.trim() || null,
    creada_at: ahora(),
  }
  await obtenerSincronizador().ejecutarEnLinea(nuevaOperacion('verificar_tarea', perfil.id, { verificacion }, { id, ref_id: tarea.id }))
  return verificacion
}

/** Asigna una tarea nueva a partir de una plantilla. */
export async function crearTarea({ plantilla, cuadrillaId, asignadoA = null, lugar, sector = null }) {
  const perfil = perfilActual()
  const id = nuevoId()
  const tarea = {
    id,
    obra_id: perfil.obra_id,
    cuadrilla_id: cuadrillaId,
    asignado_a: asignadoA,
    plantilla_id: plantilla.id,
    titulo: plantilla.titulo,
    lugar,
    sector: sector?.trim() || null,
    checklist: plantilla.checklist,
    seguridad: plantilla.seguridad ?? null,
    estado: 'asignada',
    fecha: fechaLocal(),
    creada_por: perfil.id,
    creada_at: ahora(),
    cerrada_at: null,
    cerrada_por: null,
    verificada_at: null,
  }
  await obtenerSincronizador().ejecutarEnLinea(nuevaOperacion('crear_tarea', perfil.id, { tarea }, { id, ref_id: id }))
  return tarea
}

export async function atenderIncidente(incidenteId) {
  const perfil = perfilActual()
  const op = nuevaOperacion('atender_incidente', perfil.id, { incidente_id: incidenteId, por: perfil.id, en: ahora() }, { ref_id: incidenteId })
  await obtenerSincronizador().ejecutarEnLinea(op)
}

export async function cerrarIncidente(incidenteId) {
  const perfil = perfilActual()
  const op = nuevaOperacion('cerrar_incidente', perfil.id, { incidente_id: incidenteId, por: perfil.id, en: ahora() }, { ref_id: incidenteId })
  await obtenerSincronizador().ejecutarEnLinea(op)
}

/* ------------------------------------------------------------------ */
/* Fotos                                                               */
/* ------------------------------------------------------------------ */

/**
 * Devuelve la foto como Blob: primero la busca en el celular y, si no está, la baja del servidor
 * y la guarda para la próxima vez. Devuelve null si no existe o no hay cómo obtenerla.
 */
export async function obtenerFoto(id, ruta) {
  const local = await db.fotos.get(id)
  if (local) return new Blob([local.datos], { type: local.tipo || 'image/jpeg' })
  if (!ruta) return null
  const blob = await remoto.bajarFoto(ruta).catch(() => null)
  if (!blob) return null
  const datos = await new Response(blob).arrayBuffer()
  await db.fotos.put({ id, datos, tipo: blob.type || 'image/jpeg', kb: Math.round(datos.byteLength / 1024), guardada_at: ahora() }).catch(() => {})
  return blob
}

/* ------------------------------------------------------------------ */
/* Modo demo                                                           */
/* ------------------------------------------------------------------ */

/** Vuelve a dejar los datos de ejemplo como al principio. Solo existe en modo demo. */
export async function reiniciarDemo() {
  if (!servidorDemo) throw new Error('El reinicio desde la app solo existe en modo demo. Con Supabase, ejecuta supabase/reset-demo.sql.')
  detener()
  await remoto.salir().catch(() => {})
  await servidorDemo.reiniciar()
  await db.transaction('rw', db.tables, async () => {
    for (const tabla of db.tables) await tabla.clear()
  })
  sesion.quitar()
  sesion.olvidarUltimo()
}
