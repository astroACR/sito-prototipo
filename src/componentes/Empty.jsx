import Card from './Card.jsx'
import Icon from './Icon.jsx'

/** Mensaje para una lista vacía: qué pasa y qué va a aparecer aquí. */
export default function Empty({ icon = 'inbox', title, children }) {
  return (
    <Card className="empty">
      <Icon name={icon} size={36} />
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
    </Card>
  )
}
