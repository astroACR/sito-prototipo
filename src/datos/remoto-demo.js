/* Conexión al servidor de demostración.

   Cumple el mismo contrato que remoto-supabase.js:

     modo                         'demo' | 'supabase'
     ingresar(rut, pin)           → perfil            (ErrorCredenciales, ErrorRed)
     salir()
     descargar(perfil)            → copia de lo que la persona puede ver
     enviar(operacion, foto)      → nada              (ErrorRed, ErrorSesion, ErrorRechazo)
     bajarFoto(ruta)              → Blob o null
     suscribir(perfil, alCambiar) → función para dejar de escuchar
     alPerderSesion(fn)           → función para dejar de escuchar

   Respeta la falta de señal del celular: sin red no "llega" al servidor,
   igual que pasaría con el servidor real. */

import { ErrorRed, ErrorSesion } from './errores.js'
import { normalizarRut } from '../dominio/rut.js'

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms))

export function crearRemotoDemo({
  servidor,
  almacen = globalThis.localStorage,
  claveSesion = 'sito-demo-sesion',
  hayRed = () => globalThis.navigator?.onLine !== false,
  demora = 150,
} = {}) {
  async function viajar() {
    if (!hayRed()) throw new ErrorRed()
    if (demora) await esperar(demora)
    if (!hayRed()) throw new ErrorRed()
  }

  function sesionId() {
    const id = almacen.getItem(claveSesion)
    if (!id) throw new ErrorSesion()
    return id
  }

  return {
    modo: 'demo',

    async ingresar(rut, pin) {
      await viajar()
      const perfil = await servidor.ingresar(rut, pin)
      almacen.setItem(claveSesion, perfil.id)
      return { ...perfil, rut: normalizarRut(rut) }
    },

    async salir() {
      almacen.removeItem(claveSesion)
    },

    async descargar() {
      await viajar()
      return servidor.descargar(sesionId())
    },

    async enviar(operacion, foto = null) {
      await viajar()
      await servidor.recibir(operacion, sesionId(), foto)
    },

    async bajarFoto(ruta) {
      await viajar()
      const fila = await servidor.foto(ruta, sesionId())
      return fila ? new Blob([fila.datos], { type: fila.tipo || 'image/jpeg' }) : null
    },

    suscribir(_perfil, alCambiar) {
      return servidor.observar(alCambiar)
    },

    alPerderSesion() {
      return () => {}
    },
  }
}
