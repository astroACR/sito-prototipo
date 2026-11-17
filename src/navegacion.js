/* Navegación de la app.

   Igual que en el prototipo: "volver" retrocede un paso y, al terminar una acción
   (cerrar una tarea, enviar un reporte), se vuelve a la pantalla principal vaciando
   el camino recorrido, para que el botón "atrás" del celular no regrese a un formulario ya enviado. */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

/** Cuántas pantallas hay detrás de la actual en el historial de esta sesión. */
const profundidad = () => globalThis.history?.state?.idx ?? 0

export const RAIZ = { trabajador: '/tareas', supervisor: '/hoy' }

export function useNavegacion() {
  const navigate = useNavigate()
  return useMemo(
    () => ({
      ir: (ruta, opciones) => navigate(ruta, opciones),

      volver: () => {
        if (profundidad() > 0) navigate(-1)
        else navigate('/', { replace: true })
      },

      /** Vuelve a la pantalla principal del rol. */
      alInicio: () => {
        const n = profundidad()
        if (n > 0) navigate(-n)
        else navigate('/', { replace: true })
      },

      /**
       * Cambio de pestaña inferior. Desde la pestaña principal se avanza; entre las otras
       * se reemplaza, para que "atrás" siempre regrese a la pestaña principal.
       */
      aPestana: (ruta, { actual, raiz }) => {
        if (ruta === actual) return
        if (ruta === raiz) {
          if (profundidad() > 0) navigate(-1)
          else navigate(ruta, { replace: true })
        } else if (actual === raiz) {
          navigate(ruta)
        } else {
          navigate(ruta, { replace: true })
        }
      },
    }),
    [navigate],
  )
}
