/* Preferencias del celular que no viajan al servidor. Por ahora, solo "Letra más grande". */

import { useSyncExternalStore } from 'react'

const CLAVE = 'sito-letra-grande'
const oyentes = new Set()

function leer() {
  try {
    return globalThis.localStorage?.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

let activa = leer()

function aplicar() {
  globalThis.document?.documentElement.classList.toggle('letra-grande', activa)
}

export function ponerLetraGrande(valor) {
  activa = !!valor
  try {
    globalThis.localStorage?.setItem(CLAVE, activa ? '1' : '0')
  } catch {
    /* sin almacenamiento: dura mientras la app esté abierta */
  }
  aplicar()
  oyentes.forEach((fn) => fn())
}

/** [activa, cambiar] */
export function useLetraGrande() {
  const valor = useSyncExternalStore(
    (fn) => {
      oyentes.add(fn)
      return () => oyentes.delete(fn)
    },
    () => activa,
  )
  return [valor, ponerLetraGrande]
}

aplicar()
