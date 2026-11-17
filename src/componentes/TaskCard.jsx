import Icon from './Icon.jsx'
import Tile from './Tile.jsx'

/**
 * Fila de una tarea: ícono de estado, título, lugar y estado en palabras.
 * `view` viene de vistaDeTarea() en src/dominio/tareas.js.
 */
export default function TaskCard({ title, place, view, extra, onClick }) {
  const leido = [title, place, extra, view.label].filter(Boolean).join('. ')
  return (
    <button type="button" className="task" onClick={onClick} aria-label={leido}>
      <Tile color={view.color} icon={view.icon} />
      <span className="tx">
        <span className="tt blk">{title}</span>
        {place ? <span className="tl blk">{place}</span> : null}
        {extra ? <span className="tl blk">{extra}</span> : null}
        <span className={'ts blk ' + view.txt}>{view.label}</span>
      </span>
      <span className="chev">
        <Icon name="chevron" size={22} />
      </span>
    </button>
  )
}
