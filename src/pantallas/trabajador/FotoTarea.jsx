/* T3 · Revisar la foto recién tomada y terminar la tarea. */

import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Screen, BackBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Icon from '../../componentes/Icon.jsx'
import Photo from '../../componentes/Photo.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { useTarea, useBorrador, guardarBorrador, cerrarTarea, useEstadoSincronizacion } from '../../datos/index.js'
import { puedeCerrar } from '../../dominio/tareas.js'
import { hora, diaCorto } from '../../dominio/tiempo.js'
import { useNavegacion } from '../../navegacion.js'
import { useCamara } from './usarCamara.js'

/** Dirección temporal para mostrar una foto que está en la memoria del celular. */
function useUrlDeDatos(foto) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!foto?.datos) {
      setUrl(null)
      return undefined
    }
    const nueva = URL.createObjectURL(new Blob([foto.datos], { type: foto.tipo || 'image/jpeg' }))
    setUrl(nueva)
    return () => URL.revokeObjectURL(nueva)
  }, [foto?.datos, foto?.tipo])
  return url
}

export default function FotoTarea() {
  const { id } = useParams()
  const { tarea, cargando } = useTarea(id)
  const borrador = useBorrador(id)
  const { sinSenal } = useEstadoSincronizacion()
  const [terminando, setTerminando] = useState(false)
  const toast = useToast()
  const { alInicio } = useNavegacion()
  const url = useUrlDeDatos(borrador?.foto)
  const camara = useCamara((foto) => guardarBorrador(id, { foto }))

  /* Mientras se guarda el cierre no se redibuja nada: la pantalla ya se va. */
  if (terminando) return <Screen><BackBar /></Screen>
  if (cargando || borrador === undefined) return <Screen><BackBar /></Screen>
  if (!tarea) return <Navigate to="/" replace />
  if (!puedeCerrar(tarea.estado) || !borrador?.foto) return <Navigate to={'/tareas/' + id} replace />

  const foto = borrador.foto
  const cuando = diaCorto(foto.tomada_at) + ' · ' + hora(foto.tomada_at)

  async function terminar() {
    setTerminando(true)
    try {
      await cerrarTarea({ tarea, checks: borrador.checks ?? [], foto })
      alInicio()
      toast('Tarea guardada', 'ok')
    } catch {
      setTerminando(false)
      toast('No se pudo guardar la tarea. Intenta de nuevo.', 'warn')
    }
  }

  return (
    <Screen>
      <BackBar title={tarea.titulo} />
      <Scroll>
        <Title hidden>Evidencia: {tarea.titulo}</Title>
        <Photo
          url={url}
          state={url ? 'lista' : 'cargando'}
          alt={'Foto de la tarea terminada, ' + cuando + ', ' + tarea.lugar}
          pill={cuando + ' · ' + tarea.lugar}
        />
        <Card className="saved">
          <div className="row">
            <span className="st-green">
              <Icon name="checkcircle" size={22} />
            </span>
            <p>
              <b>Guardada en tu celular</b> · {foto.kb} KB
            </p>
          </div>
          <div className="row">
            <span className="st-amber">
              <Icon name="refresh" size={22} />
            </span>
            <p>
              <b>Se enviará sola</b> {sinSenal ? 'al volver la señal.' : 'cuando la termines.'} No necesitas hacer nada más.
            </p>
          </div>
        </Card>
      </Scroll>
      <Foot>
        <input {...camara.input} />
        <Button icon="check" onClick={terminar}>
          Terminar tarea
        </Button>
        <Button variant="outline" icon="camera" busy={camara.procesando} onClick={camara.abrir}>
          {camara.procesando ? 'Guardando foto…' : 'Repetir foto'}
        </Button>
      </Foot>
    </Screen>
  )
}
