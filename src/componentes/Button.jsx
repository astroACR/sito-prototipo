import Icon from './Icon.jsx'

/**
 * Botón grande (60 px de alto). Una pantalla tiene un solo botón "primary" o "danger".
 *
 * `inactive` lo muestra apagado pero deja tocarlo: así se puede explicar con un aviso
 * qué falta para continuar, en vez de un botón que no responde.
 */
export default function Button({ variant = 'primary', icon, inactive = false, busy = false, className = '', children, onClick, ...resto }) {
  const clases = ['btn', 'btn-' + variant, className].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={clases}
      aria-disabled={inactive || busy ? 'true' : undefined}
      aria-busy={busy ? 'true' : undefined}
      onClick={(e) => {
        if (busy) return
        onClick?.(e)
      }}
      {...resto}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}

/** Acción secundaria con aspecto de enlace (44 px de alto). */
export function LinkButton({ children, onClick, ...resto }) {
  return (
    <button type="button" className="link" onClick={onClick} {...resto}>
      {children}
    </button>
  )
}
