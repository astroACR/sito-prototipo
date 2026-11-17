/* Sesión en el celular: quién está usando la app.

   Se guarda en el celular para que la app abra sin señal y nadie tenga que
   escribir su clave todos los días. La identidad viene de aquí; la conexión con
   el servidor (remoto) solo hace falta para enviar y descargar. */

const CAMPOS = ['id', 'rut', 'nombre', 'rol', 'obra_id', 'cuadrilla_id', 'consentimiento_at']

function memoria() {
  const datos = new Map()
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
  }
}

function almacenSeguro() {
  try {
    const a = globalThis.localStorage
    a.setItem('sito-prueba', '1')
    a.removeItem('sito-prueba')
    return a
  } catch {
    /* Navegación privada o almacenamiento bloqueado: la sesión dura mientras la app esté abierta. */
    return memoria()
  }
}

export function crearSesion({ almacen = almacenSeguro(), clave = 'sito-sesion' } = {}) {
  const claveUltimo = clave + '-ultimo'
  const oyentes = new Set()

  const leerJson = (k) => {
    try {
      return JSON.parse(almacen.getItem(k) || 'null')
    } catch {
      return null
    }
  }

  let perfil = leerJson(clave)

  function guardar(nuevo) {
    perfil = nuevo
    if (nuevo) almacen.setItem(clave, JSON.stringify(nuevo))
    else almacen.removeItem(clave)
    oyentes.forEach((fn) => fn())
  }

  return {
    leer: () => perfil,

    /** Deja a una persona como usuaria del celular y recuerda su RUT para el próximo ingreso. */
    poner(nuevo) {
      const limpio = Object.fromEntries(CAMPOS.map((c) => [c, nuevo[c] ?? null]))
      almacen.setItem(claveUltimo, JSON.stringify({ rut: limpio.rut, nombre: limpio.nombre }))
      guardar(limpio)
    },

    /** Cambia algunos datos del perfil actual (por ejemplo, la fecha del consentimiento). */
    actualizar(cambios) {
      if (!perfil) return
      const siguiente = { ...perfil }
      let cambio = false
      for (const c of CAMPOS) {
        if (c in cambios && cambios[c] !== perfil[c] && c !== 'id') {
          siguiente[c] = cambios[c]
          cambio = true
        }
      }
      if (cambio) guardar(siguiente)
    },

    quitar() {
      guardar(null)
    },

    /** Última persona que ingresó en este celular: { rut, nombre } o null. */
    ultimoIngreso: () => leerJson(claveUltimo),

    olvidarUltimo() {
      almacen.removeItem(claveUltimo)
    },

    suscribir(fn) {
      oyentes.add(fn)
      return () => oyentes.delete(fn)
    },
  }
}
