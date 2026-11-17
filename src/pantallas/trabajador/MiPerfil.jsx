/* T7 · Mi perfil: quién soy, letra más grande, mis datos y cerrar sesión. */

import { useState } from 'react'
import { Screen, TopBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Icon from '../../componentes/Icon.jsx'
import Switch from '../../componentes/Switch.jsx'
import BottomNav from '../../componentes/BottomNav.jsx'
import { PolicySheet, RightsSheet } from '../../componentes/DataSheets.jsx'
import LogoutSheet from '../../componentes/LogoutSheet.jsx'
import { usePerfil, useObra, useCuadrillas, modo } from '../../datos/index.js'
import { nombreCuadrilla } from '../../dominio/tareas.js'
import { formatearRut } from '../../dominio/rut.js'
import { useLetraGrande } from '../../preferencias.js'
import { useNavegacion } from '../../navegacion.js'

function Enlace({ icon, children, onClick }) {
  return (
    <button type="button" className="rowbtn" onClick={onClick}>
      <Icon name={icon} />
      <span className="tx">{children}</span>
      <span className="chev">
        <Icon name="chevron" size={22} />
      </span>
    </button>
  )
}

export default function MiPerfil() {
  const perfil = usePerfil()
  const obra = useObra()
  const cuadrillas = useCuadrillas()
  const [letraGrande, setLetraGrande] = useLetraGrande()
  const [panel, setPanel] = useState(null)
  const { ir } = useNavegacion()
  const cuadrilla = (cuadrillas ?? []).find((c) => c.id === perfil.cuadrilla_id)

  return (
    <Screen>
      <TopBar>{modo === 'demo' ? <span className="badge-demo">Modo demostración</span> : null}</TopBar>
      <Scroll>
        <Title style={{ marginTop: 4 }}>{perfil.nombre}</Title>
        <p className="sub">Trabajador</p>

        <Card className="rows" style={{ marginTop: 16 }}>
          <div className="row">
            <span>RUT</span>
            <b>{formatearRut(perfil.rut)}</b>
          </div>
          <div className="row">
            <span>Obra</span>
            <b>{obra?.nombre ?? '—'}</b>
          </div>
          <div className="row">
            <span>Cuadrilla</span>
            <b>{nombreCuadrilla(cuadrilla) || '—'}</b>
          </div>
        </Card>

        <Switch checked={letraGrande} onChange={setLetraGrande} title="Letra más grande" description="Agranda los textos de toda la app" />

        <Enlace icon="clock" onClick={() => ir('/anteriores')}>
          Tareas anteriores
        </Enlace>
        <Enlace icon="shield" onClick={() => setPanel('politica')}>
          Qué datos guarda SITO
        </Enlace>
        <Enlace icon="filetext" onClick={() => setPanel('derechos')}>
          Mis derechos sobre mis datos
        </Enlace>
      </Scroll>
      <Foot withNav>
        <Button variant="outline" icon="logout" onClick={() => setPanel('salir')}>
          Cerrar sesión
        </Button>
        <BottomNav role="trabajador" active="/perfil" />
      </Foot>

      <PolicySheet open={panel === 'politica'} onClose={() => setPanel(null)} />
      <RightsSheet open={panel === 'derechos'} onClose={() => setPanel(null)} />
      <LogoutSheet open={panel === 'salir'} onClose={() => setPanel(null)} />
    </Screen>
  )
}
