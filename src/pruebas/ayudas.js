/* Piezas compartidas por las pruebas de la capa de datos:
   un "celular" completo (base local + conexión + sincronizador) contra un servidor de demostración. */

import { crearBaseLocal } from '../datos/local.js'
import { crearServidorDemo } from '../datos/servidor-demo.js'
import { crearRemotoDemo } from '../datos/remoto-demo.js'
import { crearSincronizador } from '../datos/sincronizacion.js'
import { nuevaOperacion, nuevoId, rutaFotoTarea } from '../datos/operaciones.js'
import { prepararIncidente } from '../dominio/incidentes.js'
import { PIN_DEMO } from '../datos/semilla.js'

let contador = 0
export const nombreUnico = (prefijo) => prefijo + '-' + Date.now() + '-' + ++contador

export function almacenEnMemoria() {
  const datos = new Map()
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
  }
}

export async function crearServidor() {
  const servidor = crearServidorDemo({ nombre: nombreUnico('servidor') })
  await servidor.asegurarDatos()
  return servidor
}

/** Un celular con sesión iniciada. `red.hay = false` simula quedarse sin señal. */
export async function crearCelular(servidor, rut, { envolverRemoto } = {}) {
  const red = { hay: true }
  const hayRed = () => red.hay
  const db = crearBaseLocal(nombreUnico('celular'))
  let remoto = crearRemotoDemo({ servidor, almacen: almacenEnMemoria(), hayRed, demora: 0 })
  const perfil = await remoto.ingresar(rut, PIN_DEMO)
  if (envolverRemoto) remoto = envolverRemoto(remoto)
  const sinc = crearSincronizador({ db, remoto, perfil, hayRed })
  await sinc.descargar()
  return { db, remoto, perfil, sinc, red }
}

export function fotoDePrueba() {
  const datos = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer
  return { datos, tipo: 'image/jpeg', kb: 1 }
}

/** Operación de cierre de tarea, igual a la que arma la app. */
export function operacionCerrar(celular, tarea, { conFoto = true } = {}) {
  const id = nuevoId()
  const evidencia = {
    id,
    tarea_id: tarea.id,
    obra_id: tarea.obra_id,
    autor_id: celular.perfil.id,
    checklist: tarea.checklist.map(() => true),
    foto_path: conFoto ? rutaFotoTarea(tarea.obra_id, id) : null,
    foto_kb: conFoto ? 1 : null,
    tomada_at: new Date().toISOString(),
  }
  const op = nuevaOperacion('cerrar_tarea', celular.perfil.id, { evidencia }, {
    id,
    ref_id: tarea.id,
    foto_id: conFoto ? id : null,
    resumen: { titulo: tarea.titulo, detalle: 'Tarea con foto', clase: 'tarea' },
  })
  const foto = conFoto ? { id, ...fotoDePrueba() } : null
  return { op, foto, evidencia }
}

export function operacionIncidente(celular, datos) {
  const id = nuevoId()
  const incidente = prepararIncidente(
    { id, clase: 'riesgo', tipo: 'caida', anonimo: true, lugar: 'Piso 3', ocurrido_at: new Date().toISOString(), ...datos },
    celular.perfil,
  )
  const op = nuevaOperacion('reportar_incidente', celular.perfil.id, { incidente }, {
    id,
    ref_id: incidente.tarea_id,
    resumen: { titulo: 'Riesgo de caída', detalle: 'Reporte', clase: 'incidente' },
  })
  return { op, incidente }
}

export function operacionVerificar(celular, tarea, resultado, motivos = [], comentario = null) {
  const id = nuevoId()
  const verificacion = {
    id,
    tarea_id: tarea.id,
    evidencia_id: null,
    supervisor_id: celular.perfil.id,
    resultado,
    motivos,
    comentario,
    creada_at: new Date().toISOString(),
  }
  return nuevaOperacion('verificar_tarea', celular.perfil.id, { verificacion }, { id, ref_id: tarea.id })
}

/** Espera a que termine todo lo que el sincronizador dejó corriendo en segundo plano. */
export async function asentar(celular) {
  await celular.sinc.enviarPendientes()
  await celular.sinc.descargar()
}
