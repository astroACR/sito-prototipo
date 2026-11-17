/* S1 · Hoy: indicadores de la jornada, alertas de incidentes en vivo, tareas por verificar y avance por cuadrilla. */

import { useState } from 'react'
import { Screen, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Card from '../../componentes/Card.jsx'
import Icon from '../../componentes/Icon.jsx'
import Button from '../../componentes/Button.jsx'
import ProgressBar from '../../componentes/ProgressBar.jsx'
import BottomNav from '../../componentes/BottomNav.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import { Thumb } from '../../componentes/Photo.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { useTareas, useIncidentes, useCuadrillas, usePersonas, useUltimasEvidencias, useFoto, useAhora, atenderIncidente } from '../../datos/index.js'
import { resumenDelDia, avancePorCuadrilla, nombreCuadrilla, ordenarParaSupervisor, lugarCompleto } from '../../dominio/tareas.js'
import { etiquetaIncidente, VISTA_ESTADO_INCIDENTE } from '../../dominio/incidentes.js'
import { haceCuanto, hora, nombreCorto, fechaLocal } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'
import { SupervisorBar, mensajeDeError } from './comun.jsx'

function quienReporta(incidente, personas) {
  if (incidente.anonimo) return 'Anónimo'
  const p = personas?.get(incidente.reportero_id)
  return p ? nombreCorto(p.nombre) : 'Trabajador'
}

/** Alerta roja (riesgo) o ámbar (problema de una tarea) con el botón "Atender". */
export function AlertaIncidente({ incidente, personas, ahora }) {
  const [atendiendo, setAtendiendo] = useState(false)
  const toast = useToast()
  const { ir } = useNavegacion()
  const esRiesgo = incidente.clase === 'riesgo'

  async function atender() {
    setAtendiendo(true)
    try {
      await atenderIncidente(incidente.id)
      toast('Incidente en atención', 'ok')
    } catch (e) {
      toast(mensajeDeError(e), 'warn')
    } finally {
      setAtendiendo(false)
    }
  }

  return (
    <div className={'alert' + (esRiesgo ? '' : ' amber')} role={esRiesgo ? 'alert' : 'status'}>
      <Icon name={esRiesgo ? 'triangle' : 'alert'} size={26} />
      <button type="button" className="tx" onClick={() => ir('/sup/incidentes/' + incidente.id)}>
        <b>
          {etiquetaIncidente(incidente)}
          {incidente.lugar ? ' · ' + incidente.lugar : ''}
        </b>
        {quienReporta(incidente, personas)} · {haceCuanto(incidente.ocurrido_at, ahora)}
      </button>
      {incidente.estado === 'nuevo' ? (
        <button type="button" className="act" aria-busy={atendiendo || undefined} onClick={() => !atendiendo && atender()}>
          {atendiendo ? '…' : 'Atender'}
        </button>
      ) : (
        <span className={'chip ' + VISTA_ESTADO_INCIDENTE[incidente.estado].chip}>{VISTA_ESTADO_INCIDENTE[incidente.estado].label}</span>
      )}
    </div>
  )
}

function FilaPorVerificar({ tarea, evidencia, persona, onClick }) {
  const foto = useFoto(evidencia?.foto_path ? evidencia.id : null, evidencia?.foto_path)
  return (
    <button type="button" className="card vrow" onClick={onClick} aria-label={'Revisar ' + tarea.titulo}>
      <Thumb url={foto.url} />
      <div className="tx">
        <div className="tt">{tarea.titulo}</div>
        <div className="tl">
          {persona ? nombreCorto(persona.nombre) + ' · ' : ''}
          {hora(tarea.cerrada_at)} · {lugarCompleto(tarea)}
        </div>
      </div>
      <span className="chev">
        <Icon name="chevron" size={22} />
      </span>
    </button>
  )
}

export default function Hoy() {
  const tareas = useTareas()
  const incidentes = useIncidentes()
  const cuadrillas = useCuadrillas()
  const personas = usePersonas()
  const evidencias = useUltimasEvidencias()
  const ahora = useAhora()
  const { ir } = useNavegacion()

  const hoy = fechaLocal(ahora)
  const lista = tareas ?? []
  const resumen = resumenDelDia(lista, hoy)
  const abiertos = (incidentes ?? []).filter((i) => i.estado !== 'cerrado')
  const alertas = abiertos.slice(0, 3)
  const porVerificar = ordenarParaSupervisor(lista.filter((t) => t.estado === 'por_verificar')).slice(0, 4)
  const avance = avancePorCuadrilla(lista, cuadrillas ?? [], hoy)

  return (
    <Screen>
      <SupervisorBar />
      <Scroll>
        <OfflineBanner />
        <Title style={{ marginTop: 4 }}>Avance de hoy</Title>

        <div className="kpis">
          <Card className="kpi">
            <b>
              {resumen.cerradas}/{resumen.total}
            </b>
            <span>Tareas cerradas</span>
          </Card>
          <Card className="kpi amber">
            <b>{resumen.porVerificar}</b>
            <span>Por verificar</span>
          </Card>
          <Card className="kpi red">
            <b>{abiertos.length}</b>
            <span>{abiertos.length === 1 ? 'Incidente' : 'Incidentes'}</span>
          </Card>
        </div>

        {alertas.length ? (
          <div className="alerts">
            {alertas.map((i) => (
              <AlertaIncidente key={i.id} incidente={i} personas={personas} ahora={ahora} />
            ))}
          </div>
        ) : null}

        <h2 className="section-t">Por verificar</h2>
        {porVerificar.length ? (
          porVerificar.map((t) => (
            <FilaPorVerificar
              key={t.id}
              tarea={t}
              evidencia={evidencias?.get(t.id)}
              persona={personas?.get(t.cerrada_por)}
              onClick={() => ir('/sup/verificar/' + t.id)}
            />
          ))
        ) : (
          <p className="small">No hay tareas esperando tu revisión.</p>
        )}
        {resumen.porVerificar > porVerificar.length ? (
          <button type="button" className="link" onClick={() => ir('/sup/tareas?estado=por_verificar')}>
            Ver las {resumen.porVerificar} por verificar
          </button>
        ) : null}

        <h2 className="section-t">Avance por cuadrilla</h2>
        <Card className="crew">
          {avance.map((a) => (
            <div className="crow" key={a.cuadrilla.id}>
              <div className="lbl">
                <span>{nombreCuadrilla(a.cuadrilla)}</span>
                <b>{a.total ? a.porcentaje + '%' : 'Sin tareas'}</b>
              </div>
              <ProgressBar value={a.porcentaje} max={100} label={nombreCuadrilla(a.cuadrilla)} />
            </div>
          ))}
        </Card>
      </Scroll>
      <Foot withNav>
        <Button icon="plus" onClick={() => ir('/sup/nueva')}>
          Nueva tarea
        </Button>
        <BottomNav role="supervisor" active="/hoy" />
      </Foot>
    </Screen>
  )
}
