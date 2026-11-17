import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos/base.css'
import './estilos/app.css'
import './preferencias.js'
import App from './App.jsx'

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* Service worker: la app abre sin señal desde el ícono de inicio.
   Reemplaza al del prototipo (mismo nombre, sw.js en la raíz) y borra sus cachés. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
