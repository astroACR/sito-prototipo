/** Fila de checklist: casilla grande con su texto, se marca tocando cualquier parte de la fila. */
export default function Checkbox({ checked, onChange, disabled = false, children, large = true, className = 'citem' }) {
  return (
    <label className={className}>
      <input
        type="checkbox"
        className={'cbx' + (large ? ' lg' : '')}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}
