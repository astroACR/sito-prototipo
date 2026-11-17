import { describe, it, expect } from 'vitest'
import { ID, USUARIOS, PIN_DEMO } from './semilla.js'
import { ErrorCredenciales, ErrorRechazo } from './errores.js'
import { nuevaOperacion, nuevoId } from './operaciones.js'
import { crearServidor, crearCelular, operacionCerrar, operacionIncidente, operacionVerificar } from '../pruebas/ayudas.js'

const PEDRO = '11111111-1'
const ANA = '33333333-3'
const SUPERVISOR = '99999999-9'

describe('servidor de demostración: ingreso', () => {
  it('acepta el RUT con o sin puntos y rechaza una clave equivocada', async () => {
    const servidor = await crearServidor()
    expect((await servidor.ingresar('11.111.111-1', PIN_DEMO)).nombre).toBe('Pedro Rojas')
    expect((await servidor.ingresar('111111111', PIN_DEMO)).rol).toBe('trabajador')
    await expect(servidor.ingresar('11.111.111-1', '000000')).rejects.toBeInstanceOf(ErrorCredenciales)
    await expect(servidor.ingresar('12.345.678-5', PIN_DEMO)).rejects.toBeInstanceOf(ErrorCredenciales)
  })
})

describe('servidor de demostración: quién ve qué', () => {
  it('el trabajador ve sus tareas y las de su cuadrilla, nada de otras cuadrillas', async () => {
    const servidor = await crearServidor()
    const pedro = USUARIOS[0]
    const copia = await servidor.descargar(pedro.id)

    expect(copia.tareas.length).toBeGreaterThan(0)
    expect(copia.tareas.every((t) => t.cuadrilla_id === pedro.cuadrilla_id)).toBe(true)
    expect(copia.tareas.some((t) => t.asignado_a === null)).toBe(true)
    expect(copia.plantillas).toEqual([])
    /* No ve incidentes ajenos, ni siquiera el anónimo de ejemplo. */
    expect(copia.incidentes).toEqual([])
  })

  it('el supervisor ve todas las tareas e incidentes de su obra', async () => {
    const servidor = await crearServidor()
    const copia = await servidor.descargar(ID.usuario(9))
    const cuadrillas = new Set(copia.tareas.map((t) => t.cuadrilla_id))

    expect(cuadrillas.size).toBe(3)
    expect(copia.incidentes).toHaveLength(1)
    expect(copia.plantillas.length).toBeGreaterThan(5)
  })

  it('el RUT de los compañeros nunca sale del servidor', async () => {
    const servidor = await crearServidor()
    for (const quien of [ID.usuario(1), ID.usuario(9)]) {
      const copia = await servidor.descargar(quien)
      expect(copia.perfiles.length).toBe(USUARIOS.length)
      expect(copia.perfiles.every((p) => !('rut' in p))).toBe(true)
    }
  })
})

describe('servidor de demostración: reglas', () => {
  it('rechaza cerrar una tarea de otra cuadrilla', async () => {
    const servidor = await crearServidor()
    const ana = await crearCelular(servidor, ANA)
    const ajena = await servidor.db.tareas.get(ID.tarea(1))
    const { op, foto } = operacionCerrar(ana, ajena)

    await expect(servidor.recibir(op, ana.perfil.id, foto)).rejects.toBeInstanceOf(ErrorRechazo)
    expect((await servidor.db.tareas.get(ID.tarea(1))).estado).toBe('asignada')
    expect(await servidor.db.evidencias.get(op.id)).toBeUndefined()
  })

  it('rechaza un incidente anónimo que trae el nombre o la tarea de quien reporta', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const { op, incidente } = operacionIncidente(pedro, { anonimo: true })

    const conNombre = { ...op, id: nuevoId(), datos: { incidente: { ...incidente, id: nuevoId(), reportero_id: pedro.perfil.id } } }
    await expect(servidor.recibir(conNombre, pedro.perfil.id)).rejects.toBeInstanceOf(ErrorRechazo)

    const conTarea = { ...op, id: nuevoId(), datos: { incidente: { ...incidente, id: nuevoId(), tarea_id: ID.tarea(1) } } }
    await expect(servidor.recibir(conTarea, pedro.perfil.id)).rejects.toBeInstanceOf(ErrorRechazo)

    expect(await servidor.db.incidentes.count()).toBe(1)
  })

  it('rechaza un reporte con nombre que suplanta a otra persona', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const { op, incidente } = operacionIncidente(pedro, { anonimo: false })
    const suplantado = { ...op, datos: { incidente: { ...incidente, reportero_id: ID.usuario(2) } } }

    await expect(servidor.recibir(suplantado, pedro.perfil.id)).rejects.toBeInstanceOf(ErrorRechazo)
  })

  it('solo el supervisor verifica, y solo tareas ya cerradas', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const supervisor = await crearCelular(servidor, SUPERVISOR)
    const porVerificar = await servidor.db.tareas.get(ID.tarea(8))
    const asignada = await servidor.db.tareas.get(ID.tarea(1))

    await expect(servidor.recibir(operacionVerificar(pedro, porVerificar, 'aprobada'), pedro.perfil.id)).rejects.toBeInstanceOf(ErrorRechazo)
    await expect(servidor.recibir(operacionVerificar(supervisor, asignada, 'aprobada'), supervisor.perfil.id)).rejects.toBeInstanceOf(ErrorRechazo)

    await servidor.recibir(operacionVerificar(supervisor, porVerificar, 'aprobada'), supervisor.perfil.id)
    expect((await servidor.db.tareas.get(ID.tarea(8))).estado).toBe('verificada')
  })

  it('solo el supervisor asigna tareas, y quedan a nombre de quien las creó', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    const supervisor = await crearCelular(servidor, SUPERVISOR)
    const tarea = {
      id: nuevoId(),
      obra_id: ID.obra,
      cuadrilla_id: ID.cuadrilla(2),
      asignado_a: null,
      plantilla_id: ID.plantilla(1),
      titulo: 'Instalar moldaje losa',
      lugar: 'Piso 4',
      sector: null,
      checklist: ['Paneles nivelados'],
      seguridad: 'Usa arnés.',
      estado: 'verificada', // un intento de crearla ya verificada no debe pasar
      fecha: '2026-11-17',
      creada_por: ID.usuario(1),
      creada_at: new Date().toISOString(),
    }

    await expect(servidor.recibir(nuevaOperacion('crear_tarea', pedro.perfil.id, { tarea }), pedro.perfil.id)).rejects.toBeInstanceOf(ErrorRechazo)

    const op = nuevaOperacion('crear_tarea', supervisor.perfil.id, { tarea }, { id: tarea.id })
    await servidor.recibir(op, supervisor.perfil.id)
    await servidor.recibir(op, supervisor.perfil.id) // reenvío
    const guardada = await servidor.db.tareas.get(tarea.id)
    expect(guardada).toMatchObject({ estado: 'asignada', creada_por: supervisor.perfil.id })

    /* Y le llega al trabajador de esa cuadrilla. */
    await pedro.sinc.descargar()
    expect(await pedro.db.tareas.get(tarea.id)).toBeTruthy()
  })

  it('atender y cerrar un incidente respeta el orden y es repetible', async () => {
    const servidor = await crearServidor()
    const supervisor = await crearCelular(servidor, SUPERVISOR)
    const id = ID.incidente(1)
    const en = new Date().toISOString()
    const atender = nuevaOperacion('atender_incidente', supervisor.perfil.id, { incidente_id: id, por: supervisor.perfil.id, en })
    const cerrar = nuevaOperacion('cerrar_incidente', supervisor.perfil.id, { incidente_id: id, por: supervisor.perfil.id, en })

    await servidor.recibir(atender, supervisor.perfil.id)
    await servidor.recibir(atender, supervisor.perfil.id)
    expect(await servidor.db.incidentes.get(id)).toMatchObject({ estado: 'en_atencion', atendido_por: supervisor.perfil.id })
    await servidor.recibir(cerrar, supervisor.perfil.id)
    await servidor.recibir(atender, supervisor.perfil.id) // no lo reabre
    expect((await servidor.db.incidentes.get(id)).estado).toBe('cerrado')
  })

  it('avisa a quienes escuchan cuando algo cambia, y reiniciar deja los datos como al principio', async () => {
    const servidor = await crearServidor()
    const pedro = await crearCelular(servidor, PEDRO)
    let avisos = 0
    const dejar = servidor.observar(() => avisos++)
    await new Promise((r) => setTimeout(r, 50))

    const { op, foto } = operacionCerrar(pedro, await servidor.db.tareas.get(ID.tarea(1)))
    await servidor.recibir(op, pedro.perfil.id, foto)
    await new Promise((r) => setTimeout(r, 100))
    expect(avisos).toBeGreaterThanOrEqual(1)
    dejar()

    await servidor.reiniciar()
    expect((await servidor.db.tareas.get(ID.tarea(1))).estado).toBe('asignada')
    expect(await servidor.db.fotos.count()).toBe(0)
    expect(await servidor.db.incidentes.count()).toBe(1)
  })
})
