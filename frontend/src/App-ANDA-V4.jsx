import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Configuracion from './pages/configuracion/Configuracion'
import Predicciones from './pages/predicciones/Predicciones'
import Billing from './pages/billing/Billing' // <-- Importamos nuestra nueva página de Suscripción/Billing
import ProtectedRoute from './routes/ProtectedRoute'
import PublicOnlyRoute from './routes/PublicOnlyRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/configuracion" element={
        <ProtectedRoute>
          <Configuracion />
        </ProtectedRoute>
      } />
      <Route path="/predicciones" element={
        <ProtectedRoute>
          <Predicciones />
        </ProtectedRoute>
      } />
      <Route path="/billing" element={
        <ProtectedRoute>
          <Billing />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
