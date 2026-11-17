/** Tarjeta blanca con borde, la superficie base de la app. */
export default function Card({ as: Etiqueta = 'div', className = '', children, ...resto }) {
  return (
    <Etiqueta className={('card ' + className).trim()} {...resto}>
      {children}
    </Etiqueta>
  )
}
