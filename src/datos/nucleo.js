/* Piezas únicas de la capa de datos: la conexión al servidor (Supabase o demo),
   la base del celular, la sesión y el sincronizador de la persona que ingresó.

   El resto de la app no importa este archivo: usa src/datos/index.js. */

import { crearBaseLocal, vaciarCopia, leerMeta, guardarMeta } from './local.js'
import { crearServidorDemo } from './servidor-demo.js'
import { crearRemotoDemo } from './remoto-demo.js'
import { crearSincronizador } from './sincronizacion.js'
import { ErrorRed } from './errores.js'
import { crearSesion } from './sesion.js'

/* "?dispositivo=2" en la dirección abre un segundo celular simulado en el mismo navegador:
   tiene su propia sesión y su propia base local, pero habla con el mismo servidor.
   Sirve para mostrar trabajador y supervisor en dos ventanas del mismo computador. */
const dispositivo = (new URLSearchParams(globalThis.location?.search ?? '').get('dispositivo') || '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 20)
const sufijo = dispositivo ? '-' + dispositivo : ''

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL
const CLAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY

/* Sin credenciales de Supabase, la app funciona en modo demo con datos de ejemplo. */
export const servidorDemo = URL_SUPABASE && CLAVE_SUPABASE ? null : crearServidorDemo()

/**
 * Conexión a Supabase que carga su librería solo la primera vez que se usa.
 * Así, en modo demo el celular no descarga ni procesa ese código, y con Supabase
 * la app dibuja su primera pantalla antes de cargarla.
 */
function remotoSupabasePerezoso() {
  let cargando = null
  const obtener = () => {
    if (!cargando) {
      cargando = import('./remoto-supabase.js')
        .then((m) => m.crearRemotoSupabase({ url: URL_SUPABASE, clave: CLAVE_SUPABASE, sufijo }))
        .catch((error) => {
          cargando = null
          throw new ErrorRed('No se pudo cargar la conexión: ' + error.message)
        })
    }
    return cargando
  }
  const llamar =
    (metodo) =>
    (...args) =>
      obtener().then((r) => r[metodo](...args))
  /* Las suscripciones devuelven al tiro la función para cancelar, aunque la librería aún esté cargando. */
  const escuchar =
    (metodo) =>
    (...args) => {
      let cancelar = null
      let cancelado = false
      obtener()
        .then((r) => {
          if (!cancelado) cancelar = r[metodo](...args)
        })
        .catch(() => {})
      return () => {
        cancelado = true
        cancelar?.()
      }
    }
  return {
    modo: 'supabase',
    ingresar: llamar('ingresar'),
    salir: llamar('salir'),
    descargar: llamar('descargar'),
    enviar: llamar('enviar'),
    bajarFoto: llamar('bajarFoto'),
    suscribir: escuchar('suscribir'),
    alPerderSesion: escuchar('alPerderSesion'),
  }
}

export const remoto = servidorDemo
  ? crearRemotoDemo({ servidor: servidorDemo, claveSesion: 'sito-demo-sesion' + sufijo })
  : remotoSupabasePerezoso()

export const modo = remoto.modo
export const db = crearBaseLocal('sito-celular' + sufijo)
export const sesion = crearSesion({ clave: 'sito-sesion' + sufijo })

/* ---- Sincronizador de la sesión actual ---- */
const SIN_SINCRONIZADOR = Object.freeze({ enviando: false, descargando: false, sinSenal: false, sesionVencida: false, ultimaDescarga: null })
let sincronizador = null
let dejarDeOir = null
const oyentes = new Set()
const avisar = () => oyentes.forEach((fn) => fn())

export const estadoSincronizacion = {
  leer: () => (sincronizador ? sincronizador.leerEstado() : SIN_SINCRONIZADOR),
  suscribir(fn) {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
}

/** El servidor manda el perfil al día. No se pisa un consentimiento dado en el celular que aún no se envía. */
async function alRecibirPerfil(delServidor) {
  const actual = sesion.leer()
  if (!actual || actual.id !== delServidor.id) return
  const cambios = {
    nombre: delServidor.nombre,
    rol: delServidor.rol,
    obra_id: delServidor.obra_id,
    cuadrilla_id: delServidor.cuadrilla_id,
    consentimiento_at: delServidor.consentimiento_at ?? null,
  }
  if (!cambios.consentimiento_at && actual.consentimiento_at) {
    const enCola = await db.cola
      .filter((o) => o.tipo === 'consentimiento' && o.usuario_id === actual.id && o.estado === 'pendiente')
      .count()
    if (enCola) cambios.consentimiento_at = actual.consentimiento_at
  }
  sesion.actualizar(cambios)
}

export function detener() {
  dejarDeOir?.()
  dejarDeOir = null
  sincronizador?.detener()
  sincronizador = null
  avisar()
}

/** Crea y pone en marcha el sincronizador de la persona que está usando el celular. */
export function arrancar(perfil) {
  detener()
  sincronizador = crearSincronizador({ db, remoto, perfil, alRecibirPerfil: (p) => alRecibirPerfil(p).catch(() => {}) })
  dejarDeOir = sincronizador.suscribir(avisar)
  sincronizador.iniciar()
  avisar()
  return sincronizador
}

export function obtenerSincronizador() {
  if (!sincronizador) throw new Error('No hay una sesión iniciada.')
  return sincronizador
}

/** Deja el celular listo para una persona: si es otra que la anterior, borra la copia de datos de la anterior. */
export async function prepararCelularPara(perfil) {
  const anterior = await leerMeta(db, 'usuario_id')
  if (anterior && anterior !== perfil.id) await vaciarCopia(db)
  await guardarMeta(db, 'usuario_id', perfil.id)
}

/** Pide al navegador que no borre los datos guardados si el celular se queda sin espacio. */
export async function pedirAlmacenamientoPersistente() {
  try {
    if (!globalThis.navigator?.storage?.persist) return null
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

/* Al abrir la app con una sesión guardada, se retoma de inmediato, con o sin señal. */
if (sesion.leer()) arrancar(sesion.leer())
