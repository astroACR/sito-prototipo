/* Capa de datos de SITO.

   Las pantallas importan SOLO de este archivo. Aquí no se ve si los datos vienen de
   Supabase o del modo demo: eso se decide en nucleo.js según existan
   VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.

     Leer:    use…()      (consultas.js)   se actualizan solas y funcionan sin señal
     Hacer:   acciones    (acciones.js)    trabajador: cola de envío · supervisor: en línea */

export { modo } from './nucleo.js'

export {
  ingresar,
  salir,
  aceptarConsentimiento,
  guardarBorrador,
  borrarBorrador,
  cerrarTarea,
  reportarIncidente,
  enviarAhora,
  refrescar,
  verificarTarea,
  crearTarea,
  atenderIncidente,
  cerrarIncidente,
  obtenerFoto,
  reiniciarDemo,
} from './acciones.js'

export {
  usePerfil,
  useEstadoSincronizacion,
  useObra,
  useCuadrillas,
  usePersonas,
  usePlantillas,
  useTareas,
  useTarea,
  useCola,
  useTareasPendientesDeEnvio,
  useIncidentes,
  useIncidente,
  useUltimasEvidencias,
  useBorrador,
  useFoto,
  useAhora,
} from './consultas.js'

export { comprimirFoto } from './fotos.js'
export { ErrorRed, ErrorSesion, ErrorRechazo, ErrorCredenciales } from './errores.js'

import { sesion } from './nucleo.js'

/** Última persona que ingresó en este celular ({ rut, nombre }) para no volver a pedir el RUT. */
export const ultimoIngreso = () => sesion.ultimoIngreso()
export const olvidarUltimoIngreso = () => sesion.olvidarUltimo()

import { modo as modoActual } from './nucleo.js'
import { USUARIOS, PIN_DEMO } from './semilla.js'

/** Usuarios de ejemplo para entrar con un toque. Solo existen en modo demo; con Supabase devuelve []. */
export function usuariosDeEjemplo() {
  if (modoActual !== 'demo') return []
  const elegir = (rol) => USUARIOS.find((u) => u.rol === rol)
  return [elegir('trabajador'), elegir('supervisor')].map((u) => ({ rol: u.rol, nombre: u.nombre, rut: u.rut, pin: PIN_DEMO }))
}
