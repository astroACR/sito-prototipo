/* Piezas compartidas por las pantallas del supervisor. */

import { useState } from 'react'
import { TopBar } from '../../componentes/Screen.jsx'
import Icon from '../../componentes/Icon.jsx'
import Sheet from '../../componentes/Sheet.jsx'
import Button from '../../componentes/Button.jsx'
import Switch from '../../componentes/Switch.jsx'
import LogoutSheet from '../../componentes/LogoutSheet.jsx'
import { PolicySheet } from '../../componentes/DataSheets.jsx'
import { usePerfil, useObra, modo, ErrorRed, ErrorSesion, ErrorRechazo } from '../../datos/index.js'
import { primerNombre } from '../../dominio/tiempo.js'
import { useLetraGrande } from '../../preferencias.js'

/** Mensaje claro para una acción del supervisor que no se pudo hacer. Dice qué pasó y qué hacer. */
export function mensajeDeError(error) {
  if (error instanceof ErrorRed) return 'Sin conexión. No se guardó: intenta de nuevo cuando tengas señal.'
  if (error instanceof ErrorSesion) return 'Tu sesión se cerró. Ingresa de nuevo para seguir.'
  if (error instanceof ErrorRechazo) return error.message
  return 'No se pudo guardar. Intenta de nuevo.'
}

/**
 * Barra superior del supervisor. El botón con su nombre abre "Mi cuenta"
 * (letra más grande, política de datos y cerrar sesión): el supervisor no tiene pestaña de perfil.
 */
export function SupervisorBar() {
  const perfil = usePerfil()
  const obra = useObra()
  const [letraGrande, setLetraGrande] = useLetraGrande()
  const [panel, setPanel] = useState(null)

  return (
    <>
      <TopBar>
        <button type="button" className="metabtn" onClick={() => setPanel('cuenta')} aria-label={'Mi cuenta: ' + perfil.nombre + (obra ? ', obra ' + obra.nombre : '')}>
          <Icon name="user" size={20} />
          {obra ? obra.nombre : primerNombre(perfil.nombre)}
        </button>
      </TopBar>

      <Sheet open={panel === 'cuenta'} onClose={() => setPanel(null)} title={perfil.nombre}>
        <p>
          Supervisor{obra ? ' · Obra ' + obra.nombre : ''}
          {modo === 'demo' ? ' · Modo demostración' : ''}
        </p>
        <Switch checked={letraGrande} onChange={setLetraGrande} title="Letra más grande" description="Agranda los textos de toda la app" />
        <div style={{ height: 14 }} />
        <Button variant="outline" icon="shield" onClick={() => setPanel('politica')}>
          Qué datos guarda SITO
        </Button>
        <Button variant="outline" icon="logout" onClick={() => setPanel('salir')}>
          Cerrar sesión
        </Button>
      </Sheet>
      <PolicySheet open={panel === 'politica'} onClose={() => setPanel(null)} />
      <LogoutSheet open={panel === 'salir'} onClose={() => setPanel(null)} />
    </>
  )
}
