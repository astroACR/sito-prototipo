import Icon from './Icon.jsx'

/**
 * Pasos numerados. `current` es el índice (desde 0) del paso en curso;
 * los anteriores se muestran completos.
 */
export default function Steps({ labels, current, ariaLabel }) {
  return (
    <ol className="steps" aria-label={ariaLabel}>
      {labels.map((label, i) => {
        const clase = i < current ? 'done' : i === current ? 'cur' : ''
        return (
          <li key={label} className={clase} aria-current={i === current ? 'step' : undefined}>
            <span className="dot">{i < current ? <Icon name="check" size={18} /> : i + 1}</span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}
