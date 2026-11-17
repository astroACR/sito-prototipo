# SITO · Sistema Integral de Trazabilidad de Obras

Es una aplicación web que se instala en el celular (PWA) y tiene dos roles:

- **Trabajador:** recibe sus tareas, las cierra con checklist y foto, y reporta riesgos (también sin su nombre). Funciona **sin señal**: todo se guarda en el celular y se envía solo al volver la conexión.
- **Supervisor:** ve el avance de la obra, verifica el trabajo (aprobar o pedir corrección), asigna tareas y atiende incidentes. Trabaja con conexión.

El prototipo de validación que usamos en las pruebas de usabilidad sigue disponible, sin cambios, en [`legacy/`](legacy/). Ver la sección [Prototipo de validación](#prototipo-de-validación).

## Probarla en tu computador

Necesitas [Node.js](https://nodejs.org) 20 o más nuevo.

```bash
npm install
npm run dev
```

Abre la dirección que aparece (normalmente http://localhost:5173). Sin configurar nada, la app funciona en **modo demostración**: usa los datos de ejemplo de la obra "Torre Norte", guardados solo en ese navegador.

En la pantalla de ingreso hay botones para **entrar con un toque** como trabajador o como supervisor. Si prefieres escribir con el teclado de la app:

| Rol | RUT | Clave |
|---|---|---|
| Trabajador (Pedro Rojas, Cuadrilla 2) | 11.111.111-1 | 123456 |
| Trabajador (Luis Soto, Cuadrilla 2) | 22.222.222-2 | 123456 |
| Trabajadora (Ana Díaz, Cuadrilla 1) | 33.333.333-3 | 123456 |
| Supervisora (Javiera Muñoz) | 99.999.999-9 | 123456 |

La lista completa está al inicio de [`supabase/seed.sql`](supabase/seed.sql).

**Ver los dos roles a la vez en un computador:** abre una segunda ventana con `?dispositivo=sup` antes del `#`, por ejemplo `http://localhost:5173/?dispositivo=sup`. Es un segundo "celular" con su propia sesión que comparte la obra con la primera ventana.

**Probar sin señal:** en las herramientas del navegador (F12) → *Network* → *Offline*.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | App en modo desarrollo. |
| `npm test` | Pruebas: cola de envío, sincronización, fotos, flujo de tareas y reglas SQL (en un PostgreSQL en memoria). |
| `npm run build` | Versión para publicar, en `dist/`. |
| `npm run preview` | Sirve `dist/` para probarla como quedará publicada, con el modo sin señal incluido. |
| `npm run seed` | Regenera `supabase/seed.sql` y `supabase/reset-demo.sql` desde `src/datos/semilla.js`. |
| `npm run probar:supabase` | Revisa que el proyecto Supabase real responda y aplique las reglas de acceso. Solo lee datos. |
| `npm run db:…` | Comandos para administrar Supabase. Ver [Supabase](#supabase). |

## Supabase

Sin Supabase, cada celular tiene su propia copia de los datos. **Para que lo que hace el trabajador le llegue al supervisor en otro celular, hace falta Supabase.**

El proyecto ya está creado y configurado:

| | |
|---|---|
| Nombre | `sito` (organización *astroACR sandbox*) |
| Reference ID | `eprsowelxtpvtbsvnalk` |
| URL | `https://eprsowelxtpvtbsvnalk.supabase.co` |
| Región | Oregón (`us-west-2`) |

Ya tiene aplicadas las migraciones de [`supabase/migrations/`](supabase/migrations/) y los datos de ejemplo de [`supabase/seed.sql`](supabase/seed.sql). El registro abierto está desactivado: solo entran las personas que inscribe la obra.

### Usarlo desde tu computador

1. Copia `.env.example` como `.env.local` y completa:
   - `VITE_SUPABASE_URL=https://eprsowelxtpvtbsvnalk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=` la clave **publishable** (`sb_publishable_…`), de **Project Settings → API Keys**. También sirve la clave *anon* antigua.
2. `npm run dev`: la app deja de decir "Modo demostración" y usa los datos de la nube.

> **Las claves secretas (`sb_secret_…` o `service_role`) nunca van en la app, en `.env.local` ni en GitHub.** Dan acceso total a la base de datos. La app solo usa la clave pública, y las reglas de acceso de las migraciones deciden qué puede ver y hacer cada persona.

### Administrarlo con la CLI

La CLI de Supabase viene instalada con el proyecto (`npx supabase …`). La primera vez en cada computador:

```bash
npx supabase login                                     # abre el navegador
npm run db:enlazar -- --project-ref eprsowelxtpvtbsvnalk
```

| Comando | Para qué |
|---|---|
| `npm run probar:supabase` | Revisa, solo leyendo, que cada rol vea lo que le corresponde. Necesita las variables de `.env.local` en la terminal (ver el inicio de [`scripts/probar-supabase.mjs`](scripts/probar-supabase.mjs)). |
| `npm run db:reiniciar-demo` | Deja la jornada de ejemplo como al principio, con la fecha de hoy. No toca los usuarios. Pide confirmación. |
| `npm run db:borrar-fotos` | Borra las fotos subidas en las pruebas. Pide confirmación. |
| `npm run db:subir` | Aplica las migraciones nuevas de `supabase/migrations/` (y los datos de ejemplo, si cambiaron). |
| `npm run db:revisar` | Corre el revisor de seguridad y rendimiento de Supabase. |

**Para cambiar la base de datos**, crea un archivo nuevo en `supabase/migrations/` (con fecha y hora al inicio del nombre, como los existentes). Nunca edites una migración ya aplicada. Luego ejecuta `npm test` y `npm run db:subir`.

**No uses `supabase config push` con el `config.toml` completo:** cambiaría ajustes de la nube que no tienen que ver con SITO (por ejemplo, la verificación en dos pasos). `config.toml` es para un Supabase local.

**Ojo:** el plan gratis pausa el proyecto si pasa una semana sin uso. Antes de una presentación, entra al panel y reactívalo.

### Crear otro proyecto desde cero

1. Crea el proyecto en [supabase.com](https://supabase.com) y enlázalo con `npm run db:enlazar -- --project-ref <id>`.
2. `npm run db:subir`: aplica las migraciones y los datos de ejemplo.
3. En **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up*.
4. Sigue los pasos de "Usarlo desde tu computador" con la URL y la clave del proyecto nuevo.

## Publicar en GitHub Pages

La app se publica sola con [GitHub Actions](.github/workflows/deploy.yml) cada vez que se sube un cambio a `main`.

1. **Settings → Pages → Source: "GitHub Actions".** Antes estaba en "Deploy from a branch": hay que cambiarlo, porque el `index.html` de la raíz ya no es la app terminada, sino su punto de partida.
2. Para usar Supabase en la versión publicada: **Settings → Secrets and variables → Actions → pestaña Variables**. Crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores de `.env.local` (la clave pública). Sin ellas, se publica en modo demostración.
3. La dirección sigue siendo `https://TU-USUARIO.github.io/sito-prototipo/`.

En los celulares que ya tenían instalado el prototipo, la app nueva lo reemplaza sola la próxima vez que se abra con señal.

## Instalar en el celular

Abre la dirección **con señal** una vez y luego:

- **Android (Chrome):** menú ⋮ → **Agregar a la pantalla principal**.
- **iPhone (Safari):** botón **Compartir** → **Agregar a inicio**.

Desde el ícono, la app abre aunque el celular esté en modo avión.

**En iPhone, usa siempre el ícono.** Safari y el ícono guardan los datos por separado, así que lo que quede pendiente en uno no aparece en el otro. Además, iPhone no envía nada con la app cerrada: los registros pendientes se envían al abrirla con señal.

## Cómo está organizado el código

```
src/
  dominio/      Reglas del negocio sin pantallas: RUT, flujo de tareas, incidentes, fechas.
  datos/        Capa de datos. Las pantallas importan solo de datos/index.js.
                  servidor-demo.js     "servidor" del modo demo (mismas reglas que el SQL)
                  remoto-supabase.js   conexión a Supabase
                  sincronizacion.js    cola de envío y descargas
                  fotos.js             compresión y borrado de metadatos
                  semilla.js           datos de ejemplo (única fuente)
  componentes/  Piezas de pantalla trasladadas del prototipo (Button, TaskCard, Sheet…).
  pantallas/    comunes/ (ingreso, consentimiento), trabajador/, supervisor/
  estilos/      base.css (copiado del prototipo) y app.css (piezas nuevas)
  sw.js         Service worker
supabase/       migrations/ (tablas, reglas de acceso, ajustes), seed.sql, reset-demo.sql,
                config.toml (Supabase local) y sus pruebas
legacy/         Prototipo de validación, sin modificar
docs/           Decisiones del desarrollo y guion de la demo
```

Las decisiones que no estaban en el plan, y su motivo, están en [`docs/DECISIONES.md`](docs/DECISIONES.md). El paso a paso de la presentación está en [`docs/GUION-DEMO.md`](docs/GUION-DEMO.md).

## Prototipo de validación

El prototipo navegable de las pruebas de usabilidad está en [`legacy/index.html`](legacy/index.html) y se publica en `…/sito-prototipo/legacy/`. Mantiene el **modo encuestador**:

- **Abrir:** mantén presionado el logo **"SITO"** durante 2 segundos. En las pantallas sin logo, haz lo mismo en la esquina superior derecha.
- **Pruebas:** P1 a P5, con exportación a CSV (`ID,PR,P1_exito,…,P5_seg`).
- **Resultados:** quedan guardados en ese celular. Exporta al final de cada jornada.

`legacy/sw.js` queda solo como registro y no se publica. El prototipo abre sin señal gracias al service worker de la app nueva (ver [`docs/DECISIONES.md`](docs/DECISIONES.md)).
