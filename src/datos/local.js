/* Base de datos del celular (IndexedDB, con Dexie).

   Guarda tres cosas:
   1. Una copia de los datos del servidor que la persona necesita (la "caché").
   2. La cola de envío: cada cosa hecha en el celular que el servidor aún no recibe.
   3. Las fotos y los borradores, para que nada se pierda si se cierra la app. */

import Dexie from 'dexie'

/** Tablas que son copia del servidor. Cada descarga las reemplaza completas. */
export const TABLAS_COPIA = ['obras', 'cuadrillas', 'perfiles', 'plantillas', 'tareas', 'evidencias', 'verificaciones', 'incidentes']

export function crearBaseLocal(nombre = 'sito-celular') {
  const db = new Dexie(nombre)
  db.version(1).stores({
    meta: 'clave',
    obras: 'id',
    cuadrillas: 'id, obra_id',
    perfiles: 'id, cuadrilla_id',
    plantillas: 'id',
    tareas: 'id, estado, cuadrilla_id, asignado_a, fecha',
    evidencias: 'id, tarea_id',
    verificaciones: 'id, tarea_id',
    incidentes: 'id, estado, tarea_id',
    /* Fotos en el celular: id = id de la evidencia o del incidente. */
    fotos: 'id, guardada_at',
    /* Avance de una tarea que aún no se termina: casillas marcadas y foto tomada. */
    borradores: 'tarea_id',
    /* Cola de envío. seq da el orden; id es la llave que evita duplicados en el servidor. */
    cola: '++seq, id, estado, usuario_id, ref_id',
  })
  return db
}

/** Borra la copia del servidor (al cambiar de usuario). No toca la cola ni las fotos. */
export async function vaciarCopia(db) {
  await db.transaction('rw', TABLAS_COPIA.map((t) => db[t]).concat(db.borradores), async () => {
    for (const tabla of TABLAS_COPIA) await db[tabla].clear()
    await db.borradores.clear()
  })
}

export async function leerMeta(db, clave, porDefecto = null) {
  const fila = await db.meta.get(clave)
  return fila ? fila.valor : porDefecto
}

export async function guardarMeta(db, clave, valor) {
  await db.meta.put({ clave, valor })
}
