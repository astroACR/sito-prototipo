# Guion de la demo en vivo

Duración: unos 8 minutos. Hay dos celulares, uno de **trabajador** (Pedro) y otro de **supervisora** (Javiera).

## Antes de la presentación (el día anterior)

1. **Reinicia los datos.** Con Supabase, ejecuta `npm run db:reiniciar-demo` y `npm run db:borrar-fotos` (o pega `supabase/reset-demo.sql` en el editor SQL del panel). En modo demo, usa "Reiniciar datos de ejemplo" en la pantalla de ingreso de cada celular.
2. **Abre la app en los dos celulares con señal** y agrégala a la pantalla de inicio:
   - Android: menú ⋮ → **Agregar a la pantalla principal**.
   - iPhone: **Compartir → Agregar a inicio**.
3. **Ingresa una vez en cada celular** con estos datos:
   - Trabajador: RUT `11.111.111-1`, clave `123456`.
   - Supervisora: RUT `99.999.999-9`, clave `123456`.

   Acepta el consentimiento en el celular del trabajador y **no** en el de la supervisora: así la pantalla de consentimiento se puede mostrar en vivo.
4. **Comprueba que el cambio llega de un celular al otro.** Cierra una tarea de prueba en el trabajador, mira que aparezca en la supervisora y vuelve a reiniciar los datos (paso 1).
5. **Si Supabase estuvo una semana sin uso, el proyecto se pausa.** Entra al panel y reactívalo la mañana de la demo.
6. **Deja los dos celulares con brillo alto, sin bloqueo automático** y con el modo avión a mano.

> **Respaldo sin internet:** en un computador, abre la app en modo demo en dos ventanas. Una con la dirección normal y otra agregando `?dispositivo=sup` antes del `#`. Funciona sin servidor y sin red.

## En vivo

| # | Celular | Qué hacer | Qué decir |
|---|---|---|---|
| 1 | Supervisora | Abre la app. Lee el consentimiento y acéptalo. | "Lo primero es la transparencia: qué guarda SITO y para qué, según la Ley 21.719." |
| 2 | Supervisora | Muestra **Hoy**: indicadores, alerta de riesgo, avance por cuadrilla. | "Todos los números salen de los datos reales de la obra." |
| 3 | Trabajador | Abre la app: ya tiene la sesión abierta. Muestra **"Descimbrar muro" en Corregir**, arriba de todo, y tócala para ver el motivo. | "Lo que hay que corregir siempre aparece primero, con el motivo en palabras simples." |
| 4 | Trabajador | **Activa el modo avión.** Aparece "Sin señal". | "En obra la señal se corta. SITO sigue funcionando igual." |
| 5 | Trabajador | Abre **"Instalar moldaje losa"**, marca las 3 casillas, toca **Tomar foto y terminar**, saca la foto y toca **Terminar tarea**. | "Seis toques. La tarea queda guardada en el celular como *Pendiente de envío*." |
| 6 | Trabajador | **Reportar incidente → Riesgo de caída → Enviar reporte.** El reporte va sin nombre. | "El lugar ya viene cargado. El reporte parte anónimo: nadie sabrá quién lo envió." |
| 7 | Trabajador | Muestra **Por enviar** con los 2 registros. | "Aquí ve qué falta por enviar. No tiene que hacer nada más." |
| 8 | Trabajador | **Desactiva el modo avión.** Los registros desaparecen de "Por enviar". | "Al volver la señal se envían solos, una sola vez." |
| 9 | Supervisora | En **Hoy** aparecen la alerta nueva ("Anónimo · recién") y la tarea en "Por verificar". | "Le llega al instante, sin el nombre de quien reportó." |
| 10 | Supervisora | Toca la tarea: foto grande y checklist. **Pedir corrección → Foto poco clara → Pedir corrección.** | "Pedir una corrección es elegir un motivo, no escribir." |
| 11 | Trabajador | La tarea vuelve arriba en **Corregir**, con el motivo. La vuelve a cerrar con otra foto. | "El ciclo se cierra entre los dos celulares." |
| 12 | Supervisora | **Aprobar.** Luego **Incidentes → Atender → Cerrar.** | "Cada incidente queda con quién lo atendió y cuándo." |
| 13 | Supervisora | **Nueva tarea:** plantilla → Cuadrilla 2 → Pedro → Piso 4 → **Asignar tarea**. | "Asignar es elegir, en tres pasos." |
| 14 | Trabajador | La tarea nueva aparece en su lista. Muestra **Mi perfil → Letra más grande**. | "Pensado para quien no se lleva bien con el celular." |

## Si algo falla

- **"Sin conexión" en la supervisora:** el wifi del lugar falló. Usa los datos móviles del celular o pasa al respaldo en el computador.
- **No llega algo al otro celular:** en el celular que lo hizo, entra a **Por enviar** y toca **Enviar ahora**.
- **"Tu sesión se cerró":** toca **Ingresar de nuevo**. Lo guardado no se pierde.
