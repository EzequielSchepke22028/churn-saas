import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { getSuscripcion, suscribirse } from '../../services/billing'

const PLAN_ESTANDAR = {
  slug: 'plan-estandar',
  nombre: 'Plan Estándar',
  precio: 20000,
  moneda: 'ARS',
  caracteristicas: [
    'Predicciones de Churn ilimitadas',
    'Mapeo de columnas multi-tenant RLS',
    'Alertas asíncronas vía webhook a n8n',
    'Logs y auditoría completa de predicciones',
  ],
}

function formatearPrecio(valor) {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '—'
  try {
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return fechaStr
  }
}

export default function Billing() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  // Estados de carga e información de suscripción
  const [suscripcion, setSuscripcion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [successUrl, setSuccessUrl] = useState(null)

  // Roles y permisos
  const userRole = user?.role || 'colaborador'
  const puedeGestionarBilling = userRole === 'owner' || userRole === 'admin'

  // Declaramos cargarSuscripcion ANTES de ser llamada en useEffect para evitar hoisting/ReferenceError de ESLint
  const cargarSuscripcion = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSuscripcion()
      setSuscripcion(data)
    } catch (err) {
      console.error('Error al obtener la suscripción:', err)
      setError(err.response?.data?.detail || 'No se pudo conectar con el servidor para obtener la información de suscripción.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  //  cargarSuscripcion();
  }, [])

  const handleSuscribirse = async (e) => {
    e.preventDefault()
    if (!puedeGestionarBilling || procesando) return
    setProcesando(true)
    setError(null)
    setSuccessUrl(null)

    try {
      const result = await suscribirse(PLAN_ESTANDAR.slug)
      if (result.init_point) {
        // Redirige transparentemente al checkout en una nueva pestaña
        window.open(result.init_point, '_blank', 'noopener,noreferrer')
        setSuccessUrl(result.init_point)
        // Recargar el estado local después del inicio del alta
        cargarSuscripcion()
      } else {
        setError('Error al generar la pasarela de Mercado Pago. Intenta más tarde.')
      }
    } catch (err) {
      console.error('Error al procesar suscripción:', err)
      setError(err.response?.data?.detail || 'No se pudo dar de alta la suscripción. Verifica la conexión o las credenciales.')
    } finally {
      setProcesando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas p-8 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-ink-muted font-mono">Verificando estado de suscripción...</span>
        </div>
      </div>
    )
  }

  const estado = suscripcion?.estado || 'inactive'

  return (
    <div className="min-h-screen bg-canvas p-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            Suscripción y Facturación
          </h1>
          <p className="text-sm text-ink-muted">
            Gestioná tu plan de pagos recurrente a través del checkout oficial de Mercado Pago.
          </p>
        </div>
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary py-1.5 px-3">
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 bg-danger/5 border border-danger/15 rounded-md mb-6 max-w-xl mx-auto animate-slide-up">
          <p className="error-text m-0 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="max-w-xl mx-auto space-y-6">
        
        {/* TARJETA DE ESTADO ACTUAL */}
        <div className="card bg-surface border border-border shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-ink">Estado del Workspace</h2>
            <div>
              {estado === 'authorized' && (
                <span className="badge badge-success px-3 py-1 font-semibold">Plan Activo</span>
              )}
              {estado === 'pending' && (
                <span className="badge badge-warning px-3 py-1 font-semibold animate-pulse">Pendiente de Pago</span>
              )}
              {estado === 'paused' && (
                <span className="badge badge-warning px-3 py-1 font-semibold">Pausado</span>
              )}
              {(estado === 'cancelled' || estado === 'inactive') && (
                <span className="badge badge-danger px-3 py-1 font-semibold">Sin Suscripción</span>
              )}
            </div>
          </div>

          <div className="space-y-3 font-mono text-sm border-t border-border/50 pt-4">
            <div className="flex justify-between pb-2 border-b border-border/40">
              <span className="text-ink-muted">Plan contratado:</span>
              <span className="text-ink font-semibold">{suscripcion?.plan_nombre || 'Sin plan activo'}</span>
            </div>
            {estado !== 'inactive' && estado !== 'cancelled' && (
              <>
                <div className="flex justify-between pb-2 border-b border-border/40">
                  <span className="text-ink-muted">Monto Mensual:</span>
                  <span className="text-ink font-semibold tabular-nums">
                    {formatearPrecio(suscripcion?.precio_mensual || PLAN_ESTANDAR.precio)} / mes
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border/40">
                  <span className="text-ink-muted">Identificador MP:</span>
                  <span className="text-xs text-ink font-semibold truncate max-w-[200px]" title={suscripcion?.mercadopago_subscription_id}>
                    {suscripcion?.mercadopago_subscription_id || '—'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border/40">
                  <span className="text-ink-muted">Fecha de inicio:</span>
                  <span className="text-ink font-semibold">{formatearFecha(suscripcion?.fecha_inicio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Próximo cobro:</span>
                  <span className="text-accent font-semibold">{formatearFecha(suscripcion?.fecha_proximo_pago)}</span>
                </div>
              </>
            )}
          </div>

          {/* Banner de restricción de roles */}
          {!puedeGestionarBilling && (
            <div className="mt-6 p-3 bg-zinc-100 rounded-md text-xs text-ink-muted text-center border border-border/60">
              🔒 La gestión de suscripciones está reservada exclusivamente para los roles de **Administrador (admin)** o **Creador del Workspace (owner)**.
            </div>
          )}
        </div>

        {/* TARJETA DE CONTRATACIÓN (Check Out Card) */}
        {(estado === 'cancelled' || estado === 'inactive' || estado === 'pending') && (
          <div className="card bg-surface border border-border shadow-card p-6 overflow-hidden relative">
            
            <div className="border-b border-border/50 pb-4 mb-4">
              <h3 className="text-xl font-semibold text-ink">{PLAN_ESTANDAR.nombre}</h3>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold text-ink font-mono tracking-tight tabular-nums">
                  {formatearPrecio(PLAN_ESTANDAR.precio)}
                </span>
                <span className="text-sm text-ink-muted ml-2">/ mes (Pesos Argentinos)</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 text-sm">
              {PLAN_ESTANDAR.caracteristicas.map((char, index) => (
                <li key={index} className="flex items-start gap-2 text-ink-muted">
                  <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{char}</span>
                </li>
              ))}
            </ul>

            {/* Acciones */}
            {puedeGestionarBilling && (
              <div className="space-y-3 animate-fade-in">
                <button
                  onClick={handleSuscribirse}
                  className="btn-accent w-full py-2.5 shadow-subtle hover:scale-[1.01] transition-transform"
                  disabled={procesando}
                >
                  {procesando ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Generando pasarela de Mercado Pago...</span>
                    </div>
                  ) : (
                    estado === 'pending' ? 'Completar pago con Mercado Pago' : 'Suscribirse al Plan Estándar'
                  )}
                </button>

                {successUrl && (
                  <div className="text-center p-3 bg-accent-subtle rounded-md border border-accent-border/40">
                    <p className="text-xs text-accent-active mb-1 font-medium">¿Se bloqueó la ventana emergente?</p>
                    <a
                      href={successUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline font-semibold block"
                    >
                      Haz clic aquí para abrir Mercado Pago ➔
                    </a>
                  </div>
                )}
              </div>
            )}
            
            <div className="p-4 bg-zinc-50 rounded-md border border-border/50 text-xs text-ink-muted flex items-start gap-2.5 mt-4">
              <span className="text-lg shrink-0">💳</span>
              <p className="m-0 leading-relaxed font-mono">
                <strong>Prueba en Sandbox:</strong> Se requiere utilizar cuentas y tarjetas de prueba de Mercado Pago. No uses tarjetas reales de producción.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}