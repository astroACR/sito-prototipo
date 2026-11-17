/* Confirmación para cerrar sesión. Avisa si quedan registros sin enviar y qué pasará con ellos. */

import { useState } from 'react'
import Sheet from './Sheet.jsx'
import Button from './Button.jsx'
import { useCola, salir } from '../datos/index.js'
import { useNavegacion } from '../navegacion.js'

export default function LogoutSheet({ open, onClose }) {
  const cola = useCola()
  const [saliendo, setSaliendo] = useState(false)
  const { ir } = useNavegacion()

  async function confirmar() {
    setSaliendo(true)
    await salir()
    ir('/ingreso', { replace: true })
  }

  return (
    <Sheet open={open} onClose={onClose} title="¿Cerrar sesión?">
      {cola.total > 0 ? (
        <p>
          <b>
            Tienes {cola.total} {cola.total === 1 ? 'registro' : 'registros'} sin enviar.
          </b>{' '}
          No se pierden: se enviarán cuando vuelvas a ingresar con tu RUT en este celular.
        </p>
      ) : (
        <p>Para volver a entrar vas a necesitar tu RUT, tu clave y señal.</p>
      )}
      <Button variant="danger" icon="logout" busy={saliendo} onClick={confirmar}>
        Sí, cerrar sesión
      </Button>
      <Button variant="outline" onClick={onClose}>
        Seguir en la app
      </Button>
    </Sheet>
  )
}
