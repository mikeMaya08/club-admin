import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RuleError, errorMessage, logout, type RuleCode } from 'club-store'
import { useToast } from '../components/Toast'
import { trackPending } from './pending'

export type RunResult<T> = { ok: true; value: T } | { ok: false; code?: RuleCode }

/**
 * Runs an async store call with a busy flag. Every failure becomes a toast;
 * if the user was deactivated, they are logged out with a message instead.
 */
export function useRun() {
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<RunResult<T>> => {
      setBusy(true)
      try {
        const value = await trackPending(fn())
        if (success) toast(success, 'success')
        return { ok: true, value }
      } catch (err) {
        const code = err instanceof RuleError ? err.code : undefined
        if (code === 'USER_INACTIVE') {
          logout('admin')
          navigate('/login', { replace: true, state: { message: errorMessage(err) } })
        } else {
          toast(errorMessage(err), 'error')
        }
        return { ok: false, code }
      } finally {
        setBusy(false)
      }
    },
    [toast, navigate],
  )

  return { run, busy }
}
