# SITO · Prototipo navegable

Mockup en HTML de **SITO (Sistema Integral de Trazabilidad de Obras)** para pruebas de usabilidad. Es un solo archivo, `index.html`, sin dependencias ni internet. No tiene backend, cámara ni login reales.

| Archivo | Para qué |
|---|---|
| `index.html` | El prototipo completo (HTML, CSS y JS en un solo archivo). |
| `sw.js` | **Opcional.** Permite reabrir la app sin señal desde el ícono en la pantalla de inicio. |

## Publicar en GitHub Pages

1. Crea un repositorio público en GitHub (por ejemplo, `sito-prototipo`).
2. Sube `index.html` y `sw.js` a la raíz del repositorio con **Add file → Upload files → Commit changes**.
3. Entra a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guarda.
4. Espera uno o dos minutos. La dirección queda así: `https://TU-USUARIO.github.io/sito-prototipo/`.

**En Android** también puedes enviar `index.html` al celular y abrirlo como archivo. Desde un archivo local no se puede agregar a la pantalla de inicio con modo sin conexión.

**En iPhone no abras el archivo directamente.** Desde Archivos o WhatsApp se abre en una vista previa, no en Safari: el prototipo puede no funcionar y los resultados no se guardan. Usa siempre la dirección de GitHub Pages.

## Agregar a la pantalla de inicio

Abre la dirección **con señal** una vez y luego:

- **Android (Chrome):** menú ⋮ → **Agregar a la pantalla principal** → Agregar.
- **iPhone (Safari):** botón **Compartir** → **Agregar a inicio** → Agregar.

Con `sw.js` publicado, la app abre aunque el celular esté en modo avión. Antes de cada jornada de encuestas, ábrela una vez con señal para que tome la última versión.

## Modo encuestador

- **Abrir:** mantén presionado el logo **"SITO"** durante 2 segundos. En las pantallas sin logo, haz lo mismo en la esquina superior derecha. La persona encuestada no ve ninguna señal de este modo.
- **Antes de cada participante:** toca **Reiniciar prototipo** (dos toques) y escribe el ID (`T03`, `S01`, `E05`…). Al reiniciar se vuelve al estado inicial, pero no se borran los resultados.
- **Rol inicial:** *Trabajador · consentimiento* (pantalla 1), *Trabajador · tareas* (pantalla 2) o *Supervisor* (pantalla 6).
- **Prueba:** lee la instrucción en voz alta, toca **Iniciar** y entrega el celular. Mientras la prueba corre, aparece un punto gris de 8 px arriba a la derecha. Ese punto se vuelve verde cuando se detecta el fin.
  - P1, P2 y P4 terminan solas. Con eso se congelan el tiempo y los toques, y se guarda un **1 provisorio**.
  - P3 y P5 se cierran a mano.
  - En todos los casos, abre el panel y confirma el resultado: **1 = solo**, **0,5 = con ayuda** o **0 = no lo logró**.
- **Errores:** se cuentan solos cada vez que la persona toca algo que no lleva al objetivo, y se guarda en qué pantalla pasó. El botón **+1 error** suma los que observes tú.
- **Exportar:** **Descargar CSV** usa las mismas columnas que la planilla (`ID,PR,P1_exito,…,P5_seg`), con punto decimal. En iPhone, usa **Copiar al portapapeles** y pega el texto en la planilla. Hay un segundo CSV opcional con el detalle de cada error.
- Los resultados quedan guardados en ese celular (`localStorage`). **Exporta al final de cada jornada.**
- **En iPhone, usa siempre la misma vía.** Safari y el ícono de inicio guardan resultados por separado, así que lo que registres en uno no aparece en el otro. Usa el ícono, porque además Safari puede borrar los datos de un sitio que no se usa en 7 días. No uses navegación privada. El panel indica si la app se abrió desde el ícono, en el navegador o como archivo, y lo muestra en amarillo cuando hay riesgo.
