import api from './api'

/**
 * Sube un CSV al endpoint de predicciones. El backend espera
 * multipart/form-data con el campo 'archivo' -- axios arma el
 * boundary correcto solo con pasarle un FormData, no hace falta
 * setear el Content-Type a mano (si lo seteas manual, se pierde el
 * boundary y el backend no puede parsear el archivo).
 */
export async function subirCSVPredicciones(file) {
  const formData = new FormData()
  formData.append('archivo', file)

  const { data } = await api.post('/predicciones', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}