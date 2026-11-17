import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { generarSeed, generarReset } from './generar-sql.mjs'

const leer = (nombre) => readFileSync(fileURLToPath(new URL('../supabase/' + nombre, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

describe('datos de ejemplo', () => {
  it('seed.sql y reset-demo.sql están al día con src/datos/semilla.js (si falla: npm run seed)', () => {
    expect(leer('seed.sql')).toBe(generarSeed())
    expect(leer('reset-demo.sql')).toBe(generarReset())
  })

  it('los archivos SQL no contienen claves de servicio', () => {
    for (const archivo of ['migrations/20261117000100_esquema.sql', 'migrations/20261117000200_politicas.sql', 'seed.sql', 'reset-demo.sql']) {
      expect(leer(archivo)).not.toMatch(/service_role\s*key|eyJhbGciOi/i)
    }
  })
})
