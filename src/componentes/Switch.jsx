/** Fila con interruptor: título, explicación y el estado a la derecha. */
export default function Switch({ checked, onChange, title, description }) {
  return (
    <button type="button" className="switchrow" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="tx">
        <b>{title}</b>
        {description ? <span>{description}</span> : null}
      </span>
      <span className="sw" aria-hidden="true" />
    </button>
  )
}
