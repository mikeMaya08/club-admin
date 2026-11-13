import { useEffect, useMemo, useRef, useState } from 'react'
import { api, errorMessage, useClub, type Reservation } from 'club-store'
import Modal from '../components/Modal'
import { trackPending } from '../lib/pending'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

type SortKey = 'date' | 'court' | 'player' | 'status' | 'price'
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'court', label: 'Court' },
  { key: 'player', label: 'Player' },
  { key: 'status', label: 'Status' },
  { key: 'price', label: 'Price' },
]
const STATUSES: Reservation['status'][] = ['booked', 'completed', 'no-show', 'cancelled']

/** Quotes a value for CSV and doubles any quote inside it. */
const csvCell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`

type BulkKind = 'cancel' | 'no-show'
interface BulkResult { kind: BulkKind; done: number; failed: { id: string; message: string }[] }

/**
 * All reservations with filters, sortable columns, pagination, CSV export and admin actions (no-show, cancel).
 * Booked rows can be selected to cancel or mark them as no-show in one go; the result lists what failed.
 */
export default function Reservations() {
  const me = useMe()
  const { run } = useRun()
  const data = useClub((s) => ({
    reservations: s.reservations,
    courts: s.courts,
    players: s.users.filter((u) => u.role === 'player'),
    names: Object.fromEntries(s.users.map((u) => [u.id, u.name])),
    currency: s.settings.currency,
  }))

  const [filters, setFilters] = useState({ from: '', to: '', courtId: '', status: '', playerId: '' })
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' })
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(0)
  const [toCancel, setToCancel] = useState<Reservation | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)

  const courtName = (id: string) => data.courts.find((c) => c.id === id)?.name ?? id

  // Filter first, then sort. `rows` is the full result: the page below only slices it for display.
  const rows = useMemo(() => {
    const filtered = data.reservations.filter(
      (r) =>
        (!filters.from || r.date >= filters.from) &&
        (!filters.to || r.date <= filters.to) &&
        (!filters.courtId || r.courtId === filters.courtId) &&
        (!filters.status || r.status === filters.status) &&
        (!filters.playerId || r.playerId === filters.playerId),
    )
    const value = (r: Reservation): string | number => {
      switch (sort.key) {
        case 'date': return r.date + r.start
        case 'court': return courtName(r.courtId)
        case 'player': return data.names[r.playerId] ?? r.playerId
        case 'status': return r.status
        case 'price': return r.price
      }
    }
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      return (x < y ? -1 : x > y ? 1 : a.id.localeCompare(b.id, undefined, { numeric: true })) * sign
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters, sort])

  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize)

  // Only booked reservations can be selected. Rows that left the filter or are no longer booked drop out by themselves.
  const bookedRows = rows.filter((r) => r.status === 'booked')
  const chosen = bookedRows.filter((r) => selected.has(r.id))
  const pageBooked = visible.filter((r) => r.status === 'booked')
  const pageChosen = pageBooked.filter((r) => selected.has(r.id))
  const headerBox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = pageChosen.length > 0 && pageChosen.length < pageBooked.length
  })

  const toggleOne = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const togglePage = () =>
    setSelected((cur) => {
      const next = new Set(cur)
      const all = pageBooked.length > 0 && pageChosen.length === pageBooked.length
      pageBooked.forEach((r) => (all ? next.delete(r.id) : next.add(r.id)))
      return next
    })

  // One call per reservation, in order. A failure does not stop the rest; failed ones stay selected to retry.
  const runBulk = async (kind: BulkKind) => {
    const ids = chosen.map((r) => r.id)
    setConfirmBulk(false)
    setBulkBusy(true)
    const out: BulkResult = { kind, done: 0, failed: [] }
    for (const id of ids) {
      try {
        await trackPending(kind === 'cancel' ? api.cancelReservation(id, me.id, { force: true }) : api.markNoShow(id, me.id))
        out.done++
      } catch (err) {
        out.failed.push({ id, message: errorMessage(err) })
      }
    }
    setSelected(new Set(out.failed.map((f) => f.id)))
    setResult(out)
    setBulkBusy(false)
  }

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }

  // Clicking the active column flips the direction; clicking another column starts ascending.
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  // Exports every row that matches the filters (not just the current page).
  const exportCsv = () => {
    const header = ['id', 'date', 'start', 'end', 'court', 'player', 'partner', 'status', 'price', 'cancelReason']
    const lines = rows.map((r) =>
      [r.id, r.date, r.start, r.end, courtName(r.courtId), data.names[r.playerId], r.partnerId ? data.names[r.partnerId] : '', r.status, r.price, r.cancelReason].map(csvCell).join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reservations.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const input = 'rounded border px-2 py-1.5 text-sm'

  return (
    <section data-testid="reservations-page">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Reservations</h2>
        <button type="button" data-testid="export-csv" className="rounded border bg-white px-3 py-2 text-sm" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div data-testid="reservation-filters" className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
        <label className="text-xs text-slate-500">From<input data-testid="filter-from" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className={`${input} block`} /></label>
        <label className="text-xs text-slate-500">To<input data-testid="filter-to" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className={`${input} block`} /></label>
        <label className="text-xs text-slate-500">Court
          <select data-testid="filter-court" value={filters.courtId} onChange={(e) => setFilter('courtId', e.target.value)} className={`${input} block`}>
            <option value="">All</option>
            {data.courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Status
          <select data-testid="filter-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={`${input} block`}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Player
          <select data-testid="filter-player" value={filters.playerId} onChange={(e) => setFilter('playerId', e.target.value)} className={`${input} block`}>
            <option value="">All</option>
            {data.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" data-testid="filter-clear" className="rounded border px-3 py-1.5 text-sm" onClick={() => { setFilters({ from: '', to: '', courtId: '', status: '', playerId: '' }); setPage(0) }}>
          Clear
        </button>
      </div>

      {chosen.length > 0 && (
        <div data-testid="bulk-bar" role="region" aria-label="Bulk actions" className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm">
          <span data-testid="bulk-count" aria-live="polite" className="font-medium">{chosen.length} selected</span>
          {chosen.length < bookedRows.length && (
            <button type="button" data-testid="bulk-select-all" className="underline" onClick={() => setSelected(new Set(bookedRows.map((r) => r.id)))}>
              Select all {bookedRows.length} booked matching the filters
            </button>
          )}
          <span className="ml-auto flex gap-2">
            <button type="button" data-testid="bulk-noshow" disabled={bulkBusy} className="rounded border bg-white px-3 py-1.5 disabled:opacity-50" onClick={() => runBulk('no-show')}>
              Mark no-show
            </button>
            <button type="button" data-testid="bulk-cancel" disabled={bulkBusy} className="rounded border border-red-300 bg-white px-3 py-1.5 text-red-700 disabled:opacity-50" onClick={() => setConfirmBulk(true)}>
              Cancel selected
            </button>
            <button type="button" data-testid="bulk-clear" disabled={bulkBusy} className="rounded border bg-white px-3 py-1.5 disabled:opacity-50" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </span>
        </div>
      )}

      {result && (
        <div data-testid="bulk-result" role="status" className={`mb-3 rounded-lg border p-3 text-sm ${result.failed.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-green-200 bg-green-50 text-green-800'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div data-testid="bulk-result-summary" className="font-medium">
                {result.kind === 'cancel' ? 'Cancelled' : 'Marked as no-show'} {result.done} of {result.done + result.failed.length} reservation{result.done + result.failed.length === 1 ? '' : 's'}.
              </div>
              {result.failed.length > 0 && (
                <ul data-testid="bulk-result-failures" className="mt-1 list-disc pl-5">
                  {result.failed.map((f) => <li key={f.id}>{f.id}: {f.message}</li>)}
                </ul>
              )}
            </div>
            <button type="button" data-testid="bulk-result-dismiss" className="rounded border px-2 py-1 text-xs" onClick={() => setResult(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table data-testid="reservations-table" className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="w-10 p-3">
                <input ref={headerBox} type="checkbox" data-testid="select-page" aria-label="Select all booked reservations on this page" disabled={pageBooked.length === 0 || bulkBusy} checked={pageBooked.length > 0 && pageChosen.length === pageBooked.length} onChange={togglePage} />
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="p-3" aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" data-testid={`sort-${c.key}`} className="font-semibold uppercase" onClick={() => toggleSort(c.key)}>
                    {c.label} {sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
              ))}
              <th className="p-3">Time</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={8} data-testid="reservations-empty" className="p-6 text-center text-slate-500">No reservations match the filters.</td></tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} data-testid={`res-row-${r.id}`} data-status={r.status} className="border-t">
                <td className="p-3">
                  <input type="checkbox" data-testid={`res-select-${r.id}`} aria-label={`Select reservation ${r.id}`} disabled={r.status !== 'booked' || bulkBusy} checked={r.status === 'booked' && selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                </td>
                <td data-testid={`res-date-${r.id}`} className="p-3">{r.date}</td>
                <td data-testid={`res-court-${r.id}`} className="p-3">{courtName(r.courtId)}</td>
                <td data-testid={`res-player-${r.id}`} className="p-3">{data.names[r.playerId] ?? r.playerId}</td>
                <td data-testid={`res-status-${r.id}`} className="p-3">{r.status === 'cancelled' ? 'canceled' : r.status}</td>
                <td data-testid={`res-price-${r.id}`} className="p-3">{r.price} {data.currency}</td>
                <td data-testid={`res-time-${r.id}`} className="p-3">{r.start}–{r.end}</td>
                <td className="space-x-2 p-3 text-right">
                  <button type="button" data-testid={`res-noshow-${r.id}`} disabled={r.status !== 'booked'} className="rounded border px-2 py-1 disabled:opacity-40" onClick={() => run(() => api.markNoShow(r.id, me.id), 'Marked as no-show')}>
                    No-show
                  </button>
                  <button type="button" data-testid={`res-cancel-${r.id}`} disabled={r.status !== 'booked'} className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-40" onClick={() => setToCancel(r)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="pagination" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span data-testid="result-count">{rows.length} result{rows.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <label>Rows per page{' '}
            <select data-testid="page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className={input}>
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" data-testid="page-prev" disabled={current === 0} className="rounded border bg-white px-3 py-1.5 disabled:opacity-40" onClick={() => setPage(current - 1)}>Prev</button>
          <span data-testid="page-info">Page {current + 1} of {pages}</span>
          <button type="button" data-testid="page-next" disabled={current >= pages - 1} className="rounded border bg-white px-3 py-1.5 disabled:opacity-40" onClick={() => setPage(current + 1)}>Next</button>
        </div>
      </div>

      {confirmBulk && (
        <Modal title={`Cancel ${chosen.length} reservation${chosen.length === 1 ? '' : 's'}?`} testId="bulk-cancel-dialog" onClose={() => setConfirmBulk(false)}>
          <p className="text-sm text-slate-600">The selected reservations will be cancelled and each player will be notified.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-testid="bulk-cancel-dismiss" className="rounded border px-4 py-2 text-sm" onClick={() => setConfirmBulk(false)}>Keep</button>
            <button type="button" data-testid="bulk-cancel-confirm" className="rounded bg-red-600 px-4 py-2 text-sm text-white" onClick={() => runBulk('cancel')}>
              Cancel {chosen.length}
            </button>
          </div>
        </Modal>
      )}

      {toCancel && (
        <Modal title="Cancel reservation?" testId="res-cancel-dialog" onClose={() => setToCancel(null)}>
          <p className="text-sm text-slate-600">
            {courtName(toCancel.courtId)} · {toCancel.date} {toCancel.start} ({data.names[toCancel.playerId]}). The player will be notified.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-testid="res-cancel-dismiss" className="rounded border px-4 py-2 text-sm" onClick={() => setToCancel(null)}>Keep</button>
            <button
              type="button"
              data-testid="res-cancel-confirm"
              className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              onClick={async () => {
                const target = toCancel
                setToCancel(null)
                await run(() => api.cancelReservation(target.id, me.id, { force: true }), 'Reservation cancelled')
              }}
            >
              Cancel reservation
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
