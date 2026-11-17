import { describe, it, expect } from 'vitest'
import { dimensionesReducidas, quitarMetadatos, tieneMetadatos, LADO_MAXIMO } from './fotos.js'

/* Arma un JPEG mínimo: inicio, segmentos y datos de imagen. */
function segmento(marca, contenido) {
  const largo = contenido.length + 2
  return [0xff, marca, largo >> 8, largo & 0xff, ...contenido]
}
const texto = (t) => [...t].map((c) => c.charCodeAt(0))
function jpeg(...segmentos) {
  const imagen = [0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xe1, 0x33, 0xff, 0xd9]
  return new Uint8Array([0xff, 0xd8, ...segmentos.flat(), ...imagen]).buffer
}

const JFIF = segmento(0xe0, texto('JFIF\0'))
const EXIF_GPS = segmento(0xe1, texto('Exif\0\0GPS -33.4489,-70.6693 SM-A155M'))
const XMP = segmento(0xe1, texto('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>'))
const COMENTARIO = segmento(0xfe, texto('tomada por Pedro'))
const TABLA = segmento(0xdb, [0, 1, 2, 3])

describe('tamaño de la foto', () => {
  it('reduce el lado mayor a 1280 px y mantiene la proporción', () => {
    expect(dimensionesReducidas(4000, 3000)).toEqual({ ancho: 1280, alto: 960 })
    expect(dimensionesReducidas(3000, 4000)).toEqual({ ancho: 960, alto: 1280 })
    expect(dimensionesReducidas(4608, 2592)).toEqual({ ancho: 1280, alto: 720 })
    expect(LADO_MAXIMO).toBe(1280)
  })

  it('nunca agranda una foto chica', () => {
    expect(dimensionesReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 })
    expect(dimensionesReducidas(1280, 1280)).toEqual({ ancho: 1280, alto: 1280 })
  })

  it('no deja lados en cero y rechaza tamaños inválidos', () => {
    expect(dimensionesReducidas(10000, 3)).toEqual({ ancho: 1280, alto: 1 })
    expect(() => dimensionesReducidas(0, 100)).toThrow()
  })
})

describe('metadatos de la foto', () => {
  it('borra EXIF, XMP y comentarios, y conserva la imagen', () => {
    const original = jpeg(JFIF, EXIF_GPS, XMP, TABLA, COMENTARIO)
    expect(tieneMetadatos(original)).toBe(true)

    const limpia = quitarMetadatos(original)
    expect(tieneMetadatos(limpia)).toBe(false)
    expect(new Uint8Array(limpia)).toEqual(new Uint8Array(jpeg(JFIF, TABLA)))
    const comoTexto = String.fromCharCode(...new Uint8Array(limpia))
    expect(comoTexto).not.toContain('GPS')
    expect(comoTexto).not.toContain('Pedro')
  })

  it('no toca los bytes de la imagen aunque parezcan un marcador', () => {
    const sinMetadatos = jpeg(JFIF, TABLA)
    const salida = quitarMetadatos(sinMetadatos)
    expect(salida).toBe(sinMetadatos)
    /* La secuencia FF E1 dentro de los datos de imagen sigue ahí. */
    const bytes = [...new Uint8Array(quitarMetadatos(jpeg(EXIF_GPS)))]
    expect(bytes.slice(-11)).toEqual([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xe1, 0x33, 0xff, 0xd9])
  })

  it('devuelve igual lo que no es JPEG o viene cortado', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).buffer
    expect(quitarMetadatos(png)).toBe(png)
    expect(tieneMetadatos(png)).toBe(false)
    const cortado = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2]).buffer
    expect(() => quitarMetadatos(cortado)).not.toThrow()
  })
})
