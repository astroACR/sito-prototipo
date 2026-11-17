/* S4 · Nueva tarea en tres pasos: plantilla → cuadrilla o persona → lugar → Asignar.
   Todo se elige tocando; solo el sector (eje, depto) es un texto opcional. */

import { useState } from 'react'
import { Screen, BackBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Steps from '../../componentes/Steps.jsx'
import Option from '../../componentes/Option.jsx'
import Empty from '../../componentes/Empty.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import { Pick } from '../../componentes/Chip.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { usePlantillas, useCuadrillas, usePersonas, useObra, crearTarea } from '../../datos/index.js'
import { nombreCuadrilla } from '../../dominio/tareas.js'
import { useNavegacion } from '../../navegacion.js'
import { mensajeDeError } from './comun.jsx'

const PASOS = ['Tarea', 'Quién', 'Dónde']

export default function NuevaTarea() {
  const plantillas = usePlantillas()
  const cuadrillas = useCuadrillas()
  const personas = usePersonas()
  const obra = useObra()
  const [paso, setPaso] = useState(0)
  const [plantilla, setPlantilla] = useState(null)
  const [cuadrillaId, setCuadrillaId] = useState(null)
  const [personaId, setPersonaId] = useState(null)
  const [lugar, setLugar] = useState(null)
  const [sector, setSector] = useState('')
  const [guardando, setGuardando] = useState(false)
  const toast = useToast()
  const { volver, alInicio } = useNavegacion()

  const integrantes = [...(personas?.values() ?? [])]
    .filter((p) => p.rol === 'trabajador' && p.cuadrilla_id === cuadrillaId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
  const cuadrilla = (cuadrillas ?? []).find((c) => c.id === cuadrillaId)
  const persona = personaId ? personas?.get(personaId) : null

  function elegirPlantilla(p) {
    setPlantilla(p)
    setPaso(1)
  }

  function siguiente() {
    if (paso === 1 && !cuadrillaId) {
      toast('Elige una cuadrilla', 'warn')
      return
    }
    setPaso(paso + 1)
  }

  async function asignar() {
    if (!lugar) {
      toast('Elige dónde se hace la tarea', 'warn')
      return
    }
    setGuardando(true)
    try {
      await crearTarea({ plantilla, cuadrillaId, asignadoA: personaId, lugar, sector })
      alInicio()
      toast('Tarea asignada', 'ok')
    } catch (e) {
      setGuardando(false)
      toast(mensajeDeError(e), 'warn')
    }
  }

  const atras = () => (paso === 0 ? volver() : setPaso(paso - 1))

  return (
    <Screen key={paso}>
      <BackBar title="Nueva tarea" onBack={atras} />
      <Scroll>
        <OfflineBanner />
        <Steps labels={PASOS} current={paso} ariaLabel="Pasos para asignar" />

        {paso === 0 ? (
          <>
            <Title style={{ marginTop: 14 }}>¿Qué hay que hacer?</Title>
            <p className="sub">Elige una tarea tipo. Ya trae su checklist y su aviso de seguridad.</p>
            <div className="opts" style={{ marginTop: 16 }}>
              {plantillas === undefined ? null : plantillas.length === 0 ? (
                <Empty icon="list" title="No hay tareas tipo">
                  Pide que agreguen tareas tipo para esta obra.
                </Empty>
              ) : (
                plantillas.map((p) => (
                  <Option
                    key={p.id}
                    icon="wrench"
                    color="blue"
                    title={p.titulo}
                    description={p.checklist.length + ' puntos de checklist'}
                    selected={plantilla?.id === p.id}
                    chevron
                    onClick={() => elegirPlantilla(p)}
                  />
                ))
              )}
            </div>
          </>
        ) : null}

        {paso === 1 ? (
          <>
            <Title style={{ marginTop: 14 }}>¿Quién la hace?</Title>
            <p className="sub">{plantilla.titulo}</p>
            <h2 className="label">Cuadrilla</h2>
            <div className="opts">
              {(cuadrillas ?? []).map((c) => (
                <Option
                  key={c.id}
                  icon="users"
                  title={nombreCuadrilla(c)}
                  selected={cuadrillaId === c.id}
                  onClick={() => {
                    setCuadrillaId(c.id)
                    setPersonaId(null)
                  }}
                />
              ))}
            </div>
            {cuadrillaId ? (
              <>
                <h2 className="label">
                  Persona <small>(si no eliges, es para toda la cuadrilla)</small>
                </h2>
                <div className="picks" role="group" aria-label="Persona">
                  <Pick selected={!personaId} onClick={() => setPersonaId(null)} icon="users">
                    Toda la cuadrilla
                  </Pick>
                  {integrantes.map((p) => (
                    <Pick key={p.id} selected={personaId === p.id} onClick={() => setPersonaId(p.id)} icon="user">
                      {p.nombre}
                    </Pick>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <Title style={{ marginTop: 14 }}>¿Dónde?</Title>
            <p className="sub">{plantilla.titulo}</p>
            <div className="picks" role="group" aria-label="Lugar" style={{ marginTop: 16 }}>
              {(obra?.lugares ?? []).map((l) => (
                <Pick key={l} selected={lugar === l} onClick={() => setLugar(l)} icon="pin">
                  {l}
                </Pick>
              ))}
            </div>
            <label className="label" htmlFor="sector">
              Eje o sector <small>(opcional)</small>
            </label>
            <input id="sector" className="inp" maxLength={40} placeholder="Ej: Eje B-C" value={sector} onChange={(e) => setSector(e.target.value)} />

            <Card className="rows" style={{ marginTop: 18 }}>
              <div className="row">
                <span>Tarea</span>
                <b>{plantilla.titulo}</b>
              </div>
              <div className="row">
                <span>Para</span>
                <b>{persona ? persona.nombre : nombreCuadrilla(cuadrilla) + ' (toda)'}</b>
              </div>
              <div className="row">
                <span>Lugar</span>
                <b>{[lugar, sector.trim()].filter(Boolean).join(' · ') || 'Falta elegir'}</b>
              </div>
            </Card>
          </>
        ) : null}
      </Scroll>

      {paso === 1 ? (
        <Foot>
          <Button inactive={!cuadrillaId} onClick={siguiente}>
            Siguiente
          </Button>
        </Foot>
      ) : null}
      {paso === 2 ? (
        <Foot>
          <Button icon="check" inactive={!lugar} busy={guardando} onClick={asignar}>
            Asignar tarea
          </Button>
        </Foot>
      ) : null}
    </Screen>
  )
}
