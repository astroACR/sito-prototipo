import Icon from './Icon.jsx'

/**
 * Recuadro de foto. Muestra la foto real o, si no hay, el mismo marcador gris del prototipo.
 * `pill` es la etiqueta de abajo ("17 nov · 10:42 · Piso 3").
 */
export default function Photo({ url, state = 'lista', alt, pill, emptyText = 'Sin foto', small = false }) {
  const conFoto = state === 'lista' && url
  return (
    <div className={'photo' + (small ? ' photo-sm' : '')} role="img" aria-label={conFoto ? alt : emptyText}>
      {conFoto ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <>
          <div className="grid" />
          <Icon name="image" size={48} />
          <p>{state === 'cargando' ? 'Cargando foto…' : emptyText}</p>
        </>
      )}
      {pill ? <span className="pill">{pill}</span> : null}
    </div>
  )
}

/** Miniatura cuadrada para listas. */
export function Thumb({ url }) {
  return (
    <div className="thumb" aria-hidden="true">
      {url ? <img src={url} alt="" draggable={false} /> : <Icon name="image" size={24} />}
    </div>
  )
}
