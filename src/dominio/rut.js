/* RUT chileno: limpieza, validación del dígito verificador y formato.
   El ingreso usa el RUT como nombre de usuario, así que un RUT mal escrito
   se detecta en el celular antes de consultar al servidor. */

/** Deja solo dígitos y la letra K, en mayúscula, con un máximo de 9 caracteres. */
export function limpiarRut(texto) {
  return String(texto ?? '').toUpperCase().replace(/[^0-9K]/g, '').slice(0, 9)
}

/** Calcula el dígito verificador (módulo 11) del cuerpo numérico de un RUT. */
export function digitoVerificador(cuerpo) {
  let suma = 0
  let factor = 2
  const digitos = String(cuerpo)
  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += Number(digitos[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

/** Indica si el texto es un RUT completo y con dígito verificador correcto. */
export function rutValido(texto) {
  const limpio = limpiarRut(texto)
  if (limpio.length < 8) return false
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  return digitoVerificador(cuerpo) === dv
}

/** Formato para mostrar mientras se escribe: 12.345.678-5 */
export function formatearRut(texto) {
  const limpio = limpiarRut(texto)
  if (limpio.length <= 1) return limpio
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return cuerpo + '-' + limpio.slice(-1)
}

/** Formato único para guardar y comparar: 12345678-5 (con k minúscula). */
export function normalizarRut(texto) {
  const limpio = limpiarRut(texto)
  if (limpio.length < 2) return limpio.toLowerCase()
  return (limpio.slice(0, -1) + '-' + limpio.slice(-1)).toLowerCase()
}

/** Correo interno con el que el RUT entra a Supabase Auth. Nadie lo escribe ni lo ve. */
export function correoDeRut(texto) {
  return normalizarRut(texto) + '@sito.local'
}
