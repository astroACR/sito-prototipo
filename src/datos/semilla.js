/* Datos de ejemplo de la obra "Torre Norte".

   Esta es la ÚNICA fuente de los datos de demostración:
   - el modo demo los carga tal cual en el celular;
   - `npm run seed` genera con ellos supabase/seed.sql y supabase/reset-demo.sql.

   Las horas se guardan como "hace N minutos" y las fechas como "hace N días",
   para que la demo siempre muestre una jornada de hoy sin importar cuándo se cargue. */

const uuid = (grupo, n) => String(grupo).padStart(8, '0') + '-0000-4000-8000-' + String(n).padStart(12, '0')

export const ID = {
  obra: uuid(1, 1),
  cuadrilla: (n) => uuid(2, n),
  usuario: (n) => uuid(3, n),
  plantilla: (n) => uuid(4, n),
  tarea: (n) => uuid(5, n),
  evidencia: (n) => uuid(6, n),
  verificacion: (n) => uuid(7, n),
  incidente: (n) => uuid(8, n),
}

/** Clave de todos los usuarios de ejemplo. Solo sirve para la demo. */
export const PIN_DEMO = '123456'

export const OBRA = {
  id: ID.obra,
  nombre: 'Torre Norte',
  lugares: ['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4', 'Subterráneo', 'Acceso norte', 'Bodega'],
}

export const CUADRILLAS = [
  { id: ID.cuadrilla(1), obra_id: ID.obra, nombre: 'Cuadrilla 1', especialidad: 'Enfierradura', orden: 1 },
  { id: ID.cuadrilla(2), obra_id: ID.obra, nombre: 'Cuadrilla 2', especialidad: 'Moldaje', orden: 2 },
  { id: ID.cuadrilla(3), obra_id: ID.obra, nombre: 'Cuadrilla 3', especialidad: 'Terminaciones', orden: 3 },
]

/* RUT de ejemplo fáciles de escribir en el teclado de la app (todos con dígito verificador válido). */
export const USUARIOS = [
  { n: 1, rut: '11111111-1', nombre: 'Pedro Rojas', rol: 'trabajador', cuadrilla: 2 },
  { n: 2, rut: '22222222-2', nombre: 'Luis Soto', rol: 'trabajador', cuadrilla: 2 },
  { n: 3, rut: '33333333-3', nombre: 'Ana Díaz', rol: 'trabajador', cuadrilla: 1 },
  { n: 4, rut: '44444444-4', nombre: 'Marco Vera', rol: 'trabajador', cuadrilla: 1 },
  { n: 5, rut: '55555555-5', nombre: 'Carla Pinto', rol: 'trabajador', cuadrilla: 3 },
  { n: 6, rut: '66666666-6', nombre: 'Jorge Mella', rol: 'trabajador', cuadrilla: 3 },
  { n: 9, rut: '99999999-9', nombre: 'Javiera Muñoz', rol: 'supervisor', cuadrilla: null },
].map((u) => ({
  id: ID.usuario(u.n),
  rut: u.rut,
  pin: PIN_DEMO,
  nombre: u.nombre,
  rol: u.rol,
  obra_id: ID.obra,
  cuadrilla_id: u.cuadrilla ? ID.cuadrilla(u.cuadrilla) : null,
}))

export const SUPERVISOR_ID = ID.usuario(9)

const P = [
  ['Instalar moldaje losa', ['Paneles nivelados', 'Puntales firmes', 'Área despejada'], 'Usa arnés: trabajo sobre 1,8 m de altura.'],
  ['Revisar alzaprimas', ['Alzaprimas aplomadas', 'Bases firmes', 'Área despejada'], 'Usa casco y guantes durante la revisión.'],
  ['Limpieza de área de trabajo', ['Escombros retirados', 'Herramientas guardadas', 'Acceso despejado'], 'Usa guantes y zapatos de seguridad.'],
  ['Instalar moldaje muro', ['Paneles aplomados', 'Tensores apretados', 'Desmoldante aplicado'], 'Usa arnés si trabajas sobre andamio.'],
  ['Descimbrar muro', ['Hormigón ya resistente', 'Paneles retirados y apilados', 'Clavos y restos retirados'], 'Mantén despejada la zona donde caen los paneles.'],
  ['Armar enfierradura losa', ['Barras según plano', 'Amarras firmes', 'Separadores puestos'], 'Usa guantes: las puntas de fierro cortan.'],
  ['Amarrar estribos', ['Distancia según plano', 'Amarras firmes', 'Puntas protegidas'], 'Protege las puntas de fierro con capuchones.'],
  ['Instalar separadores', ['Separadores cada 1 metro', 'Altura según plano', 'Fierros sin tocar el moldaje'], 'Camina solo por los tablones de paso.'],
  ['Revisar traslapes', ['Largo de traslape según plano', 'Amarras en cada traslape', 'Fierros limpios'], 'Usa guantes y antiparras.'],
  ['Estucar muro', ['Muro humedecido', 'Espesor parejo', 'Superficie reglada'], 'Usa antiparras y mascarilla.'],
  ['Instalar guardapolvos', ['Cortes a 45° en esquinas', 'Fijaciones firmes', 'Juntas selladas'], 'Usa antiparras al cortar.'],
  ['Pintar cielo', ['Superficie limpia', 'Dos manos aplicadas', 'Piso protegido'], 'Ventila el recinto mientras pintas.'],
  ['Sellar ventanas', ['Marco limpio y seco', 'Cordón de sello continuo', 'Sin sello en los vidrios'], 'Usa arnés si trabajas desde el exterior.'],
]

export const PLANTILLAS = P.map(([titulo, checklist, seguridad], i) => ({
  id: ID.plantilla(i + 1),
  obra_id: ID.obra,
  titulo,
  checklist,
  seguridad,
  orden: i + 1,
  activa: true,
}))

/* Marcas de tiempo relativas. El modo demo y el generador de SQL las resuelven cada uno a su manera. */
export const hace = (minutos) => ({ haceMin: minutos })
export const haceDias = (dias) => ({ haceDias: dias })

/* Tareas: [n, plantilla, cuadrilla, persona (o null = toda la cuadrilla), lugar, sector, estado, días atrás] */
const T = [
  [1, 1, 2, 1, 'Piso 3', 'Eje B-C', 'asignada', 0],
  [2, 2, 2, 1, 'Piso 3', 'Eje A', 'asignada', 0],
  [3, 3, 2, 1, 'Piso 3', 'Acceso norte', 'verificada', 0],
  [4, 5, 2, 1, 'Piso 2', 'Eje D', 'corregir', 0],
  [5, 4, 2, null, 'Piso 3', 'Eje D-E', 'asignada', 0],
  [6, 6, 1, 3, 'Piso 4', 'Eje A-B', 'verificada', 0],
  [7, 7, 1, 4, 'Piso 4', 'Eje C', 'verificada', 0],
  [8, 8, 1, 3, 'Piso 4', 'Eje A-B', 'por_verificar', 0],
  [9, 9, 1, 4, 'Piso 4', 'Eje D', 'asignada', 0],
  [10, 3, 1, null, 'Piso 4', 'Acceso norte', 'verificada', 0],
  [11, 10, 3, 5, 'Piso 1', 'Depto 101', 'verificada', 0],
  [12, 11, 3, 6, 'Piso 1', 'Depto 102', 'por_verificar', 0],
  [13, 12, 3, 5, 'Piso 1', 'Depto 103', 'asignada', 0],
  [14, 13, 3, 6, 'Piso 2', 'Depto 201', 'asignada', 0],
  [15, 3, 3, null, 'Piso 1', 'Pasillo', 'asignada', 0],
  /* Jornadas anteriores: alimentan "Tareas anteriores". */
  [16, 1, 2, 1, 'Piso 2', 'Eje B-C', 'verificada', 1],
  [17, 2, 2, 1, 'Piso 2', 'Eje A', 'verificada', 1],
  [18, 3, 2, 1, 'Piso 2', 'Acceso norte', 'verificada', 2],
  [19, 6, 1, 3, 'Piso 3', 'Eje A-B', 'verificada', 1],
]

/* Minutos atrás en que se cerró cada tarea de hoy que no sigue "asignada". */
const CIERRE = { 3: 120, 4: 90, 6: 140, 7: 110, 8: 25, 10: 60, 11: 130, 12: 12 }

const CORRECCION = { 4: { motivos: ['Falta terminar'], comentario: 'Quedan paneles sin retirar en el eje D.' } }

/**
 * Filas de la jornada con tiempos relativos ({haceMin} y {haceDias}).
 * Devuelve { tareas, evidencias, verificaciones, incidentes }.
 */
export function filasRelativas() {
  const tareas = []
  const evidencias = []
  const verificaciones = []

  for (const [n, p, c, persona, lugar, sector, estado, dias] of T) {
    const plantilla = PLANTILLAS[p - 1]
    const base = dias * 1440
    const cierre = base + (CIERRE[n] ?? 120)
    const cerrada = estado !== 'asignada'
    const revisada = estado === 'verificada' || estado === 'corregir'
    /* Una tarea de toda la cuadrilla la cierra el primer integrante de esa cuadrilla. */
    const autorId = persona ? ID.usuario(persona) : USUARIOS.find((u) => u.cuadrilla_id === ID.cuadrilla(c)).id

    tareas.push({
      id: ID.tarea(n),
      obra_id: ID.obra,
      cuadrilla_id: ID.cuadrilla(c),
      asignado_a: persona ? ID.usuario(persona) : null,
      plantilla_id: plantilla.id,
      titulo: plantilla.titulo,
      lugar,
      sector,
      checklist: plantilla.checklist,
      seguridad: plantilla.seguridad,
      estado,
      fecha: haceDias(dias),
      creada_por: SUPERVISOR_ID,
      creada_at: hace(base + 190),
      cerrada_at: cerrada ? hace(cierre) : null,
      cerrada_por: cerrada ? autorId : null,
      verificada_at: estado === 'verificada' ? hace(cierre - 20) : null,
    })

    if (cerrada) {
      evidencias.push({
        id: ID.evidencia(n),
        tarea_id: ID.tarea(n),
        obra_id: ID.obra,
        autor_id: autorId,
        checklist: plantilla.checklist.map(() => true),
        foto_path: null,
        foto_kb: null,
        tomada_at: hace(cierre),
      })
    }

    if (revisada) {
      const correccion = CORRECCION[n]
      verificaciones.push({
        id: ID.verificacion(n),
        tarea_id: ID.tarea(n),
        evidencia_id: ID.evidencia(n),
        supervisor_id: SUPERVISOR_ID,
        resultado: estado === 'verificada' ? 'aprobada' : 'corregir',
        motivos: correccion ? correccion.motivos : [],
        comentario: correccion ? correccion.comentario : null,
        creada_at: hace(cierre - 20),
      })
    }
  }

  const incidentes = [
    {
      id: ID.incidente(1),
      obra_id: ID.obra,
      clase: 'riesgo',
      tipo: 'caida',
      tarea_id: null,
      lugar: 'Piso 3',
      sector: null,
      nota: null,
      anonimo: true,
      reportero_id: null,
      foto_path: null,
      foto_kb: null,
      ocurrido_at: hace(4),
      estado: 'nuevo',
      atendido_por: null,
      atendido_at: null,
      cerrado_at: null,
    },
  ]

  return { tareas, evidencias, verificaciones, incidentes }
}

function fechaLocalDe(d) {
  const dos = (x) => String(x).padStart(2, '0')
  return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate())
}

/** Convierte las marcas relativas en fechas reales respecto de `ahora`. */
export function resolverTiempos(fila, ahora = new Date()) {
  const lista = {}
  for (const [clave, valor] of Object.entries(fila)) {
    if (valor && typeof valor === 'object' && !Array.isArray(valor) && 'haceMin' in valor) {
      lista[clave] = new Date(ahora.getTime() - valor.haceMin * 60000).toISOString()
    } else if (valor && typeof valor === 'object' && !Array.isArray(valor) && 'haceDias' in valor) {
      lista[clave] = fechaLocalDe(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - valor.haceDias))
    } else {
      lista[clave] = valor
    }
  }
  return lista
}

/** Datos de la jornada con fechas reales, listos para el modo demo. */
export function datosDeLaJornada(ahora = new Date()) {
  const r = filasRelativas()
  const resolver = (filas) => filas.map((f) => resolverTiempos(f, ahora))
  return {
    tareas: resolver(r.tareas),
    evidencias: resolver(r.evidencias),
    verificaciones: resolver(r.verificaciones),
    incidentes: resolver(r.incidentes),
  }
}

/** Perfil público de un usuario de ejemplo (sin la clave). */
export function perfilDe(usuario) {
  return {
    id: usuario.id,
    rut: usuario.rut,
    nombre: usuario.nombre,
    rol: usuario.rol,
    obra_id: usuario.obra_id,
    cuadrilla_id: usuario.cuadrilla_id,
    consentimiento_at: null,
  }
}
