/* S2 · Verificar: foto grande y checklist. "Aprobar" o "Pedir corrección" con motivos rápidos. */

import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Screen, BackBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Chip, { Pick } from '../../componentes/Chip.jsx'
import Icon from '../../componentes/Icon.jsx'
import Photo from '../../componentes/Photo.jsx'
import Sheet from '../../componentes/Sheet.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { useTarea, usePersonas, useCuadrillas, useFoto, verificarTarea } from '../../datos/index.js'
import { MOTIVOS_CORRECCION, vistaDeTarea, lugarCompleto, nombreCuadrilla, puedeVerificar } from '../../dominio/tareas.js'
import { hora, diaCorto, nombreCorto } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'
import { mensajeDeError } from './comun.jsx'

export default function Verificar() {
  const { id } = useParams()
  const { tarea, evidencia, verificacion, cargando } = useTarea(id)
  const personas = usePersonas()
  const cuadrillas = useCuadrillas()
  const foto = useFoto(evidencia?.foto_path ? evidencia.id : null, evidencia?.foto_path)
  const [panel, setPanel] = useState(false)
  const [motivos, setMotivos] = useState([])
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(null)
  const toast = useToast()
  const { volver } = useNavegacion()

  if (cargando) return <Screen><BackBar /></Screen>
  if (!tarea) return <Navigate to="/" replace />

  const vista = vistaDeTarea(tarea, { rol: 'supervisor' })
  const autor = personas?.get(tarea.cerrada_por ?? evidencia?.autor_id)
  const cuadrilla = (cuadrillas ?? []).find((c) => c.id === tarea.cuadrilla_id)
  const pendiente = puedeVerificar(tarea.estado)

  function alternar(m) {
    setMotivos((lista) => (lista.includes(m) ? lista.filter((x) => x !== m) : [...lista, m]))
  }

  async function decidir(resultado) {
    if (resultado === 'corregir' && motivos.length === 0) {
      toast('Elige al menos un motivo', 'warn')
      return
    }
    setGuardando(resultado)
    try {
      await verificarTarea({ tarea, resultado, motivos: resultado === 'corregir' ? motivos : [], comentario: resultado === 'corregir' ? comentario : null })
      setPanel(false)
      volver()
      toast(resultado === 'aprobada' ? 'Tarea verificada' : 'Corrección pedida. Le llegará al trabajador', 'ok')
    } catch (e) {
      setGuardando(null)
      toast(mensajeDeError(e), 'warn')
    }
  }

  return (
    <Screen>
      <BackBar title={tarea.titulo} />
      <Scroll>
        <OfflineBanner />
        <Chip color={vista.color}>{vista.label}</Chip>
        <Title style={{ marginTop: 10 }}>{tarea.titulo}</Title>
        <p className="dmeta">
          {lugarCompleto(tarea)} · {nombreCuadrilla(cuadrilla)}
        </p>

        <div style={{ marginTop: 14 }}>
          <Photo
            url={foto.url}
            state={foto.estado}
            alt={'Foto de ' + tarea.titulo}
            pill={evidencia ? diaCorto(evidencia.tomada_at) + ' · ' + hora(evidencia.tomada_at) + (autor ? ' · ' + nombreCorto(autor.nombre) : '') : null}
            emptyText={evidencia ? 'Esta tarea se cerró sin foto' : 'Aún no hay evidencia'}
          />
        </div>

        {evidencia ? (
          <Card className="check">
            <h2>
              Checklist del trabajador
              <span>
                {evidencia.checklist.filter(Boolean).length} de {tarea.checklist.length}
              </span>
            </h2>
            {tarea.checklist.map((punto, i) => (
              <div className="checkro" key={punto}>
                <span className={evidencia.checklist[i] ? 'st-green' : 'st-red'}>
                  <Icon name={evidencia.checklist[i] ? 'checkcircle' : 'x'} size={22} />
                </span>
                {punto}
              </div>
            ))}
          </Card>
        ) : null}

        {!pendiente && verificacion ? (
          <Card className="note">
            <span className={verificacion.resultado === 'aprobada' ? 'st-green' : 'st-red'}>
              <Icon name={verificacion.resultado === 'aprobada' ? 'checkcircle' : 'alert'} size={22} />
            </span>
            <p>
              {verificacion.resultado === 'aprobada' ? 'Aprobada' : 'Pediste corrección'} a las {hora(verificacion.creada_at)}.
              {verificacion.motivos?.length ? ' Motivo: ' + verificacion.motivos.join(', ').toLowerCase() + '.' : ''}
            </p>
          </Card>
        ) : null}
      </Scroll>

      {pendiente ? (
        <Foot>
          <Button icon="check" busy={guardando === 'aprobada'} onClick={() => decidir('aprobada')}>
            Aprobar
          </Button>
          <Button variant="outline" icon="x" onClick={() => setPanel(true)}>
            Pedir corrección
          </Button>
        </Foot>
      ) : null}

      <Sheet open={panel} onClose={() => setPanel(false)} title="¿Qué hay que corregir?">
        <p>Elige uno o más motivos. El trabajador los verá en su tarea.</p>
        <div className="picks" role="group" aria-label="Motivos" style={{ marginBottom: 14 }}>
          {MOTIVOS_CORRECCION.map((m) => (
            <Pick key={m} selected={motivos.includes(m)} onClick={() => alternar(m)}>
              {m}
            </Pick>
          ))}
        </div>
        <label className="label" htmlFor="comentario" style={{ marginTop: 0 }}>
          Comentario <small>(opcional)</small>
        </label>
        <textarea id="comentario" className="txt" maxLength={200} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        <div style={{ height: 14 }} />
        <Button variant="danger" inactive={motivos.length === 0} busy={guardando === 'corregir'} onClick={() => decidir('corregir')}>
          Pedir corrección
        </Button>
        <Button variant="outline" onClick={() => setPanel(false)}>
          Volver
        </Button>
      </Sheet>
    </Screen>
  )
}
