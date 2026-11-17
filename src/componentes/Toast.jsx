/* Aviso breve que confirma cada acción ("Tarea guardada"). Aparece sobre el pie de la pantalla
   y se va solo. Se anuncia a los lectores de pantalla sin quitar el foco. */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const ToastContext = createContext(() => {})

/** Devuelve `toast(mensaje, tipo)` con tipo 'ok' | 'warn' | undefined. */
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [aviso, setAviso] = useState({ mensaje: '', tipo: undefined, visible: false, abajo: 16 })
  const reloj = useRef(null)

  const toast = useCallback((mensaje, tipo) => {
    /* Se ubica justo encima del pie de la pantalla actual, como en el prototipo. */
    const pie = document.querySelector('#app .foot')
    const abajo = pie ? pie.offsetHeight + 12 : 16
    setAviso({ mensaje, tipo, visible: true, abajo })
    clearTimeout(reloj.current)
    reloj.current = setTimeout(() => setAviso((a) => ({ ...a, visible: false })), 2800)
  }, [])

  const valor = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        className={'toast' + (aviso.visible ? ' show' : '') + (aviso.tipo ? ' ' + aviso.tipo : '')}
        role="status"
        aria-live="polite"
        style={{ bottom: `calc(${aviso.abajo}px + ${aviso.abajo === 16 ? 'env(safe-area-inset-bottom, 0px)' : '0px'})` }}
      >
        {aviso.mensaje ? <Icon name={aviso.tipo === 'warn' ? 'alert' : 'checkcircle'} size={22} /> : null}
        <span>{aviso.mensaje}</span>
      </div>
    </ToastContext.Provider>
  )
}
