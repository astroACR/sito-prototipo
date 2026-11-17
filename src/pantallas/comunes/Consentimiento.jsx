/* C2 · Consentimiento. Aparece solo en el primer ingreso y guarda cuándo se aceptó. */

import { useState } from 'react'
import { Screen, TopBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Icon from '../../componentes/Icon.jsx'
import Card from '../../componentes/Card.jsx'
import Button, { LinkButton } from '../../componentes/Button.jsx'
import Checkbox from '../../componentes/Checkbox.jsx'
import { PolicySheet } from '../../componentes/DataSheets.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import { aceptarConsentimiento } from '../../datos/index.js'

const PUNTOS = [
  ['camera', 'Fotos de tus tareas.', 'Solo como evidencia del trabajo hecho, no para controlarte.'],
  ['pin', 'Ubicación solo de la obra.', 'Nunca seguimos tu recorrido.'],
  ['eyeoff', 'Incidentes anónimos.', 'Puedes reportar un riesgo sin tu nombre.'],
]

export default function Consentimiento() {
  const [acepta, setAcepta] = useState(false)
  const [politica, setPolitica] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const toast = useToast()

  async function aceptar() {
    if (!acepta) {
      toast('Marca la casilla para continuar', 'warn')
      return
    }
    setGuardando(true)
    try {
      /* Al quedar aceptado, la ruta protegida lleva sola a la pantalla principal. */
      await aceptarConsentimiento()
    } catch {
      setGuardando(false)
      toast('No se pudo guardar. Intenta de nuevo.', 'warn')
    }
  }

  return (
    <Screen>
      <TopBar />
      <Scroll>
        <div className="shield">
          <Icon name="shield" size={34} />
        </div>
        <Title>Tus datos, claros desde el inicio</Title>
        <p className="sub">Antes de empezar, revisa qué guarda SITO y para qué.</p>
        {PUNTOS.map(([icono, titulo, texto]) => (
          <Card className="pcard" key={icono}>
            <div className="pi">
              <Icon name={icono} />
            </div>
            <p>
              <b>{titulo}</b>
              {texto}
            </p>
          </Card>
        ))}
      </Scroll>
      <Foot>
        <Checkbox className="agree" large={false} checked={acepta} onChange={setAcepta}>
          Leí y acepto el uso de mis datos según la Ley N° 21.719.
        </Checkbox>
        <Button inactive={!acepta} busy={guardando} onClick={aceptar}>
          Aceptar y comenzar
        </Button>
        <LinkButton onClick={() => setPolitica(true)}>Ver política completa</LinkButton>
      </Foot>
      <PolicySheet open={politica} onClose={() => setPolitica(false)} />
    </Screen>
  )
}
