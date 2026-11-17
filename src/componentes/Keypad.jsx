import Icon from './Icon.jsx'

/**
 * Teclado numérico grande en pantalla, para escribir el RUT y la clave sin abrir el teclado del celular.
 * `extraKey` agrega una tecla más (la K del RUT).
 */
export default function Keypad({ onKey, onErase, extraKey = null }) {
  const tecla = (valor) => (
    <button key={valor} type="button" className="key" onClick={() => onKey(valor)} aria-label={valor === 'K' ? 'Letra K' : valor}>
      {valor}
    </button>
  )
  return (
    <div className="pad" role="group" aria-label="Teclado numérico">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(tecla)}
      {extraKey ? tecla(extraKey) : <span aria-hidden="true" />}
      {tecla('0')}
      <button type="button" className="key aux" onClick={onErase}>
        <Icon name="erase" size={24} />
        <span>Borrar</span>
      </button>
    </div>
  )
}
