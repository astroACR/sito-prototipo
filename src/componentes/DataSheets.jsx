/* Paneles con la política de datos y los derechos de la persona (Ley N° 21.719).
   Se usan en el consentimiento y en "Mi perfil". */

import Sheet from './Sheet.jsx'
import Button from './Button.jsx'

export function PolicySheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Política de datos de SITO">
      <ol>
        <li>SITO guarda la foto, el checklist y la hora de cierre de cada tarea, solo como evidencia del trabajo hecho.</li>
        <li>Las fotos se guardan sin la ubicación ni los datos del celular con que se tomaron.</li>
        <li>El lugar de una tarea o de un incidente es el de la obra (piso, eje). No se registra tu recorrido.</li>
        <li>Los reportes anónimos no guardan tu nombre, tu RUT ni la tarea desde la que los enviaste.</li>
        <li>Puedes pedir ver, corregir o eliminar tus datos en cualquier momento, según la Ley N° 21.719.</li>
      </ol>
      <Button onClick={onClose}>Cerrar</Button>
    </Sheet>
  )
}

export function RightsSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Tus derechos sobre tus datos">
      <p>La Ley N° 21.719 te da estos derechos sobre los datos que SITO guarda de ti:</p>
      <ol>
        <li><b>Ver</b> qué datos tuyos están guardados.</li>
        <li><b>Corregir</b> los que estén malos, como tu nombre o tu cuadrilla.</li>
        <li><b>Eliminar</b> tus datos cuando ya no se necesiten.</li>
        <li><b>Oponerte</b> a un uso que no corresponda a tu trabajo en la obra.</li>
      </ol>
      <p>Para usar cualquiera de estos derechos, pídeselo a tu supervisor o a la oficina de la obra. No necesitas dar una razón.</p>
      <Button onClick={onClose}>Cerrar</Button>
    </Sheet>
  )
}
