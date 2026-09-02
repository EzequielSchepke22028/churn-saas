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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-subtle">
              C
            </div>
            <h1 className="text-2xl font-semibold text-ink tracking-tight">
              Dashboard de Monitoreo
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/billing')} 
              className="btn bg-accent text-white hover:bg-accent-hover text-xs py-1.5 px-3"
            >
              💳 Mi Suscripción
            </button>
            <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">
              Cerrar sesión
            </button>
          </div>
        </div>
        
        {/* Cuerpo principal del Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto">
          
          {/* Tarjeta de Información de Conexión */}
          <div className="md:col-span-4 card p-6 bg-surface border border-border shadow-card flex flex-col justify-between">
            <div>
              <span className="badge badge-success mb-3">Sesión Activa</span>
              <h2 className="text-lg font-medium text-ink mb-4">Información de Conexión</h2>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-ink-muted">Usuario:</span>
                  <span className="text-ink font-semibold truncate max-w-[130px]" title={user?.email}>{user?.email || 'gimnasio@test.com'}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-ink-muted">Rol:</span>
                  <span className="text-ink font-semibold uppercase">{user?.role || 'owner'}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-ink-muted">ID de Sesión:</span>
                  <span className="text-xs text-ink-muted select-all truncate max-w-[130px]" title={user?.id}>
                    {user?.id || 'dc2f4eb0-1483-4f1e-8143-dd6ac08e8826'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-ink-muted leading-relaxed mt-6 pt-4 border-t border-border/50">
              Aislamiento Multi-Tenant PostgreSQL RLS activo de forma transparente para este espacio de trabajo.
            </p>
          </div>

          {/* Tarjetas de Accesos Directos de Negocio (Grid) */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Acceso Directo 1: Predicciones */}
            <div className="card-interactive p-6 bg-surface border border-border shadow-card flex flex-col justify-between h-[210px]">
              <div>
                <span className="text-2xl mb-2 block">📊</span>
                <h3 className="text-base font-semibold text-ink mb-1.5">Analizar Clientes (CSV)</h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Carga tus datasets transaccionales para predecir probabilidades de fuga en tiempo real mediante el pipeline de Machine Learning.
                </p>
              </div>
              <button 
                onClick={() => navigate('/predicciones')} 
                className="btn btn-primary w-full text-xs py-1.5 mt-4"
              >
                Iniciar Carga de CSV ➔
              </button>
            </div>

            {/* Acceso Directo 2: Configuración de Mapeos */}
            <div className="card-interactive p-6 bg-surface border border-border shadow-card flex flex-col justify-between h-[210px]">
              <div>
                <span className="text-2xl mb-2 block">⚙️</span>
                <h3 className="text-base font-semibold text-ink mb-1.5">Configurar Workspace</h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Establece las equivalencias de columnas de tu base de datos local contra el pipeline de entrenamiento sin tocar consultas SQL manuales.
                </p>
              </div>
              <button 
                onClick={() => navigate('/configuracion')} 
                className="btn btn-secondary w-full text-xs py-1.5 mt-4"
              >
                Mapear Columnas ➔
              </button>
            </div>

            {/* Acceso Directo 3: Suscripción / Billing */}
            <div className="card-interactive p-6 bg-surface border border-border shadow-card flex flex-col justify-between h-[210px] sm:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-md">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">💳</span>
                    <h3 className="text-base font-semibold text-ink">Planes y Facturación</h3>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Gestiona el plan de suscripción de tu workspace. Suscríbete al Plan Estándar por $20.000 ARS/mes utilizando Mercado Pago de forma 100% automatizada.
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/billing')} 
                  className="btn btn-accent text-xs py-2 px-6 sm:w-auto w-full"
                >
                  Gestionar Plan ➔
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      <div className="text-center text-xs text-ink-subtle font-mono mt-8">
        CRM Multi-Tenant &copy; 2026
      </div>
    </div>
  )
}
