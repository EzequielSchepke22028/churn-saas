import api from './api'

/**
 * Servicio para gestionar las suscripciones con Mercado Pago.
 * El token JWT se inyecta automáticamente desde el interceptor en 'api.js'.
 */

// Obtener el estado de la suscripción actual del tenant (cualquier rol)
export const getSuscripcion = async () => {
  const response = await api.get('/billing/suscripcion')
  return response.data
}

// Iniciar proceso de suscripción creando el Preapproval de MP (sólo owner/admin)
export const suscribirse = async (planSlug) => {
  const response = await api.post('/billing/suscribirse', { 
    plan_slug: planSlug 
  })
  return response.data // Retorna { suscripcion_id, estado, init_point, plan_slug }
}

const billingService = {
  getSuscripcion,
  suscribirse
}

export default billingService


/*import api from './api'

export async function suscribirse(planSlug) {
  const { data } = await api.post('/billing/suscribirse', { plan_slug: planSlug })
  return data
}*/