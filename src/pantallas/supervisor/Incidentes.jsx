/* S5 · Incidentes: lista de la obra y detalle con "Atender" y "Cerrar".
   Un incidente anónimo nunca muestra quién lo envió. */

import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Screen, BackBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Chip, { Pick } from '../../componentes/Chip.jsx'
import Icon from '../../componentes/Icon.jsx'
import Photo from '../../componentes/Photo.jsx'
import Empty from '../../componentes/Empty.jsx'
import BottomNav from '../../componentes/BottomNav.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { useIncidentes, useIncidente, usePersonas, useTareas, useFoto, useAhora, atenderIncidente, cerrarIncidente } from '../../datos/index.js'
import { etiquetaIncidente, tipoDeIncidente, VISTA_ESTADO_INCIDENTE } from '../../dominio/incidentes.js'
import { lugarCompleto } from '../../dominio/tareas.js'
import { haceCuanto, hora, diaCorto, nombreCorto } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'
import { SupervisorBar, mensajeDeError } from './comun.jsx'

const FILTROS = [
  { id: 'abiertos', label: 'Abiertos' },
  { id: 'cerrado', label: 'Cerrados' },
]

function quien(incidente, personas) {
  if (incidente.anonimo) return 'Anónimo'
  const p = personas?.get(incidente.reportero_id)
  return p ? nombreCorto(p.nombre) : 'Trabajador'
}

export function ListaIncidentes() {
  const incidentes = useIncidentes()
  const personas = usePersonas()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState('abiertos')
  const { ir } = useNavegacion()

  const visibles = (incidentes ?? []).filter((i) => (filtro === 'abiertos' ? i.estado !== 'cerrado' : i.estado === 'cerrado'))

  return (
    <Screen>
      <SupervisorBar />
      <Scroll>
        <OfflineBanner />
        <Title style={{ marginTop: 4 }}>Incidentes</Title>
        <div className="picks" role="group" aria-label="Filtrar incidentes" style={{ marginTop: 14 }}>
          {FILTROS.map((f) => (
            <Pick key={f.id} selected={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.label}
            </Pick>
          ))}
        </div>

        {incidentes === undefined ? null : visibles.length === 0 ? (
          <div style={{ marginTop: 14 }}>
            <Empty icon="checkcircle" title={filtro === 'abiertos' ? 'No hay incidentes abiertos' : 'No hay incidentes cerrados'}>
              {filtro === 'abiertos' ? 'Cuando alguien reporte un riesgo o un problema, aparecerá aquí al instante.' : null}
            </Empty>
          </div>
        ) : (
          <div className="tasks" style={{ marginTop: 12 }}>
            {visibles.map((i) => {
              const tipo = tipoDeIncidente(i)
              const estado = VISTA_ESTADO_INCIDENTE[i.estado]
              const color = i.estado === 'cerrado' ? 'green' : i.clase === 'riesgo' ? 'red' : 'amber'
              return (
                <button
                  key={i.id}
                  type="button"
                  className="task"
                  onClick={() => ir('/sup/incidentes/' + i.id)}
                  aria-label={[tipo.label, lugarCompleto(i), quien(i, personas), haceCuanto(i.ocurrido_at, ahora), estado.label].join('. ')}
                >
                  <span className={'tile tile-' + color}>
                    <Icon name={i.clase === 'riesgo' ? 'triangle' : tipo.icon} size={26} />
                  </span>
                  <span className="tx">
                    <span className="tt blk">{tipo.label}</span>
                    <span className="tl blk">{lugarCompleto(i) || 'Sin lugar'}</span>
                    <span className="tl blk">
                      {quien(i, personas)} · {haceCuanto(i.ocurrido_at, ahora)}
                    </span>
                    <span className={'ts blk st-' + (color === 'red' ? 'red' : color)}>{estado.label}</span>
                  </span>
                  <span className="chev">
                    <Icon name="chevron" size={22} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Scroll>
      <Foot withNav>
        <BottomNav role="supervisor" active="/sup/incidentes" />
      </Foot>
    </Screen>
  )
}

export function DetalleIncidente() {
  const { id } = useParams()
  const { incidente, cargando } = useIncidente(id)
  const personas = usePersonas()
  const tareas = useTareas()
  const ahora = useAhora()
  const foto = useFoto(incidente?.foto_path ? incidente.id : null, incidente?.foto_path)
  const [guardando, setGuardando] = useState(null)
  const toast = useToast()
  const { ir } = useNavegacion()

  if (cargando) return <Screen><BackBar /></Screen>
  if (!incidente) return <Navigate to="/sup/incidentes" replace />

  const estado = VISTA_ESTADO_INCIDENTE[incidente.estado]
  const tarea = incidente.tarea_id ? (tareas ?? []).find((t) => t.id === incidente.tarea_id) : null
  const atendio = incidente.atendido_por ? personas?.get(incidente.atendido_por) : null

  async function hacer(accion) {
    setGuardando(accion)
    try {
      if (accion === 'atender') {
        await atenderIncidente(incidente.id)
        toast('Incidente en atención', 'ok')
      } else {
        await cerrarIncidente(incidente.id)
        toast('Incidente cerrado', 'ok')
      }
    } catch (e) {
      toast(mensajeDeError(e), 'warn')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <Screen>
      <BackBar />
      <Scroll>
        <OfflineBanner />
        <Chip color={estado.chip.replace('chip-', '')}>{estado.label}</Chip>
        <Title style={{ marginTop: 10 }}>{etiquetaIncidente(incidente)}</Title>
        <p className="dmeta">{incidente.clase === 'riesgo' ? 'Riesgo de seguridad' : 'Problema para hacer una tarea'}</p>

        <Card className="rows" style={{ marginTop: 16 }}>
          <div className="row">
            <span>Lugar</span>
            <b>{lugarCompleto(incidente) || '—'}</b>
          </div>
          <div className="row">
            <span>Reportado</span>
            <b>
              {haceCuanto(incidente.ocurrido_at, ahora)} · {diaCorto(incidente.ocurrido_at)} {hora(incidente.ocurrido_at)}
            </b>
          </div>
          <div className="row">
            <span>Por</span>
            <b>{incidente.anonimo ? 'Anónimo' : (personas?.get(incidente.reportero_id)?.nombre ?? 'Trabajador')}</b>
          </div>
          {atendio ? (
            <div className="row">
              <span>Atendido por</span>
              <b>
                {nombreCorto(atendio.nombre)} · {hora(incidente.atendido_at)}
              </b>
            </div>
          ) : null}
        </Card>

        {incidente.anonimo ? (
          <Card className="note">
            <Icon name="eyeoff" size={22} />
            <p>Reporte anónimo: SITO no guarda quién lo envió.</p>
          </Card>
        ) : null}

        {tarea ? (
          <button type="button" className="rowbtn" onClick={() => ir('/sup/verificar/' + tarea.id)}>
            <Icon name="wrench" />
            <span className="tx">
              <span className="small blk" style={{ fontWeight: 600 }}>
                Tarea
              </span>
              {tarea.titulo}
            </span>
            <span className="chev">
              <Icon name="chevron" size={22} />
            </span>
          </button>
        ) : null}

        {incidente.nota ? (
          <Card className="note">
            <Icon name="filetext" size={22} />
            <p>{incidente.nota}</p>
          </Card>
        ) : null}

        {incidente.foto_path ? (
          <div style={{ marginTop: 14 }}>
            <Photo small url={foto.url} state={foto.estado} alt={'Foto del incidente: ' + etiquetaIncidente(incidente)} emptyText="No se pudo cargar la foto" />
          </div>
        ) : null}
      </Scroll>

      {incidente.estado !== 'cerrado' ? (
        <Foot>
          {incidente.estado === 'nuevo' ? (
            <>
              <Button variant="danger" icon="hardhat" busy={guardando === 'atender'} onClick={() => hacer('atender')}>
                Atender
              </Button>
              <Button variant="outline" icon="check" busy={guardando === 'cerrar'} onClick={() => hacer('cerrar')}>
                Cerrar, ya está resuelto
              </Button>
            </>
          ) : (
            <Button icon="check" busy={guardando === 'cerrar'} onClick={() => hacer('cerrar')}>
              Cerrar, ya está resuelto
            </Button>
          )}
        </Foot>
      ) : null}
    </Screen>
  )
}
