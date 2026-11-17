import { describe, it, expect } from 'vitest'
import { ID } from './semilla.js'
import { ErrorRed, ErrorRechazo, ErrorSesion } from './errores.js'
import {
  crearServidor,
  crearCelular,
  operacionCerrar,
  operacionIncidente,
  operacionVerificar,
  asentar,
} from '../pruebas/ayudas.js'

const PEDRO = '11111111-1'
const LUIS = '22222222-2'
const SUPERVISOR = '99999999-9'
const MOLDAJE_LOSA = ID.tarea(1)

describe('cola de envío del trabajador', () => {
  it('sin señal: la tarea se cierra en el celular y queda pendiente de envío', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    pedro.red.hay = false

    const tarea = await pedro.db.tareas.get(MOLDAJE_LOSA)
    const { op, foto } = operacionCerrar(pedro, tarea)
    await pedro.sinc.encolar(op, foto)
    const resultado = await pedro.sinc.enviarPendientes()

    expect(resultado).toMatchObject({ enviados: 0, pendientes: 1, motivo: 'sin_red' })
    expect((await pedro.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('por_verificar')
    expect(await pedro.db.cola.where('estado').equals('pendiente').count()).toBe(1)
    expect(await pedro.db.fotos.get(foto.id)).toBeTruthy()
    expect(pedro.sinc.leerEstado().sinSenal).toBe(true)
    /* El servidor todavía no sabe nada. */
    expect((await servidor.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('asignada')
    expect(await servidor.db.evidencias.where('tarea_id').equals(MOLDAJE_LOSA).count()).toBe(0)
  })

  it('al volver la señal, la tarea con foto y el incidente se envían una sola vez', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const incidentesAntes = await servidor.db.incidentes.count()
    pedro.red.hay = false

    const tarea = await pedro.db.tareas.get(MOLDAJE_LOSA)
    const cierre = operacionCerrar(pedro, tarea)
    await pedro.sinc.encolar(cierre.op, cierre.foto)
    const reporte = operacionIncidente(pedro, { anonimo: true })
    await pedro.sinc.encolar(reporte.op)
    await pedro.sinc.enviarPendientes()

    pedro.red.hay = true
    const resultado = await pedro.sinc.enviarPendientes()
    /* Reenvíos de más (otra vuelta del reloj, "Enviar ahora" repetido) no cambian nada. */
    await pedro.sinc.enviarPendientes({ incluirRechazados: true })
    await pedro.sinc.enviarPendientes()

    expect(resultado).toMatchObject({ enviados: 2, pendientes: 0, motivo: null })
    expect(await servidor.db.evidencias.where('tarea_id').equals(MOLDAJE_LOSA).count()).toBe(1)
    expect((await servidor.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('por_verificar')
    expect(await servidor.db.fotos.get(cierre.evidencia.foto_path)).toBeTruthy()
    expect(await servidor.db.incidentes.count()).toBe(incidentesAntes + 1)
    expect(await pedro.db.cola.where('estado').equals('enviado').count()).toBe(2)
    expect(pedro.sinc.leerEstado().sinSenal).toBe(false)
  })

  it('si la respuesta del servidor se pierde, el reintento no duplica el registro', async () => {
    const servidor = await crearServidor()
    let cortar = true
    const pedro = await crearCelular(servidor, PEDRO, {
      envolverRemoto: (remoto) => ({
        ...remoto,
        async enviar(op, foto) {
          await remoto.enviar(op, foto) // el servidor sí lo recibe…
          if (cortar) throw new ErrorRed('se cortó la respuesta') // …pero el celular no se entera
        },
      }),
    })

    const tarea = await pedro.db.tareas.get(MOLDAJE_LOSA)
    const { op, foto } = operacionCerrar(pedro, tarea)
    await pedro.sinc.encolar(op, foto)
    const primero = await pedro.sinc.enviarPendientes()
    expect(primero.pendientes).toBe(1)
    expect(await servidor.db.evidencias.where('tarea_id').equals(MOLDAJE_LOSA).count()).toBe(1)

    cortar = false
    const segundo = await pedro.sinc.enviarPendientes()
    expect(segundo).toMatchObject({ enviados: 1, pendientes: 0 })
    expect(await servidor.db.evidencias.where('tarea_id').equals(MOLDAJE_LOSA).count()).toBe(1)
    expect((await pedro.db.cola.toArray())[0].intentos).toBeGreaterThanOrEqual(1)
  })

  it('una descarga no pisa lo que sigue pendiente de envío', async () => {
    const servidor = await crearServidor()
    let bloquearEnvio = true
    const pedro = await crearCelular(servidor, PEDRO, {
      envolverRemoto: (remoto) => ({
        ...remoto,
        async enviar(op, foto) {
          if (bloquearEnvio) throw new ErrorRed()
          return remoto.enviar(op, foto)
        },
      }),
    })

    const tarea = await pedro.db.tareas.get(MOLDAJE_LOSA)
    const { op, foto } = operacionCerrar(pedro, tarea)
    await pedro.sinc.encolar(op, foto)
    await pedro.sinc.enviarPendientes()

    /* La descarga trae la tarea como "asignada" (el servidor no recibió el cierre). */
    expect(await pedro.sinc.descargar()).toBe(true)
    expect((await pedro.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('por_verificar')
    expect(await pedro.db.evidencias.where('tarea_id').equals(MOLDAJE_LOSA).count()).toBe(1)

    bloquearEnvio = false
    await asentar(pedro)
    expect((await servidor.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('por_verificar')
  })

  it('un registro rechazado no frena al resto de la cola', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const luis = await crearCelular(servidor, LUIS)
    pedro.red.hay = false

    /* Tarea de toda la cuadrilla: Pedro la cierra sin señal y Luis la cierra antes con señal. */
    const compartida = await pedro.db.tareas.get(ID.tarea(5))
    const dePedro = operacionCerrar(pedro, compartida)
    await pedro.sinc.encolar(dePedro.op, dePedro.foto)
    const reporte = operacionIncidente(pedro, { anonimo: false })
    await pedro.sinc.encolar(reporte.op)

    const deLuis = operacionCerrar(luis, await luis.db.tareas.get(ID.tarea(5)))
    await luis.sinc.encolar(deLuis.op, deLuis.foto)
    await asentar(luis)

    pedro.red.hay = true
    const resultado = await pedro.sinc.enviarPendientes()

    expect(resultado).toMatchObject({ enviados: 1, rechazados: 1, pendientes: 0 })
    const cola = await pedro.db.cola.orderBy('seq').toArray()
    expect(cola.map((o) => o.estado)).toEqual(['rechazado', 'enviado'])
    expect(cola[0].ultimo_error).toMatch(/ya estaba cerrada/)
    expect(await servidor.db.evidencias.where('tarea_id').equals(ID.tarea(5)).count()).toBe(1)
    expect(await servidor.db.incidentes.get(reporte.incidente.id)).toBeTruthy()
  })

  it('dos envíos pedidos a la vez mandan cada registro una sola vez', async () => {
    const servidor = await crearServidor()
    let llamadas = 0
    const pedro = await crearCelular(servidor, PEDRO, {
      envolverRemoto: (remoto) => ({
        ...remoto,
        async enviar(op, foto) {
          llamadas++
          return remoto.enviar(op, foto)
        },
      }),
    })
    pedro.red.hay = false
    const { op, foto } = operacionCerrar(pedro, await pedro.db.tareas.get(MOLDAJE_LOSA))
    await pedro.sinc.encolar(op, foto)
    await pedro.sinc.enviarPendientes()

    pedro.red.hay = true
    await Promise.all([pedro.sinc.enviarPendientes(), pedro.sinc.enviarPendientes(), pedro.sinc.enviarPendientes()])
    expect(llamadas).toBe(1)
  })

  it('si la sesión venció, el registro se queda en la cola y se avisa', async () => {
    const servidor = await crearServidor()
    let vencida = true
    const pedro = await crearCelular(servidor, PEDRO, {
      envolverRemoto: (remoto) => ({
        ...remoto,
        async enviar(op, foto) {
          if (vencida) throw new ErrorSesion()
          return remoto.enviar(op, foto)
        },
      }),
    })
    const { op, foto } = operacionCerrar(pedro, await pedro.db.tareas.get(MOLDAJE_LOSA))
    await pedro.sinc.encolar(op, foto)
    const resultado = await pedro.sinc.enviarPendientes()

    expect(resultado).toMatchObject({ enviados: 0, pendientes: 1, motivo: 'sesion' })
    expect(pedro.sinc.leerEstado().sesionVencida).toBe(true)

    vencida = false
    await asentar(pedro)
    expect(pedro.sinc.leerEstado().sesionVencida).toBe(false)
    expect((await servidor.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('por_verificar')
  })

  it('la limpieza borra lo enviado hace más de un día y conserva lo pendiente', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const uno = operacionCerrar(pedro, await pedro.db.tareas.get(MOLDAJE_LOSA))
    await pedro.sinc.encolar(uno.op, uno.foto)
    await asentar(pedro)
    pedro.red.hay = false
    const dos = operacionCerrar(pedro, await pedro.db.tareas.get(ID.tarea(2)))
    await pedro.sinc.encolar(dos.op, dos.foto)
    await pedro.sinc.enviarPendientes()

    const haceDosDias = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    const haceDiezDias = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
    await pedro.db.cola.where('id').equals(uno.op.id).modify({ enviado_at: haceDosDias })
    await pedro.db.fotos.toCollection().modify({ guardada_at: haceDiezDias })
    await pedro.sinc.limpiar()

    const cola = await pedro.db.cola.toArray()
    expect(cola.map((o) => o.id)).toEqual([dos.op.id])
    expect(await pedro.db.fotos.get(uno.foto.id)).toBeUndefined()
    expect(await pedro.db.fotos.get(dos.foto.id)).toBeTruthy()
  })
})

describe('ciclo completo entre trabajador y supervisor', () => {
  it('asignar → ejecutar → pedir corrección → volver a ejecutar → verificar', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const supervisor = await crearCelular(servidor, SUPERVISOR)

    /* El trabajador cierra la tarea. */
    const cierre1 = operacionCerrar(pedro, await pedro.db.tareas.get(MOLDAJE_LOSA))
    await pedro.sinc.encolar(cierre1.op, cierre1.foto)
    await asentar(pedro)

    /* El supervisor la ve por verificar y pide corrección. */
    await supervisor.sinc.descargar()
    const vista = await supervisor.db.tareas.get(MOLDAJE_LOSA)
    expect(vista.estado).toBe('por_verificar')
    await supervisor.sinc.ejecutarEnLinea(operacionVerificar(supervisor, vista, 'corregir', ['Foto poco clara'], 'Se ve borrosa.'))
    expect((await supervisor.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('corregir')

    /* El trabajador recibe el motivo. */
    await pedro.sinc.descargar()
    expect((await pedro.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('corregir')
    const pedidas = await pedro.db.verificaciones.where('tarea_id').equals(MOLDAJE_LOSA).toArray()
    expect(pedidas).toHaveLength(1)
    expect(pedidas[0]).toMatchObject({ resultado: 'corregir', motivos: ['Foto poco clara'], comentario: 'Se ve borrosa.' })

    /* La corrige y la vuelve a cerrar con otra foto. */
    const cierre2 = operacionCerrar(pedro, await pedro.db.tareas.get(MOLDAJE_LOSA))
    await pedro.sinc.encolar(cierre2.op, cierre2.foto)
    await asentar(pedro)

    /* El supervisor la aprueba. */
    await supervisor.sinc.descargar()
    await supervisor.sinc.ejecutarEnLinea(operacionVerificar(supervisor, await supervisor.db.tareas.get(MOLDAJE_LOSA), 'aprobada'))
    await pedro.sinc.descargar()

    expect((await pedro.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('verificada')
    expect(await servidor.db.evidencias.where('tarea_id').equals(MOLDAJE_LOSA).count()).toBe(2)
    const verificaciones = await servidor.db.verificaciones.where('tarea_id').equals(MOLDAJE_LOSA).sortBy('creada_at')
    expect(verificaciones.map((v) => v.resultado)).toEqual(['corregir', 'aprobada'])
    expect(verificaciones[1].evidencia_id).toBe(cierre2.evidencia.id)
  })

  it('el supervisor sin conexión no deja cambios a medias', async () => {
    const servidor = await crearServidor()
    const supervisor = await crearCelular(servidor, SUPERVISOR)
    const tarea = await supervisor.db.tareas.get(ID.tarea(8))
    supervisor.red.hay = false

    await expect(supervisor.sinc.ejecutarEnLinea(operacionVerificar(supervisor, tarea, 'aprobada'))).rejects.toBeInstanceOf(ErrorRed)
    expect((await supervisor.db.tareas.get(ID.tarea(8))).estado).toBe('por_verificar')
    expect((await servidor.db.tareas.get(ID.tarea(8))).estado).toBe('por_verificar')
    expect(await supervisor.db.cola.count()).toBe(0)
  })

  it('si el servidor rechaza al supervisor, el celular no muestra el cambio', async () => {
    const servidor = await crearServidor()
    const supervisor = await crearCelular(servidor, SUPERVISOR)
    const sinCerrar = await supervisor.db.tareas.get(MOLDAJE_LOSA)

    await expect(supervisor.sinc.ejecutarEnLinea(operacionVerificar(supervisor, sinCerrar, 'aprobada'))).rejects.toBeInstanceOf(ErrorRechazo)
    expect((await supervisor.db.tareas.get(MOLDAJE_LOSA)).estado).toBe('asignada')
  })

  it('un incidente anónimo llega al supervisor sin ningún dato de quien lo reportó', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const supervisor = await crearCelular(servidor, SUPERVISOR)

    /* Aunque se reporte desde una tarea asignada solo a Pedro, esa tarea no viaja. */
    const { op, incidente } = operacionIncidente(pedro, { anonimo: true, tarea_id: MOLDAJE_LOSA })
    await pedro.sinc.encolar(op)
    await asentar(pedro)
    await supervisor.sinc.descargar()

    const recibido = await supervisor.db.incidentes.get(incidente.id)
    expect(recibido).toMatchObject({ anonimo: true, reportero_id: null, tarea_id: null, estado: 'nuevo', lugar: 'Piso 3' })
    expect(JSON.stringify(recibido)).not.toContain(pedro.perfil.id)
    expect(JSON.stringify(await servidor.db.incidentes.get(incidente.id))).not.toContain(pedro.perfil.id)
  })
})
