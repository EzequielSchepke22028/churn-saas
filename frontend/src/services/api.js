import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'
const TOKEN_STORAGE_KEY = 'churn_saas_token'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Interceptor de request: inyecta el header Authorization en CADA
 * llamada saliente, si hay un token guardado. No valida si el token
 * expiro o es invalido -- eso lo va a resolver el backend devolviendo
 * 401, y el interceptor de response (proximo paso) sera quien
 * reaccione a eso. Este interceptor solo se encarga de adjuntar.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export { TOKEN_STORAGE_KEY }
export default api