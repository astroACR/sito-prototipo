/* Rutas de la app. Se usa HashRouter (…/#/tareas) porque GitHub Pages no sabe responder
   a una dirección como …/tareas al recargar la página. */

import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ToastProvider } from './componentes/Toast.jsx'
import { usePerfil } from './datos/index.js'
import { RAIZ } from './navegacion.js'

import Ingreso from './pantallas/comunes/Ingreso.jsx'
import Consentimiento from './pantallas/comunes/Consentimiento.jsx'
import MisTareas from './pantallas/trabajador/MisTareas.jsx'
import DetalleTarea from './pantallas/trabajador/DetalleTarea.jsx'
import FotoTarea from './pantallas/trabajador/FotoTarea.jsx'
import ReportarIncidente from './pantallas/trabajador/ReportarIncidente.jsx'
import PorEnviar from './pantallas/trabajador/PorEnviar.jsx'
import MiPerfil from './pantallas/trabajador/MiPerfil.jsx'
import TareasAnteriores from './pantallas/trabajador/TareasAnteriores.jsx'
import Hoy from './pantallas/supervisor/Hoy.jsx'
import Verificar from './pantallas/supervisor/Verificar.jsx'
import Tareas from './pantallas/supervisor/Tareas.jsx'
import NuevaTarea from './pantallas/supervisor/NuevaTarea.jsx'
import { ListaIncidentes, DetalleIncidente } from './pantallas/supervisor/Incidentes.jsx'

/** Adónde va cada persona al abrir la app. */
function destino(perfil) {
  if (!perfil) return '/ingreso'
  if (!perfil.consentimiento_at) return '/consentimiento'
  return RAIZ[perfil.rol] ?? '/ingreso'
}

function Inicio() {
  return <Navigate to={destino(usePerfil())} replace />
}

/** Deja pasar solo a quien ingresó, aceptó el uso de sus datos y tiene el rol de la sección. */
function Protegida({ rol }) {
  const perfil = usePerfil()
  if (!perfil || !perfil.consentimiento_at || perfil.rol !== rol) return <Navigate to={destino(perfil)} replace />
  return <Outlet />
}

function SoloSinSesion() {
  return usePerfil() ? <Navigate to="/" replace /> : <Ingreso />
}

function SoloSinConsentimiento() {
  const perfil = usePerfil()
  if (!perfil || perfil.consentimiento_at) return <Navigate to="/" replace />
  return <Consentimiento />
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <main className="view">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/ingreso" element={<SoloSinSesion />} />
            <Route path="/consentimiento" element={<SoloSinConsentimiento />} />

            <Route element={<Protegida rol="trabajador" />}>
              <Route path="/tareas" element={<MisTareas />} />
              <Route path="/tareas/:id" element={<DetalleTarea />} />
              <Route path="/tareas/:id/foto" element={<FotoTarea />} />
              <Route path="/incidente" element={<ReportarIncidente />} />
              <Route path="/por-enviar" element={<PorEnviar />} />
              <Route path="/perfil" element={<MiPerfil />} />
              <Route path="/anteriores" element={<TareasAnteriores />} />
            </Route>

            <Route element={<Protegida rol="supervisor" />}>
              <Route path="/hoy" element={<Hoy />} />
              <Route path="/sup/tareas" element={<Tareas />} />
              <Route path="/sup/verificar/:id" element={<Verificar />} />
              <Route path="/sup/nueva" element={<NuevaTarea />} />
              <Route path="/sup/incidentes" element={<ListaIncidentes />} />
              <Route path="/sup/incidentes/:id" element={<DetalleIncidente />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ToastProvider>
    </HashRouter>
  )
}
