/* S3 · Tareas de la obra: filtro por estado y por cuadrilla, y el botón "Nueva tarea". */

import { useSearchParams } from 'react-router-dom'
import { Screen, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import TaskCard from '../../componentes/TaskCard.jsx'
import Empty from '../../componentes/Empty.jsx'
import BottomNav from '../../componentes/BottomNav.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import { Pick } from '../../componentes/Chip.jsx'
import { useTareas, useCuadrillas, usePersonas } from '../../datos/index.js'
import { ordenarParaSupervisor, vistaDeTarea, lugarCompleto } from '../../dominio/tareas.js'
import { nombreCorto, fechaLocal, etiquetaDia } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'
import { SupervisorBar } from './comun.jsx'

const ESTADOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'por_verificar', label: 'Por verificar' },
  { id: 'asignada', label: 'Por hacer' },
  { id: 'corregir', label: 'Corregir' },
  { id: 'verificada', label: 'Verificadas' },
]

export default function Tareas() {
  const [parametros, setParametros] = useSearchParams()
  const estado = parametros.get('estado') ?? 'todas'
  const cuadrillaId = parametros.get('cuadrilla') ?? 'todas'
  const tareas = useTareas()
  const cuadrillas = useCuadrillas()
  const personas = usePersonas()
  const { ir } = useNavegacion()
  const hoy = fechaLocal()

  function filtrar(clave, valor) {
    const siguientes = new URLSearchParams(parametros)
    if (valor === 'todas') siguientes.delete(clave)
    else siguientes.set(clave, valor)
    setParametros(siguientes, { replace: true })
  }

  /* Se muestran las de hoy y todo lo que sigue abierto, aunque sea de días anteriores. */
  const visibles = ordenarParaSupervisor(
    (tareas ?? []).filter(
      (t) =>
        (t.fecha === hoy || t.estado !== 'verificada') &&
        (estado === 'todas' || t.estado === estado) &&
        (cuadrillaId === 'todas' || t.cuadrilla_id === cuadrillaId),
    ),
  )

  function detalle(t) {
    const quien = t.asignado_a ? personas?.get(t.asignado_a) : null
    const cuadrilla = (cuadrillas ?? []).find((c) => c.id === t.cuadrilla_id)
    const para = quien ? nombreCorto(quien.nombre) : cuadrilla ? cuadrilla.nombre + ' completa' : ''
    return t.fecha === hoy ? para : para + ' · ' + etiquetaDia(t.fecha, hoy)
  }

  return (
    <Screen>
      <SupervisorBar />
      <Scroll>
        <OfflineBanner />
        <Title style={{ marginTop: 4 }}>Tareas de la obra</Title>

        <div className="picks line" role="group" aria-label="Filtrar por estado" style={{ marginTop: 14 }}>
          {ESTADOS.map((e) => (
            <Pick key={e.id} selected={estado === e.id} onClick={() => filtrar('estado', e.id)}>
              {e.label}
            </Pick>
          ))}
        </div>
        <div className="picks line" role="group" aria-label="Filtrar por cuadrilla" style={{ marginTop: 4 }}>
          <Pick selected={cuadrillaId === 'todas'} onClick={() => filtrar('cuadrilla', 'todas')}>
            Todas las cuadrillas
          </Pick>
          {(cuadrillas ?? []).map((c) => (
            <Pick key={c.id} selected={cuadrillaId === c.id} onClick={() => filtrar('cuadrilla', c.id)}>
              {c.nombre} · {c.especialidad}
            </Pick>
          ))}
        </div>

        {tareas === undefined ? null : visibles.length === 0 ? (
          <div style={{ marginTop: 14 }}>
            <Empty icon="list" title="No hay tareas con este filtro">
              Prueba con otro estado o cuadrilla.
            </Empty>
          </div>
        ) : (
          <div className="tasks" style={{ marginTop: 12 }}>
            {visibles.map((t) => (
              <TaskCard
                key={t.id}
                title={t.titulo}
                place={lugarCompleto(t)}
                extra={detalle(t)}
                view={vistaDeTarea(t, { rol: 'supervisor' })}
                onClick={() => ir('/sup/verificar/' + t.id)}
              />
            ))}
          </div>
        )}
      </Scroll>
      <Foot withNav>
        <Button icon="plus" onClick={() => ir('/sup/nueva')}>
          Nueva tarea
        </Button>
        <BottomNav role="supervisor" active="/sup/tareas" />
      </Foot>
    </Screen>
  )
}
