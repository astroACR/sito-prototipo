import { describe, it, expect } from 'vitest'
import { digitoVerificador, rutValido, formatearRut, normalizarRut, correoDeRut, limpiarRut } from './rut.js'
import {
  puedeCerrar,
  puedeVerificar,
  estadoTrasVerificar,
  vistaDeTarea,
  pasoActual,
  esDeHoy,
  esDelTrabajador,
  ordenarParaTrabajador,
  resumenDelDia,
  avancePorCuadrilla,
} from './tareas.js'
import { prepararIncidente, motivoDeRechazo } from './incidentes.js'
import { fechaLocal, restarDias, etiquetaDia, haceCuanto, nombreCorto } from './tiempo.js'
import { USUARIOS, CUADRILLAS, datosDeLaJornada, ID } from '../datos/semilla.js'

describe('RUT', () => {
  it('calcula el dígito verificador, incluidos 0 y K', () => {
    expect(digitoVerificador('12345678')).toBe('5')
    expect(digitoVerificador('11111111')).toBe('1')
    expect(digitoVerificador('6')).toBe('K')
    expect(digitoVerificador('14')).toBe('0')
  })

  it('valida y da formato', () => {
    expect(rutValido('12.345.678-5')).toBe(true)
    expect(rutValido('12.345.678-9')).toBe(false)
    expect(rutValido('1234')).toBe(false)
    expect(formatearRut('123456785')).toBe('12.345.678-5')
    expect(formatearRut('1111')).toBe('111-1')
    expect(limpiarRut('12.345.678-k extra 999')).toBe('12345678K')
    expect(normalizarRut('12.345.678-K')).toBe('12345678-k')
    expect(correoDeRut('11.111.111-1')).toBe('11111111-1@sito.local')
  })

  it('todos los usuarios de ejemplo tienen un RUT válido', () => {
    for (const u of USUARIOS) expect(rutValido(u.rut), u.rut).toBe(true)
  })
})

describe('flujo de la tarea', () => {
  it('solo se cierra lo abierto y solo se verifica lo cerrado', () => {
    expect(['asignada', 'por_verificar', 'verificada', 'corregir'].map(puedeCerrar)).toEqual([true, false, false, true])
    expect(['asignada', 'por_verificar', 'verificada', 'corregir'].map(puedeVerificar)).toEqual([false, true, false, false])
    expect(estadoTrasVerificar('aprobada')).toBe('verificada')
    expect(estadoTrasVerificar('corregir')).toBe('corregir')
    expect(() => estadoTrasVerificar('otra')).toThrow()
  })

  it('"pendiente de envío" es una marca del celular, no un estado', () => {
    const tarea = { estado: 'por_verificar' }
    expect(vistaDeTarea(tarea, { pendienteEnvio: true }).label).toBe('Pendiente de envío')
    expect(vistaDeTarea(tarea).label).toBe('Enviada · en revisión')
    expect(vistaDeTarea(tarea, { rol: 'supervisor' }).label).toBe('Por verificar')
    expect(vistaDeTarea({ estado: 'corregir' })).toMatchObject({ label: 'Corregir', chip: 'chip-red', tile: 'tile-red' })
    expect([pasoActual('asignada'), pasoActual('corregir'), pasoActual('por_verificar'), pasoActual('verificada')]).toEqual([1, 1, 2, 3])
  })

  it('las tareas por corregir van primero', () => {
    const orden = ordenarParaTrabajador([
      { id: 'a', estado: 'verificada', creada_at: '1' },
      { id: 'b', estado: 'asignada', creada_at: '2' },
      { id: 'c', estado: 'corregir', creada_at: '3' },
      { id: 'd', estado: 'por_verificar', creada_at: '0' },
    ]).map((t) => t.id)
    expect(orden).toEqual(['c', 'b', 'd', 'a'])
  })

  it('"hoy" incluye lo abierto de días anteriores y deja fuera lo cerrado antes', () => {
    const hoy = '2026-11-17'
    expect(esDeHoy({ estado: 'corregir', fecha: '2026-11-10' }, hoy)).toBe(true)
    expect(esDeHoy({ estado: 'verificada', fecha: '2026-11-17' }, hoy)).toBe(true)
    expect(esDeHoy({ estado: 'verificada', fecha: '2026-11-16' }, hoy)).toBe(false)
  })

  it('a cada persona le tocan sus tareas y las de toda su cuadrilla', () => {
    const pedro = { id: 'p', cuadrilla_id: 'c2' }
    expect(esDelTrabajador({ asignado_a: 'p', cuadrilla_id: 'c2' }, pedro)).toBe(true)
    expect(esDelTrabajador({ asignado_a: null, cuadrilla_id: 'c2' }, pedro)).toBe(true)
    expect(esDelTrabajador({ asignado_a: 'otro', cuadrilla_id: 'c2' }, pedro)).toBe(false)
    expect(esDelTrabajador({ asignado_a: null, cuadrilla_id: 'c1' }, pedro)).toBe(false)
  })

  it('los indicadores del supervisor salen de los datos de ejemplo', () => {
    const ahora = new Date(2026, 10, 17, 12, 0)
    const { tareas } = datosDeLaJornada(ahora)
    const hoy = fechaLocal(ahora)
    expect(resumenDelDia(tareas, hoy)).toEqual({ total: 15, cerradas: 7, porVerificar: 2 })
    expect(avancePorCuadrilla(tareas, CUADRILLAS, hoy).map((a) => a.porcentaje)).toEqual([80, 20, 40])
  })
})

describe('incidentes y anonimato', () => {
  const pedro = { id: ID.usuario(1), obra_id: ID.obra }

  it('un riesgo anónimo no lleva reportero ni tarea', () => {
    const inc = prepararIncidente({ id: 'x', clase: 'riesgo', tipo: 'caida', anonimo: true, tarea_id: 't1', lugar: 'Piso 3', ocurrido_at: 'ahora' }, pedro)
    expect(inc).toMatchObject({ anonimo: true, reportero_id: null, tarea_id: null, lugar: 'Piso 3', estado: 'nuevo' })
    expect(motivoDeRechazo(inc, pedro)).toBeNull()
  })

  it('un problema de tarea siempre va con nombre', () => {
    const inc = prepararIncidente({ id: 'x', clase: 'problema', tipo: 'falta_material', anonimo: true, tarea_id: 't1', ocurrido_at: 'ahora' }, pedro)
    expect(inc).toMatchObject({ anonimo: false, reportero_id: pedro.id, tarea_id: 't1' })
    expect(motivoDeRechazo(inc, pedro)).toBeNull()
  })

  it('el servidor rechaza los incidentes que rompen el anonimato', () => {
    const base = prepararIncidente({ id: 'x', clase: 'riesgo', tipo: 'caida', anonimo: true, ocurrido_at: 'ahora' }, pedro)
    expect(motivoDeRechazo({ ...base, reportero_id: pedro.id }, pedro)).toMatch(/anónimo/)
    expect(motivoDeRechazo({ ...base, tarea_id: 't1' }, pedro)).toMatch(/anónimo/)
    expect(motivoDeRechazo({ ...base, obra_id: 'otra' }, pedro)).toMatch(/otra obra/)
    expect(motivoDeRechazo({ ...base, estado: 'cerrado' }, pedro)).toBeTruthy()
  })
})

describe('fechas', () => {
  it('etiquetas de día y tiempo transcurrido', () => {
    expect(restarDias('2026-11-01', 1)).toBe('2026-10-31')
    expect(etiquetaDia('2026-11-17', '2026-11-17')).toBe('Hoy')
    expect(etiquetaDia('2026-11-16', '2026-11-17')).toBe('Ayer')
    expect(etiquetaDia('2026-11-13', '2026-11-17')).toBe('Viernes 13 nov')
    const ahora = new Date(2026, 10, 17, 12, 0)
    expect(haceCuanto(new Date(2026, 10, 17, 11, 56), ahora)).toBe('hace 4 min')
    expect(haceCuanto(new Date(2026, 10, 17, 9, 0), ahora)).toBe('hace 3 h')
    expect(haceCuanto(new Date(2026, 10, 17, 11, 59, 40), ahora)).toBe('recién')
    expect(nombreCorto('Pedro Rojas')).toBe('Pedro R.')
  })
})
