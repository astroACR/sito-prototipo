/* Panel inferior: opciones o detalle sin salir de la pantalla.
   Se cierra con su botón, tocando fuera o con Escape, y devuelve el foco a donde estaba. */

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function Sheet({ open, onClose, title, children }) {
  const idTitulo = useId()
  const tituloRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const antes = document.activeElement
    tituloRef.current?.focus({ preventScroll: true })
    const alTeclear = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      if (antes && document.contains(antes)) {
        try {
          antes.focus({ preventScroll: true })
        } catch {
          /* el elemento ya no acepta foco */
        }
      }
    }
  }, [open, onClose])

  const destino = typeof document !== 'undefined' ? document.getElementById('sheet-root') : null
  if (!open || !destino) return null

  return createPortal(
    <>
      <div className="backdrop" aria-hidden="true" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <div className="grab" aria-hidden="true" />
        <h2 id={idTitulo} tabIndex={-1} ref={tituloRef}>
          {title}
        </h2>
        {children}
      </div>
    </>,
    destino,
  )
}
