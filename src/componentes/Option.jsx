import Icon from './Icon.jsx'
import Tile from './Tile.jsx'

/** Opción grande para elegir en vez de escribir: ícono, título, detalle y marca de selección. */
export default function Option({ icon, color = 'dark', title, description, selected, onClick, chevron = false }) {
  return (
    <button type="button" className="opt" aria-pressed={selected === undefined ? undefined : selected} onClick={onClick}>
      {icon ? <Tile color={color} icon={icon} /> : null}
      <span className="tx">
        <b>{title}</b>
        {description ? <span>{description}</span> : null}
      </span>
      {selected ? (
        <span className="st-green">
          <Icon name="checkcircle" size={26} />
        </span>
      ) : chevron ? (
        <span className="chev">
          <Icon name="chevron" size={22} />
        </span>
      ) : null}
    </button>
  )
}
