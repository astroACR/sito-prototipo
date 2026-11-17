/* C1 · Ingreso con RUT y clave de 6 números, con teclado grande en pantalla.
   La sesión queda abierta: esta pantalla se ve solo la primera vez o si alguien cerró sesión. */

import { useCallback, useEffect, useState } from 'react'
import { Screen, TopBar, Scroll, Foot, Title } from '../../componentes/Screen.jsx'
import Button, { LinkButton } from '../../componentes/Button.jsx'
import Card from '../../componentes/Card.jsx'
import Keypad from '../../componentes/Keypad.jsx'
import Sheet from '../../componentes/Sheet.jsx'
import { useToast } from '../../componentes/Toast.jsx'
import {
  ingresar,
  modo,
  ultimoIngreso,
  olvidarUltimoIngreso,
  usuariosDeEjemplo,
  reiniciarDemo,
  ErrorCredenciales,
  ErrorRed,
  ErrorRechazo,
} from '../../datos/index.js'
import { limpiarRut, formatearRut, rutValido } from '../../dominio/rut.js'
import { primerNombre } from '../../dominio/tiempo.js'

const LARGO_CLAVE = 6

export default function Ingreso() {
  const recordado = ultimoIngreso()
  const [conocido, setConocido] = useState(recordado)
  const [paso, setPaso] = useState(recordado ? 'clave' : 'rut')
  const [rut, setRut] = useState(recordado ? limpiarRut(recordado.rut) : '')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [reinicio, setReinicio] = useState(false)
  const toast = useToast()
  const ejemplos = usuariosDeEjemplo()

  const entrar = useCallback(
    async (rutFinal, claveFinal) => {
      setEntrando(true)
      setError('')
      try {
        /* Al activarse la sesión, la ruta lleva sola a la pantalla que corresponde. */
        await ingresar(rutFinal, claveFinal)
      } catch (e) {
        setEntrando(false)
        setClave('')
        if (e instanceof ErrorCredenciales) setError('El RUT o la clave no coinciden. Revisa e intenta de nuevo.')
        else if (e instanceof ErrorRed) setError('Sin conexión. Para ingresar necesitas señal. Intenta de nuevo cuando tengas.')
        else if (e instanceof ErrorRechazo) setError(e.message)
        else setError('No se pudo ingresar. Intenta de nuevo.')
      }
    },
    [],
  )

  function continuar() {
    if (!rutValido(rut)) {
      setError(rut.length < 8 ? 'Escribe tu RUT completo, con el dígito del final.' : 'Revisa tu RUT: algún número no calza.')
      return
    }
    setError('')
    setPaso('clave')
  }

  const tecla = useCallback(
    (valor) => {
      if (entrando) return
      setError('')
      if (paso === 'rut') {
        setRut((r) => limpiarRut(r + valor))
      } else if (valor !== 'K' && clave.length < LARGO_CLAVE) {
        const nueva = clave + valor
        setClave(nueva)
        /* Con el sexto número se ingresa solo: un toque menos. */
        if (nueva.length === LARGO_CLAVE) entrar(rut, nueva)
      }
    },
    [paso, entrando, rut, clave, entrar],
  )

  const borrar = useCallback(() => {
    setError('')
    if (paso === 'rut') setRut((r) => r.slice(0, -1))
    else setClave((c) => c.slice(0, -1))
  }, [paso])

  function otroRut() {
    olvidarUltimoIngreso()
    setConocido(null)
    setRut('')
    setClave('')
    setError('')
    setPaso('rut')
  }

  /* También funciona con un teclado físico (para probar en un computador). */
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || reinicio) return
      if (/^[0-9]$/.test(e.key)) tecla(e.key)
      else if (e.key.toLowerCase() === 'k' && paso === 'rut') tecla('K')
      else if (e.key === 'Backspace') borrar()
      else if (e.key === 'Enter' && paso === 'rut') continuar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  })

  async function confirmarReinicio() {
    setReinicio(false)
    await reiniciarDemo()
    otroRut()
    toast('Datos de ejemplo reiniciados', 'ok')
  }

  const esRut = paso === 'rut'

  return (
    <Screen key={paso}>
      <TopBar>{modo === 'demo' ? <span className="badge-demo">Modo demostración</span> : null}</TopBar>
      <Scroll>
        {esRut ? (
          <>
            <Title>Ingresa con tu RUT</Title>
            <p className="sub">Tócalo en el teclado de abajo, con el dígito del final.</p>
          </>
        ) : (
          <>
            {conocido ? <p className="hello" style={{ marginTop: 0 }}>Hola, {primerNombre(conocido.nombre)}</p> : null}
            <Title>Escribe tu clave</Title>
            <p className="sub">Son 6 números. Si no la recuerdas, pídesela a tu supervisor.</p>
          </>
        )}

        <div className="login" style={{ marginTop: 16 }}>
          {esRut ? (
            <div className={'field' + (rut ? '' : ' empty') + (error ? ' bad' : '')} aria-live="polite" aria-label={'RUT: ' + (formatearRut(rut) || 'vacío')}>
              {rut ? formatearRut(rut) : '12.345.678-9'}
            </div>
          ) : (
            <div className={'dots' + (error ? ' bad' : '')} role="img" aria-label={clave.length + ' de 6 números escritos'}>
              {Array.from({ length: LARGO_CLAVE }, (_, i) => (
                <i key={i} className={i < clave.length ? 'on' : ''} />
              ))}
            </div>
          )}

          {error ? (
            <p className="errmsg" role="alert">
              {error}
            </p>
          ) : null}

          <Keypad onKey={tecla} onErase={borrar} extraKey={esRut ? 'K' : null} />

          {ejemplos.length && esRut ? (
            <Card className="demo">
              <p>
                <b>Datos de ejemplo.</b> Entra con un toque para probar cada rol. Todo queda guardado solo en este celular.
              </p>
              <div className="row">
                {ejemplos.map((u) => (
                  <Button key={u.rol} variant="outline" busy={entrando} onClick={() => entrar(u.rut, u.pin)}>
                    {u.rol === 'supervisor' ? 'Entrar como supervisor' : 'Entrar como trabajador'}
                  </Button>
                ))}
              </div>
              <LinkButton onClick={() => setReinicio(true)}>Reiniciar datos de ejemplo</LinkButton>
            </Card>
          ) : null}
        </div>
      </Scroll>
      <Foot>
        {esRut ? (
          <Button inactive={rut.length < 8} busy={entrando} onClick={continuar}>
            Continuar
          </Button>
        ) : (
          <>
            <Button inactive={clave.length < LARGO_CLAVE} busy={entrando} onClick={() => clave.length === LARGO_CLAVE && entrar(rut, clave)}>
              {entrando ? 'Ingresando…' : 'Ingresar'}
            </Button>
            <LinkButton onClick={otroRut}>Usar otro RUT</LinkButton>
          </>
        )}
      </Foot>

      <Sheet open={reinicio} onClose={() => setReinicio(false)} title="¿Reiniciar los datos de ejemplo?">
        <p>Se borra todo lo hecho en este celular y la obra vuelve a quedar como al principio, con las tareas de hoy.</p>
        <Button variant="danger" onClick={confirmarReinicio}>
          Sí, reiniciar
        </Button>
        <Button variant="outline" onClick={() => setReinicio(false)}>
          No, volver
        </Button>
      </Sheet>
    </Screen>
  )
}
