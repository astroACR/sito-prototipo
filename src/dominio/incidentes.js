/* Incidentes: riesgos de seguridad (pueden ser anónimos) y problemas que
   frenan una tarea (siempre con nombre, porque el supervisor necesita saber a quién ayudar). */

export const TIPOS_RIESGO = [
  { id: 'caida', label: 'Riesgo de caída', icon: 'fall' },
  { id: 'material', label: 'Material suelto', icon: 'box' },
  { id: 'equipo', label: 'Equipo dañado', icon: 'hammer' },
  { id: 'otro', label: 'Otro riesgo', icon: 'help' },
]

export const TIPOS_PROBLEMA = [
  { id: 'falta_material', label: 'Falta material', icon: 'box' },
  { id: 'sin_acceso', label: 'No puedo acceder', icon: 'lock' },
  { id: 'otro', label: 'Otro problema', icon: 'help' },
]

export const ESTADOS_INCIDENTE = ['nuevo', 'en_atencion', 'cerrado']

export function tipoDeIncidente(incidente) {
  const lista = incidente.clase === 'problema' ? TIPOS_PROBLEMA : TIPOS_RIESGO
  return lista.find((t) => t.id === incidente.tipo) || lista[lista.length - 1]
}

export function etiquetaIncidente(incidente) {
  return tipoDeIncidente(incidente).label
}

export const VISTA_ESTADO_INCIDENTE = {
  nuevo: { label: 'Nuevo', chip: 'chip-red' },
  en_atencion: { label: 'En atención', chip: 'chip-amber' },
  cerrado: { label: 'Cerrado', chip: 'chip-green' },
}

export function estaAbierto(incidente) {
  return incidente.estado !== 'cerrado'
}

/**
 * Deja un incidente listo para guardarse respetando el anonimato.
 * Si es anónimo, no lleva el reportero ni la tarea desde la que se abrió:
 * una tarea asignada a una sola persona delataría a quien reporta.
 */
export function prepararIncidente(datos, perfil) {
  const anonimo = datos.clase === 'problema' ? false : !!datos.anonimo
  return {
    id: datos.id,
    obra_id: perfil.obra_id,
    clase: datos.clase,
    tipo: datos.tipo,
    tarea_id: anonimo ? null : (datos.tarea_id ?? null),
    lugar: datos.lugar ?? null,
    sector: datos.sector ?? null,
    nota: datos.nota ?? null,
    anonimo,
    reportero_id: anonimo ? null : perfil.id,
    foto_path: datos.foto_path ?? null,
    foto_kb: datos.foto_kb ?? null,
    ocurrido_at: datos.ocurrido_at,
    estado: 'nuevo',
    atendido_por: null,
    atendido_at: null,
    cerrado_at: null,
  }
}

/** Reglas que el servidor exige a un incidente nuevo. Devuelve el motivo del rechazo o null. */
export function motivoDeRechazo(incidente, perfil) {
  if (incidente.obra_id !== perfil.obra_id) return 'El incidente es de otra obra.'
  if (incidente.estado !== 'nuevo') return 'Un incidente nuevo debe partir en estado "nuevo".'
  if (incidente.anonimo) {
    if (incidente.reportero_id != null) return 'Un incidente anónimo no puede llevar el nombre de quien reporta.'
    if (incidente.tarea_id != null) return 'Un incidente anónimo no puede quedar ligado a una tarea.'
    if (incidente.clase === 'problema') return 'Un problema de tarea no puede ser anónimo.'
  } else if (incidente.reportero_id !== perfil.id) {
    return 'El reporte con nombre debe llevar a quien lo envía.'
  }
  return null
}
