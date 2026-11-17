/* Aviso de conexión. Dice qué pasa y qué va a pasar ahora, sin palabras técnicas.
   - Sin señal (trabajador): todo se guarda en el celular y se envía solo.
   - Sin señal (supervisor): necesita conexión para verificar y asignar.
   - Sesión cerrada: hay que volver a ingresar; nada se pierde. */

import Icon from './Icon.jsx'
import Button from './Button.jsx'
import { useCola, useEstadoSincronizacion, usePerfil, salir } from '../datos/index.js'
import { useNavegacion } from '../navegacion.js'

export default function OfflineBanner() {
  const perfil = usePerfil()
  const estado = useEstadoSincronizacion()
  const cola = useCola()
  const { ir } = useNavegacion()

  if (!perfil) return null

  if (estado.sesionVencida) {
    return (
      <div className="notice warn-notice" role="status">
        <Icon name="lock" size={22} />
        <div>
          <p>
            <b>Tu sesión se cerró.</b> Ingresa de nuevo para seguir. Lo que guardaste no se pierde.
          </p>
          <Button
            variant="outline"
            className="mt"
            onClick={async () => {
              await salir()
              ir('/ingreso', { replace: true })
            }}
          >
            Ingresar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  if (estado.sinSenal) {
    if (perfil.rol === 'supervisor') {
      return (
        <div className="offline" role="status">
          <Icon name="wifioff" size={22} />
          <p>
            <b>Sin conexión.</b> Para verificar y asignar necesitas señal. Lo que ves puede no estar al día.
          </p>
        </div>
      )
    }
    const n = cola.total
    const texto =
      n === 0
        ? 'Todo lo que hagas se guarda en tu celular y se envía solo al volver la conexión.'
        : n === 1
          ? '1 registro se enviará solo al volver la conexión.'
          : n + ' registros se enviarán solos al volver la conexión.'
    return (
      <div className="offline" role="status">
        <Icon name="wifioff" size={22} />
        <p>
          <b>Sin señal.</b> {texto}
        </p>
      </div>
    )
  }

  if (perfil.rol === 'trabajador' && cola.pendientes.length > 0) {
    const n = cola.pendientes.length
    return (
      <div className="notice" role="status">
        <Icon name="refresh" size={22} />
        <p>{n === 1 ? 'Enviando 1 registro…' : 'Enviando ' + n + ' registros…'}</p>
      </div>
    )
  }

  return null
}
