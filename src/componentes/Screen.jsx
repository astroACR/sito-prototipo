/* Armazón de una pantalla: barra superior, zona con scroll y pie con la acción principal.
   Mantiene del prototipo la animación de entrada y el foco en el título al cambiar de pantalla. */

import { useEffect, useRef } from 'react'
import { useNavigationType } from 'react-router-dom'
import Icon from './Icon.jsx'
import { useNavegacion } from '../navegacion.js'

const ANIMACION = { PUSH: 'enter-fwd', POP: 'enter-back', REPLACE: 'enter-fade' }

export function Screen({ children }) {
  const tipo = useNavigationType()
  const ref = useRef(null)

  useEffect(() => {
    const titulo = ref.current?.querySelector('[data-focus]')
    if (!titulo) return
    try {
      titulo.focus({ preventScroll: true })
    } catch {
      titulo.focus()
    }
  }, [])

  return (
    <section className={'screen ' + (ANIMACION[tipo] ?? '')} ref={ref}>
      {children}
    </section>
  )
}

/** Barra con el logo y, a la derecha, dónde está la persona (obra, rol). */
export function TopBar({ children }) {
  return (
    <header className="top">
      <span className="brand">SITO</span>
      {children ? <div className="meta">{children}</div> : null}
    </header>
  )
}

/** Barra con el botón "Volver". Es el único botón de la app que va sin texto. */
export function BackBar({ title, onBack }) {
  const { volver } = useNavegacion()
  return (
    <header className="top" style={{ justifyContent: 'flex-start' }}>
      <button type="button" className="iconbtn" aria-label="Volver" onClick={onBack ?? volver}>
        <Icon name="back" />
      </button>
      {title ? <div className="htitle">{title}</div> : null}
    </header>
  )
}

export function Scroll({ children }) {
  return <div className="scroll">{children}</div>
}

/** Pie fijo: aquí va la acción principal, al alcance del pulgar. */
export function Foot({ children, withNav = false }) {
  return <footer className={'foot' + (withNav ? ' has-nav' : '')}>{children}</footer>
}

/** Título de la pantalla. Recibe el foco al entrar, para lectores de pantalla y teclado. */
export function Title({ children, hidden = false, style }) {
  const oculto = hidden
    ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }
    : null
  return (
    <h1 className="h1" tabIndex={-1} data-focus style={{ ...style, ...oculto }}>
      {children}
    </h1>
  )
}
