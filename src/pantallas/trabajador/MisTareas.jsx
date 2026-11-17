/* T1 · Mis tareas de hoy. Lo que hay que corregir aparece primero. */

import { Screen, TopBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button, { LinkButton } from '../../componentes/Button.jsx'
import TaskCard from '../../componentes/TaskCard.jsx'
import BottomNav from '../../componentes/BottomNav.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import ProgressBar from '../../componentes/ProgressBar.jsx'
import Empty from '../../componentes/Empty.jsx'
import { usePerfil, useTareas, useObra, useCuadrillas, useTareasPendientesDeEnvio } from '../../datos/index.js'
import { esDelTrabajador, esDeHoy, estaAbierta, ordenarParaTrabajador, vistaDeTarea, lugarCompleto, nombreCuadrilla } from '../../dominio/tareas.js'
import { primerNombre } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'

export default function MisTareas() {
  const perfil = usePerfil()
  const tareas = useTareas()
  const obra = useObra()
  const cuadrillas = useCuadrillas()
  const pendientes = useTareasPendientesDeEnvio()
  const { ir } = useNavegacion()

  const mias = (tareas ?? []).filter((t) => esDelTrabajador(t, perfil))
  const hoy = ordenarParaTrabajador(mias.filter((t) => esDeHoy(t)))
  const hechas = hoy.filter((t) => !estaAbierta(t)).length
  const hayAnteriores = mias.length > hoy.length
  const cuadrilla = (cuadrillas ?? []).find((c) => c.id === perfil.cuadrilla_id)

  return (
    <Screen>
      <TopBar>
        {obra ? (
          <>
            Obra <b>{obra.nombre}</b>
          </>
        ) : null}
      </TopBar>
      <Scroll>
        <OfflineBanner />
        <p className="hello">Hola, {primerNombre(perfil.nombre)}</p>
        <Title>Tus tareas de hoy</Title>

        {tareas === undefined ? null : hoy.length === 0 ? (
          <div style={{ marginTop: 18 }}>
            <Empty icon="list" title="No tienes tareas para hoy">
              Cuando tu supervisor te asigne una, aparecerá aquí.
            </Empty>
          </div>
        ) : (
          <>
            <div className="progress">
              <ProgressBar value={hechas} max={hoy.length} label="Tareas completadas" />
              <div className="prow">
                <span>
                  <b>
                    {hechas} de {hoy.length}
                  </b>{' '}
                  completadas
                </span>
                <span>{nombreCuadrilla(cuadrilla)}</span>
              </div>
            </div>
            <div className="tasks">
              {hoy.map((t) => (
                <TaskCard
                  key={t.id}
                  title={t.titulo}
                  place={lugarCompleto(t)}
                  view={vistaDeTarea(t, { pendienteEnvio: pendientes.has(t.id) })}
                  onClick={() => ir('/tareas/' + t.id)}
                />
              ))}
            </div>
          </>
        )}

        {hayAnteriores ? <LinkButton onClick={() => ir('/anteriores')}>Ver tareas anteriores</LinkButton> : null}
      </Scroll>
      <Foot withNav>
        <Button variant="danger" icon="triangle" onClick={() => ir('/incidente')}>
          Reportar incidente
        </Button>
        <BottomNav role="trabajador" active="/tareas" />
      </Foot>
    </Screen>
  )
}
