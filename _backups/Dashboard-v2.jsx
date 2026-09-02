import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-canvas p-8 flex flex-col justify-between select-none animate-fade-in">
      <div>
        {/* Barra superior de navegación */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            Dashboard de Monitoreo
          </h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/configuracion')} 
              className="btn bg-accent text-white hover:bg-accent-hover"
            >
              Configurar Workspace
            </button>
            <button onClick={logout} className="btn-secondary">
              Cerrar sesión
            </button>
          </div>
        </div>
        
        {/* Cuerpo principal del Dashboard */}
        <div className="card max-w-md p-6 bg-surface border border-border shadow-card">
          <span className="badge badge-success mb-3">Sesión Activa</span>
          <h2 className="text-lg font-medium text-ink mb-4">Información de Conexión</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-ink-muted">Usuario:</span>
              <span className="text-ink font-semibold">{user?.email || 'gimnasio@test.com'}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-ink-muted">Rol:</span>
              <span className="text-ink font-semibold uppercase">{user?.role || 'owner'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-ink-muted">ID de Sesión:</span>
              <span className="text-xs text-ink-muted select-all truncate max-w-[200px]" title={user?.id}>
                {user?.id || 'dc2f4eb0-1483-4f1e-8143-dd6ac08e8826'}
              </span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
            <p className="text-xs text-ink-muted leading-relaxed">
              ¡Felicidades, Eze! Lograste conectar el frontend con tu backend en FastAPI bajo PostgreSQL con aislamiento RLS.
            </p>
            <button 
              onClick={() => navigate('/configuracion')} 
              className="btn btn-secondary w-full text-xs text-accent-active border-accent-border/40 hover:bg-accent-subtle"
            >
              Ver Mapeo de Columnas ➔
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-ink-subtle font-mono mt-8">
        CRM Multi-Tenant &copy; 2026
      </div>
    </div>
  )
}
