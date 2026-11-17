/* Pestañas inferiores: como máximo tres por rol, siempre con ícono y texto. */

import Icon from './Icon.jsx'
import { useNavegacion, RAIZ } from '../navegacion.js'
import { useCola, useIncidentes, useTareas } from '../datos/index.js'

const PESTANAS = {
  trabajador: [
    { ruta: '/tareas', label: 'Tareas', icon: 'list' },
    { ruta: '/por-enviar', label: 'Por enviar', icon: 'upload', cuenta: 'cola' },
    { ruta: '/perfil', label: 'Mi perfil', icon: 'user' },
  ],
  supervisor: [
    { ruta: '/hoy', label: 'Hoy', icon: 'dashboard' },
    { ruta: '/sup/tareas', label: 'Tareas', icon: 'list', cuenta: 'verificar' },
    { ruta: '/sup/incidentes', label: 'Incidentes', icon: 'triangle', cuenta: 'incidentes' },
  ],
}

export default function BottomNav({ role, active }) {
  const { aPestana } = useNavegacion()
  const cola = useCola()
  const incidentes = useIncidentes()
  const tareas = useTareas()

  const cuentas = {
    cola: role === 'trabajador' ? cola.total : 0,
    verificar: role === 'supervisor' ? (tareas ?? []).filter((t) => t.estado === 'por_verificar').length : 0,
    incidentes: role === 'supervisor' ? (incidentes ?? []).filter((i) => i.estado === 'nuevo').length : 0,
  }

  return (
    <nav className="nav" aria-label="Secciones">
      {PESTANAS[role].map((p) => {
        const n = p.cuenta ? cuentas[p.cuenta] : 0
        return (
          <button
            key={p.ruta}
            type="button"
            aria-current={active === p.ruta ? 'page' : undefined}
            onClick={() => aPestana(p.ruta, { actual: active, raiz: RAIZ[role] })}
          >
            <Icon name={p.icon} size={24} />
            {n ? (
              <span className="badge" aria-hidden="true">
                {n}
              </span>
            ) : null}
            <span>
              {p.label}
              {n ? <span className="sr"> ({n})</span> : null}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
