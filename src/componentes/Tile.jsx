import Icon from './Icon.jsx'

/** Cuadro de color con un ícono: muestra el estado de un vistazo. color: blue | amber | green | red | dark */
export default function Tile({ color = 'blue', icon, size = 26 }) {
  return (
    <span className={'tile tile-' + color}>
      <Icon name={icon} size={size} />
    </span>
  )
}
