/* Cámara del celular: abre la cámara trasera con un <input type="file" capture>,
   comprime la foto y la entrega lista para guardar.

   Uso:
     const camara = useCamara(async (foto) => { ... })
     <input {...camara.input} />              (invisible)
     <Button onClick={camara.abrir} busy={camara.procesando}>Tomar foto</Button> */

import { useRef, useState } from 'react'
import { comprimirFoto } from '../../datos/index.js'
import { useToast } from '../../componentes/Toast.jsx'

export function useCamara(alTenerFoto) {
  const ref = useRef(null)
  const [procesando, setProcesando] = useState(false)
  const toast = useToast()

  async function alElegir(evento) {
    const archivo = evento.target.files?.[0]
    /* Se limpia el campo para poder volver a tomar la misma foto. */
    evento.target.value = ''
    if (!archivo) return
    setProcesando(true)
    try {
      const foto = await comprimirFoto(archivo)
      await alTenerFoto({ ...foto, tomada_at: new Date().toISOString() })
    } catch {
      toast('No se pudo guardar la foto. Intenta tomarla de nuevo.', 'warn')
    } finally {
      setProcesando(false)
    }
  }

  return {
    procesando,
    abrir: () => ref.current?.click(),
    input: {
      ref,
      type: 'file',
      accept: 'image/*',
      capture: 'environment',
      className: 'filein',
      tabIndex: -1,
      'aria-hidden': true,
      onChange: alElegir,
    },
  }
}
