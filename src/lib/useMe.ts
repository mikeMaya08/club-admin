import { useOutletContext } from 'react-router-dom'
import type { User } from 'club-store'

/** The logged-in player. Only valid inside <Guard>. */
export const useMe = () => useOutletContext<User>()
