import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login, useClub, useSession } from 'club-store'

export default function Login() {
  const { status } = useSession('admin')
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { from?: string; message?: string } | null
  const admins = useClub((s) => s.users.filter((u) => u.role === 'admin'))

  if (status === 'ok') return <Navigate to={state?.from ?? '/'} replace />

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-10">
      <h1 data-testid="login-title" className="text-2xl font-bold">Baseline Club · Admin</h1>
      <p className="mb-4 text-sm text-slate-600">Pick an administrator (fake login).</p>
      {state?.message && (
        <div data-testid="login-message" role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      <ul className="space-y-2">
        {admins.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              data-testid={`login-user-${u.id}`}
              className="flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left hover:border-slate-900"
              onClick={() => {
                login('admin', u.id)
                navigate(state?.from ?? '/', { replace: true })
              }}
            >
              <span className="h-8 w-8 rounded-full" style={{ background: u.avatarColor }} aria-hidden />
              <span>
                <span className="block text-sm font-medium">{u.name}</span>
                <span className="block text-xs text-slate-500">{u.email}</span>
              </span>
              {!u.active && <span className="ml-auto rounded bg-slate-200 px-2 py-0.5 text-xs">inactive</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
