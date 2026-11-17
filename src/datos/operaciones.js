/* Operaciones: cada cosa que una persona hace y que el servidor debe recibir.

   Una operación lleva un id generado en el celular. El servidor usa ese id para
   reconocer un reenvío, así que mandar dos veces la misma operación nunca duplica nada.

   `aplicarLocal` refleja la operación en la copia del celular al instante,
   antes de que el servidor responda (o aunque no haya señal). */

import { puedeCerrar, puedeVerificar, estadoTrasVerificar } from '../dominio/tareas.js'

export const TIPOS_OPERACION = [
  'consentimiento',
  'cerrar_tarea',
  'reportar_incidente',
  'verificar_tarea',
  'crear_tarea',
  'atender_incidente',
  'cerrar_incidente',
]

/** UUID v4. Usa crypto.randomUUID y, en celulares antiguos, crypto.getRandomValues. */
export function nuevoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20)
}

/* Rutas de las fotos en el servidor. La de un incidente no incluye a quien la subió. */
export const rutaFotoTarea = (obraId, evidenciaId) => `obras/${obraId}/tareas/${evidenciaId}.jpg`
export const rutaFotoIncidente = (obraId, incidenteId) => `obras/${obraId}/incidentes/${incidenteId}.jpg`

/**
 * Crea una operación.
 * @param tipo        uno de TIPOS_OPERACION
 * @param usuarioId   quién la hizo en este celular (solo sirve para la cola local)
 * @param datos       contenido que viaja al servidor
 * @param extra       { id, ref_id, foto_id, resumen: { titulo, detalle } }
 */
export function nuevaOperacion(tipo, usuarioId, datos, extra = {}) {
  if (!TIPOS_OPERACION.includes(tipo)) throw new Error('Operación desconocida: ' + tipo)
  return {
    id: extra.id ?? nuevoId(),
    tipo,
    usuario_id: usuarioId,
    ref_id: extra.ref_id ?? null,
    foto_id: extra.foto_id ?? null,
    resumen: extra.resumen ?? null,
    datos,
    creado_at: extra.creado_at ?? new Date().toISOString(),
  }
}

/** Refleja una operación en la copia del celular. Debe llamarse dentro de una transacción. */
export async function aplicarLocal(db, op) {
  const d = op.datos
  switch (op.tipo) {
    case 'consentimiento': {
      await db.perfiles.where('id').equals(op.usuario_id).modify((p) => {
        if (!p.consentimiento_at) p.consentimiento_at = d.aceptado_at
      })
      return
    }
    case 'cerrar_tarea': {
      const ev = d.evidencia
      await db.evidencias.put(ev)
      const tarea = await db.tareas.get(ev.tarea_id)
      if (tarea && puedeCerrar(tarea.estado)) {
        await db.tareas.update(tarea.id, { estado: 'por_verificar', cerrada_at: ev.tomada_at, cerrada_por: ev.autor_id })
      }
      return
    }
    case 'reportar_incidente': {
      await db.incidentes.put(d.incidente)
      return
    }
    case 'verificar_tarea': {
      const v = d.verificacion
      await db.verificaciones.put(v)
      const tarea = await db.tareas.get(v.tarea_id)
      if (tarea && puedeVerificar(tarea.estado)) {
        await db.tareas.update(tarea.id, {
          estado: estadoTrasVerificar(v.resultado),
          verificada_at: v.resultado === 'aprobada' ? v.creada_at : null,
        })
      }
      return
    }
    case 'crear_tarea': {
      const existe = await db.tareas.get(d.tarea.id)
      if (!existe) await db.tareas.put(d.tarea)
      return
    }
    case 'atender_incidente': {
      const inc = await db.incidentes.get(d.incidente_id)
      if (inc && inc.estado === 'nuevo') {
        await db.incidentes.update(inc.id, { estado: 'en_atencion', atendido_por: d.por, atendido_at: d.en })
      }
      return
    }
    case 'cerrar_incidente': {
      const inc = await db.incidentes.get(d.incidente_id)
      if (inc && inc.estado !== 'cerrado') {
        await db.incidentes.update(inc.id, {
          estado: 'cerrado',
          cerrado_at: d.en,
          atendido_por: inc.atendido_por ?? d.por,
          atendido_at: inc.atendido_at ?? d.en,
        })
      }
      return
    }
    default:
      throw new Error('Operación desconocida: ' + op.tipo)
  }
}
