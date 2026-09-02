import { create } from 'zustand'
import api, { TOKEN_STORAGE_KEY } from '../services/api'

// Helper function to decode JWT payload safely in pure JS (no extra libraries required)
const parseJWT = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_STORAGE_KEY) || null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Initialize store: parses existing token if present and valid
  initialize: () => {
    const token = get().token
    if (token) {
      const decoded = parseJWT(token)
      // Check expiration (exp is in seconds, Date.now() is in milliseconds)
      if (decoded && decoded.exp * 1000 > Date.now()) {
        set({
          user: {
            id: decoded.sub,
            tenant_id: decoded.tenant_id,
            role: decoded.role,
            email: decoded.email || '',
          },
          isAuthenticated: true,
          error: null,
        })
      } else {
        // Token expired or invalid
        get().logout()
      }
    }
  },

  // Login action: makes POST request and saves token
  login: async (tenant_slug, email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/auth/login', {
        tenant_slug,
        email,
        password,
      })

      const { access_token, role } = response.data

      // Save to localStorage under our exact config key
      localStorage.setItem(TOKEN_STORAGE_KEY, access_token)

      // Decode token payload
      const decoded = parseJWT(access_token)

      set({
        token: access_token,
        user: {
          id: decoded?.sub || null,
          tenant_id: decoded?.tenant_id || null,
          role: role || decoded?.role || 'colaborador',
          email: email,
        },
        isAuthenticated: true,
        loading: false,
        error: null,
      })

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      const errorMsg =
        error.response?.data?.detail ||
        'Error de conexión o credenciales incorrectas.'
      set({
        error: errorMsg,
        loading: false,
        isAuthenticated: false,
      })
      return { success: false, error: errorMsg }
    }
  },

  // Logout action: clears state and localStorage
  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      loading: false,
    })
  },
}))

export default useAuthStore
