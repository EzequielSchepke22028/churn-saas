import { create } from 'zustand'
import api, { TOKEN_STORAGE_KEY } from '../services/api'

const USER_STORAGE_KEY = 'churn_saas_user'

const leerTokenGuardado = () => localStorage.getItem(TOKEN_STORAGE_KEY)

const leerUsuarioGuardado = () => {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const useAuthStore = create((set) => ({
  token: leerTokenGuardado(),
  user: leerUsuarioGuardado(),
  isAuthenticated: Boolean(leerTokenGuardado()),
  loading: false,
  error: null,

  login: async (tenantSlug, email, password) => {
    set({ loading: true, error: null })

    try {
      const { data } = await api.post('/auth/login', {
        tenant_slug: tenantSlug,
        email,
        password,
      })

      const user = {
        email,
        tenantSlug,
        tenantId: data.tenant_id,
        role: data.role,
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))

      set({
        token: data.access_token,
        user,
        isAuthenticated: true,
        loading: false,
        error: null,
      })

      return true
    } catch (err) {
      const detalle = err.response?.data?.detail
      const mensaje =
        typeof detalle === 'string'
          ? detalle
          : err.response
            ? 'Revisa los datos ingresados.'
            : 'No pudimos conectar con el servidor. Intenta de nuevo.'

      set({ loading: false, error: mensaje })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    set({ token: null, user: null, isAuthenticated: false, error: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore