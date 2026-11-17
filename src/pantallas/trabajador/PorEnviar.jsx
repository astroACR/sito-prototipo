/* T6 · Por enviar: la cola real de lo que aún no llega al servidor, y lo ya enviado hoy. */

import { useState } from 'react'
import { Screen, TopBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Chip from '../../componentes/Chip.jsx'
import Icon from '../../componentes/Icon.jsx'
import Tile from '../../componentes/Tile.jsx'
import Photo from '../../componentes/Photo.jsx'
import Empty from '../../componentes/Empty.jsx'
import BottomNav from '../../componentes/BottomNav.jsx'
import OfflineBanner from '../../componentes/OfflineBanner.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { useCola, useObra, useFoto, useEstadoSincronizacion, enviarAhora } from '../../datos/index.js'
import { hora, diaCorto } from '../../dominio/tiempo.js'

const TILE = {
  tarea: { color: 'amber', icon: 'refresh' },
  riesgo: { color: 'red', icon: 'triangle' },
  problema: { color: 'amber', icon: 'alert' },
}

function Fila({ op, estado }) {
  const tile = estado === 'enviado' ? { color: 'green', icon: 'check' } : (TILE[op.resumen.clase] ?? TILE.tarea)
  const cuando = estado === 'enviado' ? 'Enviado · ' + hora(op.enviado_at) : op.resumen.detalle + ' · ' + hora(op.creado_at)
  return (
    <Card className="qrow">
      <Tile color={tile.color} icon={tile.icon} size={24} />
      <div className="tx">
        <div className="tt">{op.resumen.titulo}</div>
        <div className="tl">{cuando}</div>
        {estado === 'rechazado' ? (
          <div className="tl" style={{ marginTop: 6 }}>
            <Chip color="red">No se pudo enviar</Chip>
            <span className="blk" style={{ marginTop: 4 }}>
              {op.ultimo_error} Muéstrale esto a tu supervisor.
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export default function PorEnviar() {
  const cola = useCola()
  const obra = useObra()
  const { sinSenal, enviando } = useEstadoSincronizacion()
  const [ocupado, setOcupado] = useState(false)
  const toast = useToast()

  const enEspera = [...cola.rechazados, ...cola.pendientes]
  const ultimaConFoto = [...enEspera].reverse().find((o) => o.foto_id)
  const foto = useFoto(ultimaConFoto?.foto_id ?? null, null)
  const hoy = new Date().toDateString()
  const enviadosHoy = cola.enviados.filter((o) => new Date(o.enviado_at).toDateString() === hoy)

  async function enviar() {
    if (cola.total === 0) {
      toast('No hay nada por enviar', 'ok')
      return
    }
    setOcupado(true)
    try {
      const r = await enviarAhora()
      if (r.motivo === 'sin_red') toast('Sin señal. Se enviarán solos al volver la conexión', 'warn')
      else if (r.motivo === 'sesion') toast('Tu sesión se cerró. Ingresa de nuevo para enviar', 'warn')
      else if (r.rechazados) toast('Hay registros que no se pudieron enviar', 'warn')
      else toast(r.enviados === 1 ? '1 registro enviado' : r.enviados + ' registros enviados', 'ok')
    } catch {
      toast('No se pudo enviar. Intenta de nuevo.', 'warn')
    } finally {
      setOcupado(false)
    }
  }

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
        <Title style={{ marginTop: 16 }}>Por enviar</Title>

        {cola.cargando ? null : cola.total === 0 ? (
          <div style={{ marginTop: 14 }}>
            <Empty icon="checkcircle" title="Todo está enviado">
              Cuando termines una tarea o reportes algo, aparecerá aquí hasta que se envíe.
            </Empty>
          </div>
        ) : (
          <>
            {ultimaConFoto ? (
              <>
                <p className="small" style={{ margin: '14px 0 8px' }}>
                  Última foto · <b style={{ color: 'var(--ink)' }}>{ultimaConFoto.resumen.titulo}</b>
                </p>
                <Photo
                  small
                  url={foto.url}
                  state={foto.estado}
                  alt={'Foto de ' + ultimaConFoto.resumen.titulo}
                  pill={diaCorto(ultimaConFoto.creado_at) + ' · ' + hora(ultimaConFoto.creado_at)}
                />
                <Card className="saved">
                  <div className="row">
                    <span className="st-green">
                      <Icon name="checkcircle" size={22} />
                    </span>
                    <p>
                      <b>Guardada en tu celular</b>
                    </p>
                  </div>
                  <div className="row">
                    <span className="st-amber">
                      <Icon name="refresh" size={22} />
                    </span>
                    <p>
                      <b>Se enviará sola</b> {sinSenal ? 'al volver la señal.' : 'en un momento.'} No necesitas hacer nada más.
                    </p>
                  </div>
                </Card>
              </>
            ) : null}

            <h2 className="section-t">
              {sinSenal ? 'En espera de señal' : 'En espera de envío'} ({cola.total})
            </h2>
            <div className="queue">
              {enEspera.map((op) => (
                <Fila key={op.seq} op={op} estado={op.estado} />
              ))}
            </div>
          </>
        )}

        {enviadosHoy.length ? (
          <>
            <h2 className="section-t">Enviados hoy ({enviadosHoy.length})</h2>
            <div className="queue">
              {enviadosHoy.map((op) => (
                <Fila key={op.seq} op={op} estado="enviado" />
              ))}
            </div>
          </>
        ) : null}
      </Scroll>
      <Foot withNav>
        <Button icon="send" inactive={cola.total === 0} busy={ocupado || enviando} onClick={enviar}>
          {ocupado || enviando ? 'Enviando…' : 'Enviar ahora'}
        </Button>
        <BottomNav role="trabajador" active="/por-enviar" />
      </Foot>
    </Screen>
  )
}
