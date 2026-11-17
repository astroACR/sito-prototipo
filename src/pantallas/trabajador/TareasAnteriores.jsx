/* T8 · Tareas anteriores: lo terminado en jornadas pasadas, agrupado por día. */

import { Screen, BackBar, Scroll, Title } from '../../componentes/Screen.jsx'
import TaskCard from '../../componentes/TaskCard.jsx'
import Empty from '../../componentes/Empty.jsx'
import { usePerfil, useTareas, useTareasPendientesDeEnvio } from '../../datos/index.js'
import { esDelTrabajador, esDeHoy, vistaDeTarea, lugarCompleto } from '../../dominio/tareas.js'
import { etiquetaDia } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'

export default function TareasAnteriores() {
  const perfil = usePerfil()
  const tareas = useTareas()
  const pendientes = useTareasPendientesDeEnvio()
  const { ir } = useNavegacion()

  const anteriores = (tareas ?? [])
    .filter((t) => esDelTrabajador(t, perfil) && !esDeHoy(t))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.cerrada_at).localeCompare(String(a.cerrada_at)))

  const dias = []
  for (const t of anteriores) {
    const ultimo = dias[dias.length - 1]
    if (ultimo && ultimo.fecha === t.fecha) ultimo.tareas.push(t)
    else dias.push({ fecha: t.fecha, tareas: [t] })
  }

  return (
    <Screen>
      <BackBar />
      <Scroll>
        <Title>Tareas anteriores</Title>
        <p className="sub">Lo que terminaste en los últimos días.</p>

        {tareas === undefined ? null : dias.length === 0 ? (
          <div style={{ marginTop: 18 }}>
            <Empty icon="clock" title="Aún no hay tareas anteriores">
              Aquí vas a ver lo que termines, desde mañana.
            </Empty>
          </div>
        ) : (
          dias.map((dia) => (
            <section key={dia.fecha} aria-label={etiquetaDia(dia.fecha)}>
              <h2 className="day">{etiquetaDia(dia.fecha)}</h2>
              <div className="tasks" style={{ marginTop: 0 }}>
                {dia.tareas.map((t) => (
                  <TaskCard
                    key={t.id}
                    title={t.titulo}
                    place={lugarCompleto(t)}
                    view={vistaDeTarea(t, { pendienteEnvio: pendientes.has(t.id) })}
                    onClick={() => ir('/tareas/' + t.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </Scroll>
    </Screen>
  )
}
