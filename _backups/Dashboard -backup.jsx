import useAuthStore from '../../store/authStore'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Dashboard
        </h1>
        <button onClick={logout} className="btn-secondary">
          Cerrar sesión
        </button>
      </div>

      <div className="card mt-6 p-5 max-w-sm">
        <p className="text-sm text-ink-muted">Conectado como</p>
        <p className="font-mono text-ink mt-1">{user?.email ?? '—'}</p>
        <p className="text-xs text-ink-subtle mt-1">
          Workspace: {user?.tenantSlug ?? '—'}
        </p>
      </div>
    </div>
  )
}