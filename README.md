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

## Conectarla a Supabase

Sin Supabase, cada celular tiene su propia copia de los datos. **Para que lo que hace el trabajador le llegue al supervisor en otro celular, hace falta Supabase.**

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratis basta). Elige la región de São Paulo, que es la más cercana.
2. En **SQL Editor**, ejecuta en este orden el contenido de:
   1. [`supabase/schema.sql`](supabase/schema.sql): las tablas.
   2. [`supabase/policies.sql`](supabase/policies.sql): las reglas de acceso, las funciones y el bucket de fotos.
   3. [`supabase/seed.sql`](supabase/seed.sql): la obra "Torre Norte" con sus usuarios de ejemplo.
3. Revisa que en **Authentication → Providers**, *Email* esté activado.
4. En **Project Settings → API**, copia la *Project URL* y la clave pública **anon**.
5. Copia `.env.example` como `.env.local` y pega esos dos datos.
6. Comprueba la conexión con `npm run probar:supabase` (las instrucciones están al inicio de [`scripts/probar-supabase.mjs`](scripts/probar-supabase.mjs)) y luego con `npm run dev`.

> **La clave `service_role` nunca va en la app, en `.env.local` ni en GitHub.** Da acceso total a la base de datos. La app solo usa la clave pública **anon**, y las reglas de acceso de `policies.sql` deciden qué puede ver y hacer cada persona.

**Para reiniciar la demo**, ejecuta [`supabase/reset-demo.sql`](supabase/reset-demo.sql). Vuelve a dejar la jornada de ejemplo con la fecha de hoy, sin tocar los usuarios.

**Ojo:** el plan gratis de Supabase pausa el proyecto si pasa una semana sin uso. Antes de una presentación, entra al panel y reactívalo.

## Publicar en GitHub Pages

La app se publica sola con [GitHub Actions](.github/workflows/deploy.yml) cada vez que se sube un cambio a `main`.

1. **Settings → Pages → Source: "GitHub Actions".** Antes estaba en "Deploy from a branch": hay que cambiarlo, porque el `index.html` de la raíz ya no es la app terminada, sino su punto de partida.
2. Para usar Supabase en la versión publicada: **Settings → Secrets and variables → Actions → pestaña Variables**. Crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Sin ellas, se publica en modo demostración.
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
supabase/       schema.sql, policies.sql, seed.sql, reset-demo.sql y sus pruebas
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
