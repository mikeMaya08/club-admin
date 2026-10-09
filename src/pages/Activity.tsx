import { useMemo, useState } from 'react'
import { filterEvents, useClub, type ClubEvent, type EventType } from 'club-store'

const GROUPS: { label: string; prefix: string }[] = [
  { label: 'Reservations', prefix: 'reservation.' },
  { label: 'Blocks', prefix: 'block.' },
  { label: 'Lessons', prefix: 'lesson.' },
  { label: 'Attendance and notes', prefix: 'attendance.' },
  { label: 'Users', prefix: 'user.' },
  { label: 'Courts and settings', prefix: 'court.' },
]

const csvCell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
const input = 'rounded border px-2 py-1.5 text-sm'

export default function Activity() {
  const data = useClub((s) => ({
    events: s.events,
    names: Object.fromEntries(s.users.map((u) => [u.id, u.name])),
    users: s.users,
  }))
  const [type, setType] = useState('')
  const [actorId, setActorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)

  const rows = useMemo(() => {
    const types = type ? (data.events.map((e) => e.type).filter((t, i, a) => a.indexOf(t) === i && t.startsWith(type)) as EventType[]) : undefined
    if (type && types?.length === 0) return []
    return filterEvents(data.events, { types, actorId: actorId || undefined, from: from || undefined, to: to || undefined })
  }, [data.events, type, actorId, from, to])

  const who = (id?: string) => (id ? (id === 'system' ? 'System' : (data.names[id] ?? id)) : '')
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize)

  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value)
    setPage(0)
  }

  const exportCsv = () => {
    const header = ['id', 'time', 'type', 'actor', 'subject', 'summary']
    const lines = rows.map((e: ClubEvent) => [e.id, e.createdAt, e.type, who(e.actorId), who(e.subjectId), e.summary].map(csvCell).join(','))
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'activity.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section data-testid="activity-page">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Activity</h2>
        <button type="button" data-testid="activity-export" className="rounded border bg-white px-3 py-2 text-sm" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div data-testid="activity-filters" className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
        <label className="text-xs text-slate-600">Type
          <select data-testid="activity-filter-type" value={type} onChange={change(setType)} className={`${input} block`}>
            <option value="">All</option>
            {GROUPS.map((g) => <option key={g.prefix} value={g.prefix}>{g.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">Who
          <select data-testid="activity-filter-actor" value={actorId} onChange={change(setActorId)} className={`${input} block`}>
            <option value="">Everyone</option>
            <option value="system">System</option>
            {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">From<input data-testid="activity-filter-from" type="date" value={from} onChange={change(setFrom)} className={`${input} block`} /></label>
        <label className="text-xs text-slate-600">To<input data-testid="activity-filter-to" type="date" value={to} onChange={change(setTo)} className={`${input} block`} /></label>
        <button
          type="button"
          data-testid="activity-filter-clear"
          className="rounded border px-3 py-1.5 text-sm"
          onClick={() => {
            setType('')
            setActorId('')
            setFrom('')
            setTo('')
            setPage(0)
          }}
        >
          Clear
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table data-testid="activity-table" className="w-full text-sm">
          <caption className="sr-only">Activity log, newest first</caption>
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th scope="col" className="p-3">Time</th>
              <th scope="col" className="p-3">Event</th>
              <th scope="col" className="p-3">By</th>
              <th scope="col" className="p-3">Affects</th>
              <th scope="col" className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={5} data-testid="activity-empty" className="p-6 text-center text-slate-500">No activity matches the filters.</td></tr>
            )}
            {visible.map((e) => (
              <tr key={e.id} data-testid={`event-row-${e.id}`} data-type={e.type} className="border-t align-top">
                <td data-testid={`event-time-${e.id}`} className="whitespace-nowrap p-3 text-slate-600">{e.createdAt.slice(0, 16).replace('T', ' ')}</td>
                <td data-testid={`event-type-${e.id}`} className="whitespace-nowrap p-3 font-medium">{e.type}</td>
                <td data-testid={`event-actor-${e.id}`} className="p-3">{who(e.actorId)}</td>
                <td data-testid={`event-subject-${e.id}`} className="p-3">{who(e.subjectId) || '—'}</td>
                <td data-testid={`event-summary-${e.id}`} className="p-3">{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="activity-pagination" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span data-testid="activity-count">{rows.length} event{rows.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <label>Rows per page{' '}
            <select data-testid="activity-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className={input}>
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" data-testid="activity-prev" disabled={current === 0} className="rounded border bg-white px-3 py-1.5 disabled:opacity-40" onClick={() => setPage(current - 1)}>Prev</button>
          <span data-testid="activity-page-info">Page {current + 1} of {pages}</span>
          <button type="button" data-testid="activity-next" disabled={current >= pages - 1} className="rounded border bg-white px-3 py-1.5 disabled:opacity-40" onClick={() => setPage(current + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
