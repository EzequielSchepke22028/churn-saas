import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function Login() {
  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearError()
    const exito = await login(tenantSlug.trim(), email.trim(), password)
    if (exito) {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-canvas">
      
      {/* LEFT PANEL: Dark premium Vercel-style branding and real metric simulation */}
      <div className="hidden lg:flex lg:col-span-5 bg-ink text-white flex-col justify-between p-12 border-r border-border/10 select-none">
        
        {/* Top Branding Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-subtle">
            C
          </div>
          <span className="font-semibold tracking-tight text-sm">Churn-SaaS</span>
        </div>

        {/* Churn Prediction Real Data Visual Card */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium tracking-tight">
              Anticipá la pérdida de clientes con Machine Learning.
            </h2>
            <p className="text-sm text-ink-subtle">
              Procesamiento de datos transaccionales multi-tenant aislado con RLS a nivel de base de datos.
            </p>
          </div>

          {/* Interactive Metric Preview (Single Row Churn Telemetry) */}
          <div className="bg-black/40 border border-border/10 rounded-lg p-5 shadow-raised space-y-4">
            <div className="flex items-center justify-between border-b border-border/10 pb-3">
              <span className="text-xs text-ink-subtle font-mono uppercase tracking-wider">Telemetry Card_07</span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-950 text-red-400 border border-red-900">
                Alto Riesgo (Churn)
              </span>
            </div>
            
            <div className="space-y-3 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-ink-subtle">ID Cliente:</span>
                <span className="text-white font-semibold">USR-4982-ARS</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-subtle">Cargos Mensuales:</span>
                <span className="text-white font-semibold tabular-nums">$9,850.00 ARS</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-subtle">Meses de Antigüedad:</span>
                <span className="text-white font-semibold">2 meses</span>
              </div>
              
              <div className="border-t border-border/10 pt-3 flex items-center justify-between">
                <span className="text-xs text-ink-muted">Probabilidad de Fuga:</span>
                <span className="text-xl font-bold text-danger font-mono tabular-nums">
                  86.87%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div>
          <p className="text-xs text-ink-subtle">
            Ezequiel Schepke &copy; 2026. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Clean, elegant login form on a subtle light canvas */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 md:p-16">
        <div className="max-w-md w-full space-y-8 animate-slide-up">
          
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Iniciar Sesión
            </h1>
            <p className="text-sm text-ink-muted">
              Ingresá tus credenciales para acceder a tu panel administrativo.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Workspace / Tenant Slug */}
            <div>
              <label className="label" htmlFor="tenant-slug">
                Workspace Slug
              </label>
              <input
                id="tenant-slug"
                type="text"
                className="input"
                placeholder="ej: tenant-prueba"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                disabled={loading}
                required
                autoComplete="off"
              />
              <p className="help-text">
                El identificador único o subdominio asignado a tu negocio.
              </p>
            </div>

            {/* Email Address */}
            <div>
              <label className="label" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="gimnasio@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Backend Error Render with .error-text class */}
            {error && (
              <div className="p-3.5 bg-danger/5 border border-danger/10 rounded-md">
                <p className="error-text m-0">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full py-2.5 transition-shadow"
              disabled={loading || !tenantSlug || !email || !password}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verificando credenciales...</span>
                </div>
              ) : (
                'Ingresar al Workspace'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-4">
            <span className="text-xs text-ink-subtle font-mono">
              Aislamiento Multi-Tenant PostgreSQL RLS activo
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
