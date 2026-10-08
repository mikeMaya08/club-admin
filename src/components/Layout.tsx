import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from 'club-store'
import { useMe } from '../lib/useMe'
import PendingBar from './PendingBar'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

const LINKS = [
  { to: '/', label: 'Dashboard', id: 'dashboard', end: true },
  { to: '/calendar', label: 'Calendar', id: 'calendar' },
  { to: '/reservations', label: 'Reservations', id: 'reservations' },
  { to: '/lessons', label: 'Lessons', id: 'lessons' },
  { to: '/courts', label: 'Courts', id: 'courts' },
  { to: '/users', label: 'Users', id: 'users' },
  { to: '/settings', label: 'Settings', id: 'settings' },
]

export default function Layout() {
  const me = useMe()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only rounded bg-white px-3 py-2 text-slate-900 focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[90]"
      >
        Skip to content
      </a>
      <PendingBar />
      <aside className="bg-slate-900 text-slate-100 md:w-52 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <h1 className="text-base font-semibold">
            Baseline Club <span className="font-normal opacity-70">· Admin</span>
          </h1>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
          {LINKS.map((l) => (
            <NavLink
              key={l.id}
              to={l.to}
              end={l.end}
              data-testid={`nav-${l.id}`}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm ${isActive ? 'bg-slate-700 font-medium' : 'text-slate-200 hover:bg-slate-800'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b bg-white px-4 py-2">
          <span className="flex items-center gap-2 text-sm" data-testid="current-user">
            <span className="inline-block h-6 w-6 rounded-full" style={{ background: me.avatarColor }} aria-hidden />
            {me.name}
          </span>
          <ThemeToggle />
          <NotificationBell />
          <button
            type="button"
            data-testid="logout-btn"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => {
              logout('admin')
              navigate('/login')
            }}
          >
            Log out
          </button>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-3 outline-none md:p-5">
          <Outlet context={me} />
        </main>
      </div>
    </div>
  )
}
