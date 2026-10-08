import { useState, type FormEvent } from 'react'
import { api, getState, settingsSchema, useClub, type Settings as SettingsType } from 'club-store'
import { useRun } from '../lib/useRun'

type Key = keyof SettingsType
const FIELDS: { key: Key; label: string; type: 'number' | 'time' | 'text'; step?: number }[] = [
  { key: 'openHour', label: 'Opening hour (0-23)', type: 'number' },
  { key: 'closeHour', label: 'Closing hour (1-24)', type: 'number' },
  { key: 'slotMinutes', label: 'Slot length (minutes)', type: 'number' },
  { key: 'lightsRequiredFrom', label: 'Lights required from', type: 'time' },
  { key: 'peakStart', label: 'Peak starts', type: 'time' },
  { key: 'peakEnd', label: 'Peak ends', type: 'time' },
  { key: 'basePrice', label: 'Base price', type: 'number' },
  { key: 'peakPrice', label: 'Peak price', type: 'number' },
  { key: 'maxActiveReservations', label: 'Max active reservations per player', type: 'number' },
  { key: 'cancelHoursLimit', label: 'Cancellation limit (hours before start)', type: 'number' },
  { key: 'currency', label: 'Currency', type: 'text' },
]

const toForm = (s: SettingsType) => Object.fromEntries(FIELDS.map((f) => [f.key, String(s[f.key])])) as Record<Key, string>

export default function Settings() {
  const { run, busy } = useRun()
  const saved = useClub((s) => s.settings)
  const [form, setForm] = useState(() => toForm(getState().settings))
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const candidate = Object.fromEntries(
      FIELDS.map((f) => [f.key, f.type === 'number' ? (form[f.key].trim() === '' ? NaN : Number(form[f.key])) : form[f.key]]),
    )
    const result = settingsSchema.safeParse(candidate)
    if (!result.success) {
      const next: Partial<Record<Key, string>> = {}
      for (const issue of result.error.issues) next[issue.path[0] as Key] ??= issue.message
      setErrors(next)
      return
    }
    setErrors({})
    const r = await run(() => api.updateSettings(result.data), 'Settings saved')
    if (r.ok) setForm(toForm(r.value))
  }

  return (
    <section data-testid="settings-page">
      <h2 className="mb-4 text-xl font-semibold">Settings</h2>
      <form onSubmit={submit} noValidate data-testid="settings-form" className="grid max-w-3xl gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="mb-1 block text-slate-600">{f.label}</span>
            <input
              data-testid={`setting-${f.key}`}
              type={f.type}
              value={form[f.key]}
              aria-invalid={!!errors[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className={`w-full rounded border px-3 py-2 ${errors[f.key] ? 'border-red-500' : ''}`}
            />
            {errors[f.key] && (
              <span data-testid={`setting-error-${f.key}`} role="alert" className="mt-1 block text-xs text-red-600">
                {errors[f.key]}
              </span>
            )}
          </label>
        ))}
        <div className="flex items-center gap-2 sm:col-span-2">
          <button data-testid="settings-save" type="submit" disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Save settings'}
          </button>
          <button data-testid="settings-reset" type="button" className="rounded border px-4 py-2 text-sm" onClick={() => { setForm(toForm(saved)); setErrors({}) }}>
            Discard changes
          </button>
        </div>
      </form>
    </section>
  )
}
