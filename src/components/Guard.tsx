import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from 'club-store'

const MESSAGES = {
  inactive: 'Your account has been deactivated.',
  'wrong-role': 'That user cannot use the admin app.',
} as const

/** Redirects to /login when there is no session, the user is inactive or has the wrong role. */
export default function Guard() {
  const { user, status } = useSession('admin')
  const location = useLocation()

  if (status !== 'ok' || !user) {
    const message = status === 'inactive' || status === 'wrong-role' ? MESSAGES[status] : undefined
    return <Navigate to="/login" replace state={{ from: location.pathname, message }} />
  }
  // Pages read the logged-in admin with `useMe()` instead of checking the session again.
  return <Outlet context={user} />
}
