/* Fechas y horas en el formato corto que usa la app ("10:42", "17 nov", "hace 4 min"). */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const dos = (n) => String(n).padStart(2, '0')

/** Fecha local del celular como AAAA-MM-DD. Es la "jornada" de una tarea. */
export function fechaLocal(fecha = new Date()) {
  const d = new Date(fecha)
  return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate())
}

/** Resta días a una fecha AAAA-MM-DD y devuelve otra fecha AAAA-MM-DD. */
export function restarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number)
  return fechaLocal(new Date(a, m - 1, d - dias))
}

/** "10:42" */
export function hora(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return dos(d.getHours()) + ':' + dos(d.getMinutes())
}

/** "17 nov" */
export function diaCorto(iso) {
  if (!iso) return ''
  const d = typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? deFecha(iso) : new Date(iso)
  return d.getDate() + ' ' + MESES[d.getMonth()]
}

function deFecha(fecha) {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** "Hoy", "Ayer" o "Viernes 14 nov" para una fecha AAAA-MM-DD. */
export function etiquetaDia(fecha, hoy = fechaLocal()) {
  if (fecha === hoy) return 'Hoy'
  if (fecha === restarDias(hoy, 1)) return 'Ayer'
  const d = deFecha(fecha)
  return DIAS[d.getDay()] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()]
}

/** "recién", "hace 4 min", "hace 2 h" o "17 nov, 10:42". */
export function haceCuanto(iso, ahora = new Date()) {
  if (!iso) return ''
  const minutos = Math.floor((new Date(ahora) - new Date(iso)) / 60000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return 'hace ' + minutos + ' min'
  if (minutos < 60 * 12) return 'hace ' + Math.floor(minutos / 60) + ' h'
  return diaCorto(iso) + ', ' + hora(iso)
}

/** "Pedro Rojas" → "Pedro R." */
export function nombreCorto(nombre) {
  const partes = String(nombre ?? '').trim().split(/\s+/)
  if (partes.length < 2) return partes[0] || ''
  return partes[0] + ' ' + partes[1][0] + '.'
}

/** "Pedro Rojas" → "Pedro" */
export function primerNombre(nombre) {
  return String(nombre ?? '').trim().split(/\s+/)[0] || ''
}
