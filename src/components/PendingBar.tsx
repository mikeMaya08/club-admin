import { usePending } from '../lib/pending'

/** Thin progress bar shown while any store call is in flight. */
export default function PendingBar() {
  const pending = usePending()
  if (pending === 0) return null
  return (
    <div data-testid="pending-bar" role="progressbar" aria-label="Saving" className="fixed inset-x-0 top-0 z-[80] h-1 animate-pulse bg-amber-400" />
  )
}
