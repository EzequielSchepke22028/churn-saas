import api from './api'

/**
 * Servicio para gestionar la configuración de mapeo de columnas y factor de conversión.
 * Se comunica con el backend de FastAPI respetando el aislamiento multi-tenant por RLS
 * gracias a que el cliente 'api.js' inyecta automáticamente el token de sesión.
 */

// Obtiene el array de mapeo de columnas actual del tenant (cualquier rol)
export const getMapeo = async () => {
  const response = await api.get('/configuracion/mapeo')
  return response.data
}

// Reemplaza el array de mapeo de columnas del tenant (sólo owner/admin)
export const updateMapeo = async (mapeoArray) => {
  const response = await api.put('/configuracion/mapeo', mapeoArray)
  return response.data
}

// Obtiene el factor de conversión monetario actual del tenant (cualquier rol)
export const getFactorConversion = async () => {
  const response = await api.get('/configuracion/factor-conversion')
  return response.data
}

// Actualiza el factor de conversión monetario del tenant (sólo owner/admin)
export const updateFactorConversion = async (factor) => {
  // El backend puede recibir { "factor_conversion": valor } o { "factor": valor } 
  // según el schema Pydantic. Mandamos ambos o el objeto que mapee según el estándar.
  const response = await api.put('/configuracion/factor-conversion', {
    factor_conversion: parseFloat(factor)
  })
  return response.data
}

const configuracionService = {
  getMapeo,
  updateMapeo,
  getFactorConversion,
  updateFactorConversion
}

export default configuracionService
