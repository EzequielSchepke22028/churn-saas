import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { suscribirse } from '../../services/billing'

const PLAN = {
  slug: 'plan-estandar',
  nombre: 'Plan Estándar',
  precio: 20000,
  moneda: 'ARS',
  caracteristicas: [
    'Predicciones ilimitadas',
    'Mapeo de columnas configurable',
    'Alertas automáticas por email',
    'Historial completo de predicciones',
  ],
}

function formatearPrecio(valor) {
  return valor.toLocaleString('es-AR')
}

export default function Billing() {
  const user = useAuthStore((state) => state.user)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const puedeGestionarBilling = user?.role === 'owner' || user?.role === 'admin'

  const handleSuscribirse = async () => {
    setCargando(true)
    setError(null)

    try {
      const data = await suscribirse(PLAN.slug)
      window.open(data.init_point, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const detalle = err.response?.data?.detail
      setError(typeof detalle === 'string' ? detalle : 'No se pudo iniciar la suscripción.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Suscripción
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Gestioná el plan de tu workspace.
        </p>

        <div className="card mt-8 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-ink">{PLAN.nombre}</h2>
          </div>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-mono tabular-nums text-3xl font-semibold text-ink">
              ${formatearPrecio(PLAN.precio)}
            </span>
            <span className="text-sm text-ink-muted">{PLAN.moneda} / mes</span>
          </div>

          <ul className="mt-6 space-y-2.5">
            {PLAN.caracteristicas.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink">
                <span className="text-accent mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-border pt-5">
            {!puedeGestionarBilling ? (
              <>
                <span className="badge-neutral">
                  Suscripción gestionada por el administrador
                </span>
                <button className="btn-secondary w-full mt-3" disabled>
                  Suscribirse ahora
                </button>
              </>
            ) : (
              <button
                onClick={handleSuscribirse}
                disabled={cargando}
                className="btn-accent w-full"
              >
                {cargando ? 'Generando link de pago…' : 'Suscribirse ahora'}
              </button>
            )}

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger animate-slide-up"
              >
                {error}
              </div>
            )}

            {puedeGestionarBilling && (
              <p className="mt-3 text-xs text-ink-subtle text-center">
                Se abrirá una pestaña nueva para autorizar el pago en Mercado Pago.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}