/* T4 · Reportar un riesgo de seguridad. El lugar viene cargado y el reporte parte sin nombre. */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Screen, BackBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Icon from '../../componentes/Icon.jsx'
import Switch from '../../componentes/Switch.jsx'
import Sheet from '../../componentes/Sheet.jsx'
import { Pick } from '../../componentes/Chip.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { usePerfil, useTareas, useObra, reportarIncidente, useEstadoSincronizacion } from '../../datos/index.js'
import { TIPOS_RIESGO } from '../../dominio/incidentes.js'
import { esDelTrabajador, esDeHoy, estaAbierta, lugarCompleto, ordenarParaTrabajador } from '../../dominio/tareas.js'
import { useNavegacion } from '../../navegacion.js'
import { useCamara } from './usarCamara.js'

export default function ReportarIncidente() {
  const [parametros] = useSearchParams()
  const tareaId = parametros.get('tarea')
  const perfil = usePerfil()
  const tareas = useTareas()
  const obra = useObra()
  const { sinSenal } = useEstadoSincronizacion()
  const [tipo, setTipo] = useState(null)
  const [foto, setFoto] = useState(null)
  const [anonimo, setAnonimo] = useState(true)
  const [lugarElegido, setLugarElegido] = useState(null)
  const [panelLugar, setPanelLugar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const toast = useToast()
  const { alInicio } = useNavegacion()
  const camara = useCamara((nueva) => setFoto(nueva))

  /* Lugar ya cargado, donde lo más probable es que la persona esté ahora:
     1. el de la tarea desde la que abrió el reporte;
     2. si no, el de la última tarea que cerró hoy (ahí estaba trabajando);
     3. si no, el de su primera tarea por hacer. */
  const mias = (tareas ?? []).filter((t) => esDelTrabajador(t, perfil) && esDeHoy(t))
  const ultimaCerrada = mias
    .filter((t) => t.cerrada_por === perfil.id && t.cerrada_at)
    .sort((a, b) => String(b.cerrada_at).localeCompare(String(a.cerrada_at)))[0]
  const referencia = mias.find((t) => t.id === tareaId) ?? ultimaCerrada ?? ordenarParaTrabajador(mias).find(estaAbierta) ?? mias[0]
  const lugar = lugarElegido ?? (referencia ? { lugar: referencia.lugar, sector: referencia.sector } : { lugar: obra?.lugares?.[0] ?? null, sector: null })

  async function enviar() {
    if (!tipo) {
      toast('Elige qué pasó antes de enviar', 'warn')
      return
    }
    setEnviando(true)
    try {
      await reportarIncidente({ clase: 'riesgo', tipo, anonimo, lugar: lugar.lugar, sector: lugar.sector, tarea_id: tareaId, foto })
      alInicio()
      toast(sinSenal ? 'Reporte guardado. Se enviará apenas haya señal' : 'Reporte guardado. Se está enviando', 'ok')
    } catch {
      setEnviando(false)
      toast('No se pudo guardar el reporte. Intenta de nuevo.', 'warn')
    }
  }

  return (
    <Screen>
      <BackBar />
      <Scroll>
        <Title>¿Qué pasó?</Title>
        <p className="sub">Toca una opción. Tu jefe de obra lo recibe al instante.</p>

        <div className="types" role="group" aria-label="Tipo de incidente">
          {TIPOS_RIESGO.map((t) => (
            <button key={t.id} type="button" className="type" aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
              <Icon name={t.icon} size={30} />
              {t.label}
            </button>
          ))}
        </div>

        <button type="button" className="rowbtn" style={{ marginTop: 14 }} onClick={() => setPanelLugar(true)}>
          <Icon name="pin" />
          <span className="tx">
            <span className="small blk" style={{ fontWeight: 600 }}>
              Lugar
            </span>
            {lugarCompleto(lugar) || 'Elegir lugar'}
          </span>
          <span className="small" style={{ fontWeight: 700, textDecoration: 'underline' }}>
            Cambiar
          </span>
        </button>

        <input {...camara.input} />
        <Button
          variant="outline"
          icon={foto ? 'check' : 'camera'}
          className={'addphoto' + (foto ? ' ok' : '')}
          busy={camara.procesando}
          onClick={camara.abrir}
        >
          {camara.procesando ? 'Guardando foto…' : foto ? 'Foto agregada ✓' : 'Agregar foto (opcional)'}
        </Button>

        <Switch checked={anonimo} onChange={setAnonimo} title="Reportar sin mi nombre" description={anonimo ? 'Nadie verá quién lo envió' : 'Tu supervisor verá tu nombre'} />
      </Scroll>
      <Foot>
        <Button variant="danger" icon="triangle" inactive={!tipo} busy={enviando} onClick={enviar}>
          Enviar reporte
        </Button>
        <p className="small center">Sin señal también funciona: se envía apenas haya conexión.</p>
      </Foot>

      <Sheet open={panelLugar} onClose={() => setPanelLugar(false)} title="¿Dónde pasó?">
        <div className="picks" role="group" aria-label="Lugar" style={{ marginBottom: 18 }}>
          {(obra?.lugares ?? []).map((l) => (
            <Pick
              key={l}
              selected={lugar.lugar === l}
              onClick={() => {
                setLugarElegido({ lugar: l, sector: lugar.lugar === l ? lugar.sector : null })
                setPanelLugar(false)
              }}
            >
              {l}
            </Pick>
          ))}
        </div>
        <Button variant="outline" onClick={() => setPanelLugar(false)}>
          Cerrar
        </Button>
      </Sheet>
    </Screen>
  )
}
