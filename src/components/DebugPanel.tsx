import { useEffect, useState } from 'react'
import { BUGS, clock, reset, setBugs, setConfig, useClub, useConfig, useSession, type AppName, type SeedName } from 'club-store'

/** Hidden debug panel. Toggle with Ctrl+Shift+D. */
export default function DebugPanel({ app }: { app: AppName }) {
  const [open, setOpen] = useState(false)
  const [nowInput, setNowInput] = useState('')
  const config = useConfig()
  const { user, status } = useSession(app)
  const state = useClub((s) => s)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  const toggleBug = (bug: (typeof BUGS)[number]) =>
    setBugs(config.bugs.includes(bug) ? config.bugs.filter((b) => b !== bug) : [...config.bugs, bug])

  return (
    <aside
      data-testid="debug-panel"
      className="fixed inset-y-0 right-0 z-[70] w-full max-w-md overflow-y-auto border-l bg-slate-900 p-4 text-xs text-slate-100 shadow-2xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Debug · {app}</h2>
        <button type="button" data-testid="debug-close" className="rounded bg-slate-700 px-2 py-1" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <p data-testid="debug-user">
        User: {user ? `${user.name} (${user.id})` : 'none'} · session: {status}
      </p>
      <p data-testid="debug-clock">Clock: {clock.now().toISOString()} {config.now ? '(overridden)' : '(real time)'}</p>
      <p data-testid="debug-bugs">Active bugs: {config.bugs.length ? config.bugs.join(', ') : 'none'}</p>

      <h3 className="mb-1 mt-3 font-bold">Bugs</h3>
      {BUGS.map((bug) => (
        <label key={bug} className="flex items-center gap-2 py-0.5">
          <input
            type="checkbox"
            data-testid={`debug-bug-${bug}`}
            checked={config.bugs.includes(bug)}
            onChange={() => toggleBug(bug)}
          />
          {bug}
        </label>
      ))}

      <h3 className="mb-1 mt-3 font-bold">Clock</h3>
      <div className="flex gap-2">
        <input
          data-testid="debug-now-input"
          type="datetime-local"
          value={nowInput}
          onChange={(e) => setNowInput(e.target.value)}
          className="flex-1 rounded bg-slate-800 px-2 py-1"
        />
        <button type="button" data-testid="debug-now-set" className="rounded bg-slate-700 px-2" onClick={() => nowInput && clock.set(nowInput)}>
          Set
        </button>
        <button type="button" data-testid="debug-now-clear" className="rounded bg-slate-700 px-2" onClick={() => clock.set(null)}>
          Real
        </button>
      </div>

      <h3 className="mb-1 mt-3 font-bold">Latency / flakiness</h3>
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-1">
          ms
          <input
            data-testid="debug-latency"
            type="number"
            min={0}
            value={config.latency}
            onChange={(e) => setConfig({ latency: Number(e.target.value) || 0 })}
            className="w-full rounded bg-slate-800 px-2 py-1"
          />
        </label>
        <label className="flex flex-1 items-center gap-1">
          p
          <input
            data-testid="debug-flaky"
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={config.flaky}
            onChange={(e) => setConfig({ flaky: Number(e.target.value) || 0 })}
            className="w-full rounded bg-slate-800 px-2 py-1"
          />
        </label>
      </div>

      <h3 className="mb-1 mt-3 font-bold">Reset data</h3>
      <div className="flex gap-2">
        {(['demo', 'empty', 'full'] as SeedName[]).map((seed) => (
          <button
            key={seed}
            type="button"
            data-testid={`debug-seed-${seed}`}
            className="rounded bg-red-700 px-3 py-1"
            onClick={() => reset(seed)}
          >
            {seed}
          </button>
        ))}
      </div>

      <h3 className="mb-1 mt-3 font-bold">State</h3>
      <pre data-testid="debug-state" className="max-h-96 overflow-auto rounded bg-slate-950 p-2">
        {JSON.stringify(state, null, 2)}
      </pre>
    </aside>
  )
}
