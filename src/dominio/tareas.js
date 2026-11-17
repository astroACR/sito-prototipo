/* Reglas del flujo de una tarea.

   asignada → por_verificar → verificada
                   ↓
                corregir → por_verificar → …

   "Pendiente de envío" NO es un estado de la tarea: es una marca del celular
   que existe mientras el cierre sigue en la cola de envío. */

import { fechaLocal } from './tiempo.js'

export const ESTADOS_TAREA = ['asignada', 'por_verificar', 'verificada', 'corregir']

/** El trabajador puede cerrar una tarea que está por hacer o que le pidieron corregir. */
export function puedeCerrar(estado) {
  return estado === 'asignada' || estado === 'corregir'
}

/** El supervisor solo verifica tareas que el trabajador ya cerró. */
export function puedeVerificar(estado) {
  return estado === 'por_verificar'
}

export const RESULTADOS_VERIFICACION = ['aprobada', 'corregir']

/** Estado en que queda la tarea según lo que decidió el supervisor. */
export function estadoTrasVerificar(resultado) {
  if (resultado === 'aprobada') return 'verificada'
  if (resultado === 'corregir') return 'corregir'
  throw new Error('Resultado de verificación desconocido: ' + resultado)
}

/** Motivos rápidos para pedir una corrección. Se guardan como texto, tal como los lee el trabajador. */
export const MOTIVOS_CORRECCION = [
  'Foto poco clara',
  'Falta terminar',
  'No está según el plano',
  'Falta limpiar el área',
  'Otro motivo',
]

/* Cómo se muestra cada situación: mismos colores e íconos del prototipo. */
const VISTA = {
  pendiente: { label: 'Pendiente de envío', icon: 'refresh', color: 'amber' },
  asignada: { label: 'Por hacer', icon: 'wrench', color: 'blue' },
  corregir: { label: 'Corregir', icon: 'alert', color: 'red' },
  enviada: { label: 'Enviada · en revisión', icon: 'check', color: 'green' },
  por_verificar: { label: 'Por verificar', icon: 'camera', color: 'amber' },
  verificada: { label: 'Verificada', icon: 'checkcircle', color: 'green' },
}

/**
 * Etiqueta, ícono y color de una tarea.
 * @param tarea            fila de la tarea
 * @param pendienteEnvio   true si su cierre todavía está en la cola del celular
 * @param rol              'trabajador' | 'supervisor'
 */
export function vistaDeTarea(tarea, { pendienteEnvio = false, rol = 'trabajador' } = {}) {
  let clave = tarea.estado
  if (pendienteEnvio) clave = 'pendiente'
  else if (tarea.estado === 'por_verificar' && rol === 'trabajador') clave = 'enviada'
  const v = VISTA[clave] || VISTA.asignada
  return { ...v, tile: 'tile-' + v.color, txt: 'st-' + v.color, chip: 'chip-' + v.color }
}

/** Paso del indicador "Asignada · En curso · Verificada": cuántos pasos ya están completos. */
export function pasoActual(estado) {
  if (estado === 'verificada') return 3
  if (estado === 'por_verificar') return 2
  return 1
}

/** La tarea sigue abierta para el trabajador. */
export function estaAbierta(tarea) {
  return puedeCerrar(tarea.estado)
}

/** Va en "Mis tareas de hoy": todo lo que sigue abierto, más lo de la jornada de hoy. */
export function esDeHoy(tarea, hoy = fechaLocal()) {
  return estaAbierta(tarea) || tarea.fecha === hoy
}

/** Tareas que le corresponden a una persona: las suyas y las de toda su cuadrilla. */
export function esDelTrabajador(tarea, perfil) {
  if (tarea.asignado_a) return tarea.asignado_a === perfil.id
  return !!perfil.cuadrilla_id && tarea.cuadrilla_id === perfil.cuadrilla_id
}

const ORDEN_TRABAJADOR = { corregir: 0, asignada: 1, por_verificar: 2, verificada: 3 }

/** Orden de "Mis tareas": primero lo que hay que corregir, luego lo por hacer, al final lo terminado. */
export function ordenarParaTrabajador(tareas) {
  return [...tareas].sort(
    (a, b) =>
      ORDEN_TRABAJADOR[a.estado] - ORDEN_TRABAJADOR[b.estado] ||
      String(a.creada_at).localeCompare(String(b.creada_at)) ||
      String(a.id).localeCompare(String(b.id)),
  )
}

const ORDEN_SUPERVISOR = { por_verificar: 0, corregir: 1, asignada: 2, verificada: 3 }

/** Orden de la lista del supervisor: primero lo que espera su revisión. */
export function ordenarParaSupervisor(tareas) {
  return [...tareas].sort(
    (a, b) =>
      ORDEN_SUPERVISOR[a.estado] - ORDEN_SUPERVISOR[b.estado] ||
      String(b.cerrada_at || b.creada_at).localeCompare(String(a.cerrada_at || a.creada_at)),
  )
}

/** "Piso 3 · Eje B-C" */
export function lugarCompleto(fila) {
  return [fila.lugar, fila.sector].filter(Boolean).join(' · ')
}

/** Indicadores del panel del supervisor para las tareas de una jornada. */
export function resumenDelDia(tareas, hoy = fechaLocal()) {
  const delDia = tareas.filter((t) => t.fecha === hoy)
  const cerradas = delDia.filter((t) => t.estado === 'por_verificar' || t.estado === 'verificada').length
  const porVerificar = tareas.filter((t) => t.estado === 'por_verificar').length
  return { total: delDia.length, cerradas, porVerificar }
}

/** Avance por cuadrilla: porcentaje de tareas de hoy ya cerradas por los trabajadores. */
export function avancePorCuadrilla(tareas, cuadrillas, hoy = fechaLocal()) {
  return [...cuadrillas]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((c) => {
      const suyas = tareas.filter((t) => t.cuadrilla_id === c.id && t.fecha === hoy)
      const hechas = suyas.filter((t) => t.estado === 'por_verificar' || t.estado === 'verificada').length
      return {
        cuadrilla: c,
        total: suyas.length,
        hechas,
        porcentaje: suyas.length ? Math.round((hechas / suyas.length) * 100) : 0,
      }
    })
}

/** "Cuadrilla 2 · Moldaje" */
export function nombreCuadrilla(c) {
  if (!c) return ''
  return c.especialidad ? c.nombre + ' · ' + c.especialidad : c.nombre
}
