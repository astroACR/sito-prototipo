/* Fotos: se achican y se vuelven a codificar en el celular antes de guardarlas.

   - Lado mayor de unos 1280 px y JPEG con calidad 0,7: cerca de 300 KB por foto,
     para que quepan muchas en el celular y viajen rápido con mala señal.
   - Al volver a codificar en un canvas se pierden los metadatos EXIF (ubicación GPS,
     modelo del celular, fecha). Además `quitarMetadatos` los borra de forma explícita,
     para no depender de lo que haga cada navegador. */

export const LADO_MAXIMO = 1280
export const CALIDAD = 0.7

/** Tamaño final de la foto: nunca se agranda y se mantiene la proporción. */
export function dimensionesReducidas(ancho, alto, maximo = LADO_MAXIMO) {
  if (!(ancho > 0) || !(alto > 0)) throw new Error('La imagen no tiene un tamaño válido.')
  const escala = Math.min(1, maximo / Math.max(ancho, alto))
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  }
}

const esJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8

/* Segmentos que pueden llevar datos personales: APP1 (EXIF, XMP) a APP13 (IPTC), APP15 y comentarios.
   Se conservan APP0 (JFIF) y APP14 (Adobe), que solo describen cómo leer la imagen. */
const esMetadato = (marca) => (marca >= 0xe1 && marca <= 0xed) || marca === 0xef || marca === 0xfe

function recorrerSegmentos(bytes, alVer) {
  let i = 2
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return i
    const marca = bytes[i + 1]
    /* Inicio de los datos de imagen: desde aquí ya no hay segmentos de metadatos. */
    if (marca === 0xda) return i
    const largo = (bytes[i + 2] << 8) | bytes[i + 3]
    if (largo < 2 || i + 2 + largo > bytes.length) return i
    alVer(marca, i, i + 2 + largo)
    i += 2 + largo
  }
  return i
}

/** Indica si un JPEG todavía trae metadatos (EXIF, XMP, comentarios). */
export function tieneMetadatos(datos) {
  const bytes = new Uint8Array(datos)
  if (!esJpeg(bytes)) return false
  let hay = false
  recorrerSegmentos(bytes, (marca) => {
    if (esMetadato(marca)) hay = true
  })
  return hay
}

/** Devuelve el mismo JPEG sin sus segmentos de metadatos. Otros formatos se devuelven igual. */
export function quitarMetadatos(datos) {
  const bytes = new Uint8Array(datos)
  if (!esJpeg(bytes)) return datos
  const partes = [bytes.subarray(0, 2)]
  const fin = recorrerSegmentos(bytes, (marca, desde, hasta) => {
    if (!esMetadato(marca)) partes.push(bytes.subarray(desde, hasta))
  })
  partes.push(bytes.subarray(fin))
  const total = partes.reduce((n, p) => n + p.length, 0)
  if (total === bytes.length) return datos
  const salida = new Uint8Array(total)
  let pos = 0
  for (const p of partes) {
    salida.set(p, pos)
    pos += p.length
  }
  return salida.buffer
}

async function abrirImagen(archivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
      return { imagen: mapa, ancho: mapa.width, alto: mapa.height, cerrar: () => mapa.close?.() }
    } catch {
      /* Algunos navegadores antiguos no aceptan las opciones: se usa <img>. */
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = new Image()
    await new Promise((listo, falla) => {
      imagen.onload = listo
      imagen.onerror = () => falla(new Error('No se pudo abrir la foto.'))
      imagen.src = url
    })
    return { imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight, cerrar: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/**
 * Achica y vuelve a codificar una foto recién tomada.
 * Devuelve { datos: ArrayBuffer, tipo, kb, ancho, alto }.
 */
export async function comprimirFoto(archivo, { maximo = LADO_MAXIMO, calidad = CALIDAD } = {}) {
  const fuente = await abrirImagen(archivo)
  try {
    const { ancho, alto } = dimensionesReducidas(fuente.ancho, fuente.alto, maximo)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    if (!ctx) throw new Error('El celular no pudo preparar la foto.')
    ctx.drawImage(fuente.imagen, 0, 0, ancho, alto)
    const blob = await new Promise((listo) => lienzo.toBlob(listo, 'image/jpeg', calidad))
    /* Libera la memoria del canvas: en celulares de gama baja hace la diferencia. */
    lienzo.width = 0
    lienzo.height = 0
    if (!blob) throw new Error('El celular no pudo guardar la foto.')
    const datos = quitarMetadatos(await new Response(blob).arrayBuffer())
    return { datos, tipo: blob.type || 'image/jpeg', kb: Math.max(1, Math.round(datos.byteLength / 1024)), ancho, alto }
  } finally {
    fuente.cerrar()
  }
}
