/** Barra de avance verde. */
export default function ProgressBar({ value, max, label }) {
  const porcentaje = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <i style={{ width: porcentaje + '%' }} />
    </div>
  )
}
