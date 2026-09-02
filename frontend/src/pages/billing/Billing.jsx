import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const PLAN_DEVELOPER = {
  slug: 'licencia-desarrollo',
  nombre: 'Licencia de Desarrollo (V0)',
  precio: 0,
  moneda: 'ARS',
  caracteristicas: [
    'Predicciones de Churn ilimitadas',
    'Mapeo de columnas multi-tenant RLS',
    'Alertas asíncronas vía webhook a n8n',
    'Aislamiento estricto de base de datos',
  ],
}

export default function Billing() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-canvas p-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            Suscripción y Estado del Plan
          </h1>
          <p className="text-sm text-ink-muted">
            Información de licenciamiento activo para tu espacio de trabajo multi-tenant.
          </p>
        </div>
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary py-1.5 px-3 text-xs">
            Volver al Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        
        {/* TARJETA DE ESTADO ACTUAL */}
        <div className="card bg-surface border border-border shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-ink">Estado del Workspace</h2>
            <div>
              <span className="badge badge-success px-3 py-1 font-semibold">Licencia Activa</span>
            </div>
          </div>

          <div className="space-y-3 font-mono text-sm border-t border-border/50 pt-4">
            <div className="flex justify-between pb-2 border-b border-border/40">
              <span className="text-ink-muted">Plan contratado:</span>
              <span className="text-ink font-semibold">Licencia Developer (V0)</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/40">
              <span className="text-ink-muted">Monto Mensual:</span>
              <span className="text-success font-semibold">Gratis (Demo Sandbox)</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/40">
              <span className="text-ink-muted">Aislamiento RLS:</span>
              <span className="text-ink font-semibold text-xs">PostgreSQL Activo (app_user)</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/40">
              <span className="text-ink-muted">Canal de Alertas:</span>
              <span className="text-accent font-semibold text-xs">n8n / Webhook Local</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Próximo Cobro:</span>
              <span className="text-ink-muted">Sin vencimiento</span>
            </div>
          </div>
        </div>

        {/* TARJETA DE CONTRATACIÓN */}
        <div className="card bg-surface border border-border shadow-card p-6 overflow-hidden relative">
          <div className="border-b border-border/50 pb-4 mb-4">
            <h3 className="text-xl font-semibold text-ink">{PLAN_DEVELOPER.nombre}</h3>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-bold text-ink font-mono tracking-tight tabular-nums">
                $0
              </span>
              <span className="text-sm text-ink-muted ml-2">/ de por vida (Versión Local)</span>
            </div>
          </div>

          <ul className="space-y-2.5 mb-6 text-sm">
            {PLAN_DEVELOPER.caracteristicas.map((char, index) => (
              <li key={index} className="flex items-start gap-2 text-ink-muted">
                <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>{char}</span>
              </li>
            ))}
          </ul>

          <div className="p-4 bg-zinc-50 rounded-md border border-border/50 text-xs text-ink-muted flex items-start gap-2.5 mt-4">
            <span className="text-lg shrink-0">ℹ️</span>
            <p className="m-0 leading-relaxed font-mono">
              <strong>Nota de Versión 0:</strong> El módulo de pagos e integración con Mercado Pago (suscripciones recurrentes) está desactivado para simplificar la corrida local sin requerir credenciales Sandbox de producción.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
