import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function PublicOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}