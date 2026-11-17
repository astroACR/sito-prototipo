/* T2 · Detalle de tarea: checklist, nota de seguridad y, si corresponde, el motivo de la corrección.
   T5 · "Tengo un problema": panel con tres opciones y el enlace a riesgo de seguridad. */

import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Screen, BackBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button, { LinkButton } from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Chip from '../../componentes/Chip.jsx'
import Icon from '../../componentes/Icon.jsx'
import Steps from '../../componentes/Steps.jsx'
import Checkbox from '../../componentes/Checkbox.jsx'
import Sheet from '../../componentes/Sheet.jsx'
import Option from '../../componentes/Option.jsx'
import Photo from '../../componentes/Photo.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { useTarea, useBorrador, usePersonas, useFoto, guardarBorrador, reportarIncidente, useEstadoSincronizacion } from '../../datos/index.js'
import { puedeCerrar, vistaDeTarea, pasoActual, lugarCompleto } from '../../dominio/tareas.js'
import { TIPOS_PROBLEMA, etiquetaIncidente } from '../../dominio/incidentes.js'
import { hora, diaCorto, nombreCorto } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'
import { useCamara } from './usarCamara.js'

export default function DetalleTarea() {
  const { id } = useParams()
  const { tarea, evidencia, verificacion, problema, pendienteEnvio, cargando } = useTarea(id)
  const borrador = useBorrador(id)
  const personas = usePersonas()
  const { sinSenal } = useEstadoSincronizacion()
  const [panelProblema, setPanelProblema] = useState(false)
  const [tipoProblema, setTipoProblema] = useState(null)
  const [avisando, setAvisando] = useState(false)
  const toast = useToast()
  const { ir } = useNavegacion()

  const editable = !!tarea && puedeCerrar(tarea.estado) && !pendienteEnvio
  const fotoEnviada = useFoto(!editable && evidencia?.foto_path ? evidencia.id : null, evidencia?.foto_path)

  const camara = useCamara(async (foto) => {
    await guardarBorrador(id, { foto })
    ir('/tareas/' + id + '/foto')
  })

  if (cargando || borrador === undefined) return <Screen><BackBar /></Screen>
  if (!tarea) return <Navigate to="/" replace />

  const vista = vistaDeTarea(tarea, { pendienteEnvio })
  const checks = editable
    ? tarea.checklist.map((_, i) => !!borrador?.checks?.[i])
    : tarea.checklist.map((_, i) => evidencia?.checklist?.[i] ?? true)
  const marcadas = checks.filter(Boolean).length
  const creador = personas?.get(tarea.creada_por)
  const pidieronCorregir = tarea.estado === 'corregir' && verificacion?.resultado === 'corregir'

  function marcar(i, valor) {
    if (!editable) return
    const nuevas = [...checks]
    nuevas[i] = valor
    guardarBorrador(id, { checks: nuevas })
  }

  function tomarFoto() {
    if (!checks.every(Boolean)) {
      toast('Completa el checklist antes de terminar', 'warn')
      return
    }
    camara.abrir()
  }

  async function avisarProblema() {
    if (!tipoProblema) {
      toast('Elige qué problema tienes', 'warn')
      return
    }
    setAvisando(true)
    try {
      await reportarIncidente({ clase: 'problema', tipo: tipoProblema, tarea_id: tarea.id, lugar: tarea.lugar, sector: tarea.sector })
      setPanelProblema(false)
      setTipoProblema(null)
      toast(sinSenal ? 'Aviso guardado. Se enviará solo al volver la señal' : 'Aviso guardado. Tu supervisor lo verá', 'ok')
    } catch {
      toast('No se pudo guardar el aviso. Intenta de nuevo.', 'warn')
    } finally {
      setAvisando(false)
    }
  }

  return (
    <Screen>
      <BackBar />
      <Scroll>
        <Chip color={vista.color}>{vista.label}</Chip>
        <Title style={{ marginTop: 10 }}>{tarea.titulo}</Title>
        <p className="dmeta">
          {lugarCompleto(tarea)}
          {creador ? ' · Asignada por ' + nombreCorto(creador.nombre) + ', ' + hora(tarea.creada_at) : ''}
        </p>

        {pidieronCorregir ? (
          <div className="fix" role="note">
            <Icon name="alert" size={22} />
            <div>
              <b>Tu supervisor pidió corregir</b>
              {verificacion.motivos?.length ? (
                <ul>
                  {verificacion.motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}
              {verificacion.comentario ? <q>{verificacion.comentario}</q> : null}
            </div>
          </div>
        ) : null}

        <Steps labels={['Asignada', 'En curso', 'Verificada']} current={pasoActual(tarea.estado)} ariaLabel="Estado de la tarea" />

        <Card className="check">
          <h2>
            {editable ? 'Antes de terminar, revisa:' : 'Lo que revisaste:'}
            <span>
              {marcadas} de {tarea.checklist.length}
            </span>
          </h2>
          {tarea.checklist.map((punto, i) => (
            <Checkbox key={punto} checked={checks[i]} disabled={!editable} onChange={(v) => marcar(i, v)}>
              {punto}
            </Checkbox>
          ))}
        </Card>

        {tarea.seguridad ? (
          <div className="warn">
            <Icon name="hardhat" size={22} />
            <p>{tarea.seguridad}</p>
          </div>
        ) : null}

        {problema ? (
          <Card className="note">
            <span className="st-amber">
              <Icon name="alert" size={22} />
            </span>
            <p>
              <b>Avisaste: {etiquetaIncidente(problema).toLowerCase()}.</b>{' '}
              {problema.estado === 'en_atencion' ? 'Tu supervisor ya lo está viendo.' : 'Tu supervisor lo verá apenas le llegue.'}
            </p>
          </Card>
        ) : null}

        {pendienteEnvio ? (
          <Card className="note">
            <Icon name="refresh" size={22} />
            <p>
              Ya terminaste esta tarea. <b>Se enviará sola</b> {sinSenal ? 'al volver la señal.' : 'en un momento.'}
            </p>
          </Card>
        ) : tarea.estado === 'por_verificar' ? (
          <Card className="note">
            <span className="st-green">
              <Icon name="checkcircle" size={22} />
            </span>
            <p>Tarea enviada. Tu supervisor la va a revisar.</p>
          </Card>
        ) : tarea.estado === 'verificada' ? (
          <Card className="note">
            <span className="st-green">
              <Icon name="checkcircle" size={22} />
            </span>
            <p>Tarea verificada por tu supervisor.</p>
          </Card>
        ) : null}

        {!editable && evidencia?.foto_path ? (
          <div style={{ marginTop: 14 }}>
            <Photo
              small
              url={fotoEnviada.url}
              state={fotoEnviada.estado}
              alt={'Foto de la tarea terminada, ' + diaCorto(evidencia.tomada_at) + ', ' + hora(evidencia.tomada_at)}
              pill={diaCorto(evidencia.tomada_at) + ' · ' + hora(evidencia.tomada_at)}
              emptyText="La foto no está en este celular"
            />
          </div>
        ) : null}
      </Scroll>

      {editable ? (
        <Foot>
          <input {...camara.input} />
          <Button icon="camera" busy={camara.procesando} onClick={tomarFoto}>
            {camara.procesando ? 'Guardando foto…' : 'Tomar foto y terminar'}
          </Button>
          <Button variant="outline" onClick={() => setPanelProblema(true)}>
            Tengo un problema
          </Button>
        </Foot>
      ) : null}

      <Sheet open={panelProblema} onClose={() => setPanelProblema(false)} title="¿Qué problema tienes?">
        <p>Tu supervisor verá tu nombre para poder ayudarte.</p>
        <div className="opts" role="group" aria-label="Tipo de problema">
          {TIPOS_PROBLEMA.map((t) => (
            <Option key={t.id} icon={t.icon} title={t.label} selected={tipoProblema === t.id} onClick={() => setTipoProblema(t.id)} />
          ))}
        </div>
        <Button inactive={!tipoProblema} busy={avisando} onClick={avisarProblema}>
          Avisar a mi supervisor
        </Button>
        <LinkButton onClick={() => ir('/incidente?tarea=' + tarea.id)}>Es un riesgo de seguridad</LinkButton>
      </Sheet>
    </Screen>
  )
}
