# Decisiones tomadas durante el desarrollo

Decisiones que el plan no cubría, con el motivo de cada una. Están ordenadas por tema.

## Prototipo de validación (`/legacy`)

- **`legacy/sw.js` se guarda en el repositorio, pero no se publica.** Al activarse, borra todas las cachés que no son la suya, así que dejaría a la app nueva sin funcionar sin señal. Para que el prototipo siga abriendo sin conexión en `/legacy/`, el service worker nuevo guarda también `legacy/index.html`.
- **El service worker nuevo recarga las ventanas que venían del prototipo.** Cuando encuentra cachés `sito-proto-*`, las borra y recarga la página. Así, quien tenía el prototipo instalado ve la app nueva al tiro y no una mezcla de las dos.

## Ingreso y sesión

- **Al escribir el sexto número de la clave, se ingresa solo.** Es un toque menos. El botón "Ingresar" sigue ahí para quien lo busque.
- **El celular recuerda el último RUT que ingresó.** La próxima vez saluda por el nombre y pide solo la clave. "Usar otro RUT" lo olvida.
- **La sesión se activa recién después de la primera descarga.** Si se activa antes, al terminar la descarga la app cambia de pantalla por segunda vez y borra lo que la persona alcanzó a marcar (por ejemplo, la casilla del consentimiento). Las pruebas en el navegador encontraron este error y quedó corregido.
- **Al cerrar sesión no se pierde lo que quedó sin enviar.** La cola de envío es de cada persona. Se envía cuando esa misma persona vuelve a ingresar en ese celular. El panel de cierre de sesión lo explica.
- **El supervisor no tiene pestaña "Mi perfil".** Sus tres pestañas son Hoy · Tareas · Incidentes, y el máximo es tres. Su cuenta (letra más grande, política de datos, cerrar sesión) se abre con el botón de la obra, arriba a la derecha.

## Trabajador

- **"Mis tareas" muestra las tareas asignadas a la persona y las de toda su cuadrilla, pero no las asignadas a un compañero.** La regla del servidor deja ver todas las de la cuadrilla, como pide el plan. En la lista se filtran para que nadie vea tareas ajenas como si fueran suyas.
- **"Hoy" incluye todo lo que sigue abierto, aunque sea de días anteriores.** Una tarea por corregir de ayer no debe desaparecer de la lista.
- **El lugar del incidente se carga solo.** Se usa, en este orden: la tarea desde la que se abrió el reporte, la última tarea que la persona cerró hoy (ahí estaba trabajando) o su primera tarea por hacer. Se puede cambiar con un toque.
- **"Tengo un problema" se guarda como incidente de clase `problema`, siempre con nombre.** El supervisor necesita saber a quién ayudar. Los riesgos de seguridad (`riesgo`) parten anónimos.
- **El avance del checklist y la foto tomada se guardan en el celular apenas se marcan.** Si la app se cierra a mitad de camino, al volver la tarea sigue donde quedó.
- **Un registro que el servidor rechaza no frena al resto de la cola.** Queda en "Por enviar" con el motivo en palabras simples. "Enviar ahora" lo vuelve a intentar.
- **"Letra más grande" agranda todos los textos un 20 %.** Las cajas de alto fijo del prototipo (los tipos de incidente) pasaron a tener alto mínimo para que el texto no se corte.

## Supervisor

- **Las acciones del supervisor no pasan por la cola.** Si no hay señal, el aviso dice "Sin conexión. No se guardó: intenta de nuevo cuando tengas señal." y el celular no muestra un cambio que el servidor no recibió.
- **"Pedir corrección" exige al menos un motivo.** El comentario escrito es opcional.
- **Al tocar una tarea en la lista del supervisor se abre la pantalla de verificación.** Si la tarea aún no está cerrada, muestra su estado sin botones de decisión.

## Datos y seguridad

- **Los cambios de estado pasan solo por funciones SQL.** Esas funciones son `cerrar_tarea`, `verificar_tarea`, `atender_incidente`, `cerrar_incidente` y `aceptar_consentimiento`. La app no puede hacer un `UPDATE` directo a tareas ni a incidentes. Así el flujo de estados no se puede saltar.
- **Un incidente anónimo tampoco guarda la tarea desde la que se abrió.** Una tarea asignada a una sola persona la delataría. Lo exigen la política RLS, una restricción de la tabla y la app.
- **La foto de un incidente anónimo se sube sin sesión.** Storage guarda quién subió cada archivo, y subirla sin sesión deja ese dato vacío. Una política permite subir sin sesión solo a la carpeta de incidentes de una obra que exista.
- **El RUT de las personas no se puede leer desde la app.** El permiso de lectura de `perfiles` excluye esa columna.
- **Reenvíos sin `on conflict`.** Tareas e incidentes se envían con un `INSERT` simple. Si el registro ya existía, el servidor responde "llave duplicada" y la app lo toma como recibido. No se usa `upsert` porque PostgreSQL exige poder leer la fila, y quien reporta en forma anónima no puede leer su propio reporte. Las funciones SQL reconocen el reenvío por el id.
- **Las fotos se guardan sin metadatos (EXIF).** Además de volver a codificarlas en un canvas, la app borra los segmentos EXIF, XMP y de comentarios. Así no depende de lo que haga cada navegador.
- **La jornada se cuenta con la hora de Chile** (`America/Santiago`), no con la del servidor.
- **Al celular baja lo abierto más los últimos 14 días.** Es suficiente para "Tareas anteriores" sin llenar la memoria de un celular de gama baja.

## Modo demo

- **El "servidor" del modo demo es una segunda base de datos del navegador.** Aplica las mismas reglas que las políticas SQL. Así la cola de envío funciona de verdad: sin señal no "llega" nada.
- **El modo demo NO comparte datos entre dos celulares distintos.** Cada navegador tiene su propia copia. Para la presentación con dos celulares reales hace falta Supabase. Como respaldo, `?dispositivo=sup` en la dirección abre un segundo "celular" en el mismo navegador, con su propia sesión y la misma obra. Sirve para mostrar los dos roles en un computador con dos ventanas.
- **La librería de Supabase se carga solo cuando hay credenciales.** En modo demo el celular no la descarga ni la procesa. Con Supabase, la primera pantalla aparece antes de cargarla.
- **La tarea en "Corregir" de los datos de ejemplo está asignada a Pedro.** Así, al ingresar como trabajador, la demo muestra desde el principio cómo se ve una corrección.

## Supabase en la nube

- **Se usó el proyecto "sito" que ya existía en la organización, en vez de crear uno nuevo.** Estaba vacío: sin tablas, usuarios, fotos ni funciones. Crear otro habría dejado dos proyectos con el mismo nombre, y el plan gratis permite solo dos activos. Está en Oregón (`us-west-2`) y no en São Paulo, lo que suma algo de latencia desde Chile. En las pruebas, un registro llegó al servidor medio segundo después de volver la señal.
- **Los SQL pasaron a ser migraciones de la CLI** (`supabase/migrations/`). Así, aplicar cambios es un solo comando y Supabase lleva el registro de qué se aplicó. `seed.sql` quedó en `supabase/seed.sql`, que es donde la CLI lo busca.
- **Se usa la clave "publishable" (`sb_publishable_…`)**, que es la clave pública nueva de Supabase. La variable sigue llamándose `VITE_SUPABASE_ANON_KEY` y acepta también la clave *anon* antigua.
- **Registro abierto desactivado.** Con la clave pública, cualquiera podía crearse una cuenta (aunque sin perfil no veía nada). Ahora solo entran las personas inscritas por la obra. Se subió solo ese ajuste: el `config.toml` completo habría cambiado otras opciones de la nube que no tienen que ver con SITO.
- **Ajustes del revisor de seguridad de Supabase** (migración `…_ajustes_seguridad.sql`):
  - Las funciones que leen el perfil de la sesión pasaron al esquema `privado`, que la API no publica. Antes cualquiera podía llamarlas por internet; por ejemplo, sin sesión se podía preguntar si existía una obra.
  - Las reglas de acceso calculan la sesión una vez por consulta y no una vez por fila.
  - Se agregaron índices para las llaves que usan esas reglas.
- **Avisos del revisor que se dejaron a propósito:**
  - Las funciones de cambio de estado (`cerrar_tarea`, `verificar_tarea`, etc.) se pueden llamar desde la API: son la única puerta para cambiar estados y validan quién llama.
  - La protección contra claves filtradas sigue desactivada: rechazaría el PIN de demostración `123456`. Con personas reales hay que activarla y dar claves distintas.

## Pruebas

- **Los archivos SQL se prueban en un PostgreSQL real en memoria (PGlite).** Auth, Storage y Realtime están imitados en `supabase/pruebas/supabase-simulado.sql`. Esto no reemplaza probar contra el proyecto real: para eso está `npm run probar:supabase`.
- **`seed.sql` y `reset-demo.sql` se generan desde `src/datos/semilla.js`.** Así el modo demo y Supabase parten con los mismos datos. Una prueba falla si alguien edita uno sin regenerar el otro.
