/* Prueba rápida contra el proyecto Supabase real, después de ejecutar los archivos SQL.

   Uso (PowerShell):
     $env:VITE_SUPABASE_URL="https://xxxx.supabase.co"; $env:VITE_SUPABASE_ANON_KEY="clave-anon"; npm run probar:supabase
   Uso (Git Bash / macOS / Linux):
     VITE_SUPABASE_URL=https://xxxx.supabase.co VITE_SUPABASE_ANON_KEY=clave-anon npm run probar:supabase

   Solo LEE datos: ingresa como Pedro (trabajador) y como Javiera (supervisora) y revisa
   que cada uno vea lo que le corresponde. No crea, cambia ni borra nada.
   Usa solo la clave pública "anon", igual que la app. */

import { createClient } from '@supabase/supabase-js'
import { PIN_DEMO, ID } from '../src/datos/semilla.js'
import { correoDeRut } from '../src/dominio/rut.js'

const url = process.env.VITE_SUPABASE_URL
const clave = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !clave) {
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Mira el comentario al inicio de este archivo.')
  process.exit(1)
}

let fallas = 0
const revisar = (nombre, cumple, detalle = '') => {
  if (!cumple) fallas++
  console.log((cumple ? '  ✓ ' : '  ✗ ') + nombre + (detalle ? '  (' + detalle + ')' : ''))
}

async function como(rut, nombre, prueba) {
  console.log('\n' + nombre + ' (' + rut + ')')
  const cliente = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await cliente.auth.signInWithPassword({ email: correoDeRut(rut), password: PIN_DEMO })
  revisar('ingresa con RUT y clave', !error && !!data?.user, error?.message)
  if (error) return
  await prueba(cliente, data.user.id)
  await cliente.auth.signOut()
}

await como('11111111-1', 'Trabajador', async (c, id) => {
  const perfil = await c.from('perfiles').select('id,nombre,rol,cuadrilla_id').eq('id', id).single()
  revisar('su perfil existe y es trabajador', perfil.data?.rol === 'trabajador', perfil.error?.message)

  const tareas = await c.from('tareas').select('id,cuadrilla_id')
  const cuadrillas = new Set((tareas.data ?? []).map((t) => t.cuadrilla_id))
  revisar('ve tareas, todas de su cuadrilla', !!tareas.data?.length && cuadrillas.size === 1 && cuadrillas.has(ID.cuadrilla(2)), (tareas.data?.length ?? 0) + ' tareas')

  const rut = await c.from('perfiles').select('rut')
  revisar('no puede leer el RUT de nadie', !!rut.error, rut.error ? 'rechazado, bien' : 'lo pudo leer')

  const incidentes = await c.from('incidentes').select('id')
  revisar('no ve incidentes ajenos', (incidentes.data ?? []).length === 0, (incidentes.data?.length ?? 0) + ' visibles')

  const plantillas = await c.from('plantillas_tarea').select('id')
  revisar('no ve las plantillas del supervisor', (plantillas.data ?? []).length === 0)

  const cambio = await c.from('tareas').update({ estado: 'verificada' }).eq('id', ID.tarea(1)).select('id')
  revisar('no puede cambiar el estado de una tarea directamente', !!cambio.error || (cambio.data ?? []).length === 0)
})

await como('99999999-9', 'Supervisor', async (c) => {
  const tareas = await c.from('tareas').select('id,cuadrilla_id')
  const cuadrillas = new Set((tareas.data ?? []).map((t) => t.cuadrilla_id))
  revisar('ve las tareas de las 3 cuadrillas', cuadrillas.size === 3, (tareas.data?.length ?? 0) + ' tareas')

  const incidentes = await c.from('incidentes').select('id,anonimo,reportero_id')
  revisar('ve los incidentes de la obra', (incidentes.data ?? []).length >= 1)
  revisar('los anónimos no traen reportero', (incidentes.data ?? []).filter((i) => i.anonimo).every((i) => i.reportero_id === null))

  const plantillas = await c.from('plantillas_tarea').select('id')
  revisar('ve las plantillas de tarea', (plantillas.data ?? []).length > 0, (plantillas.data?.length ?? 0) + ' plantillas')
})

console.log('\nSin sesión')
const anonimo = createClient(url, clave, { auth: { persistSession: false } })
const sinSesion = await anonimo.from('tareas').select('id')
revisar('sin sesión no se ve ninguna tarea', !!sinSesion.error || (sinSesion.data ?? []).length === 0)

console.log(fallas ? `\n${fallas} revisiones fallaron.` : '\nTodo en orden.')
process.exit(fallas ? 1 : 0)
