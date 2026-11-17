import Icon from './Icon.jsx'

/** Etiqueta de estado. color: blue | amber | green | red */
export default function Chip({ color = 'blue', icon, children }) {
  return (
    <span className={'chip chip-' + color}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </span>
  )
}

/** Opción que se elige tocándola (filtros, motivos, lugares). */
export function Pick({ selected = false, icon, children, onClick }) {
  return (
    <button type="button" className="pick" aria-pressed={selected} onClick={onClick}>
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  )
}
