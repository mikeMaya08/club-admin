import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { api, clock, fromMin, slotsFor, toMin, useClub, type Block } from 'club-store'
import Modal from '../components/Modal'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

const ROW_H = 32
const COL_W = 44
const WEEK = { weekStartsOn: 1 } as const

interface Ghost { date: string; courtId: string; top: number; height: number }
type Drag =
  | { kind: 'create'; date: string; courtId: string; rect: DOMRect; from: number; to: number }
  | { kind: 'move'; block: Block; x0: number; y0: number; grab: number; len: number; moved: boolean; target?: { date: string; courtId: string; row: number } }
type Selection = { kind: 'res' | 'block' | 'lesson'; id: string }

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

export default function Calendar() {
  const me = useMe()
  const { run } = useRun()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(clock.now(), WEEK))
  const [pending, setPending] = useState<{ courtId: string; date: string; start: string; end: string } | null>(null)
  const [reason, setReason] = useState<'maintenance' | 'tournament'>('maintenance')
  const [selected, setSelected] = useState<Selection | null>(null)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const dragRef = useRef<Drag | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  const today = clock.today()

  const data = useClub((s) => ({
    courts: s.courts,
    open: s.settings.openHour,
    slot: s.settings.slotMinutes,
    rows: slotsFor(s.settings).length,
    reservations: s.reservations.filter((r) => r.status !== 'cancelled' && days.includes(r.date)),
    blocks: s.blocks.filter((b) => !b.lessonId && days.includes(b.date)),
    lessons: s.lessons.filter((l) => l.status !== 'cancelled' && days.includes(l.date)),
    names: Object.fromEntries(s.users.map((u) => [u.id, u.name])),
    currency: s.settings.currency,
  }))
  const { courts, open, slot, rows } = data

  const rowOf = (time: string) => (toMin(time) - open * 60) / slot
  const timeOf = (row: number) => fromMin(open * 60 + Math.round(row * slot))
  const place = (start: string, end: string) => ({
    top: rowOf(start) * ROW_H + 1,
    height: Math.max((rowOf(end) - rowOf(start)) * ROW_H - 2, 8),
  })
  const courtName = (id: string) => courts.find((c) => c.id === id)?.name ?? id

  // Window-level listeners so a drag keeps working when the pointer leaves the column.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.kind === 'create') {
        d.to = clamp(Math.floor((e.clientY - d.rect.top) / ROW_H), 0, rows - 1)
        setGhost({ date: d.date, courtId: d.courtId, top: Math.min(d.from, d.to), height: Math.abs(d.to - d.from) + 1 })
        return
      }
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return
      d.moved = true
      const col = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-col]')
      if (!col) return
      const rect = col.getBoundingClientRect()
      const row = clamp(Math.round((e.clientY - d.grab - rect.top) / ROW_H), 0, Math.max(0, rows - d.len))
      d.target = { date: col.dataset.date!, courtId: col.dataset.court!, row }
      setGhost({ ...d.target, top: row, height: d.len })
    }
    const onUp = () => {
      const d = dragRef.current
      dragRef.current = null
      setGhost(null)
      if (!d) return
      if (d.kind === 'create') {
        const from = Math.min(d.from, d.to)
        const to = Math.max(d.from, d.to) + 1
        setPending({ courtId: d.courtId, date: d.date, start: timeOf(from), end: timeOf(to) })
      } else if (!d.moved) {
        setSelected({ kind: 'block', id: d.block.id })
      } else if (d.target) {
        const span = toMin(d.block.end) - toMin(d.block.start)
        const start = timeOf(d.target.row)
        const end = fromMin(toMin(start) + span)
        void run(() => api.moveBlock(d.block.id, { courtId: d.target!.courtId, date: d.target!.date, start, end }), 'Block moved')
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, open, slot, run])

  const startCreate = (e: ReactPointerEvent<HTMLDivElement>, date: string, courtId: string) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const row = clamp(Math.floor((e.clientY - rect.top) / ROW_H), 0, rows - 1)
    dragRef.current = { kind: 'create', date, courtId, rect, from: row, to: row }
    setGhost({ date, courtId, top: row, height: 1 })
  }

  const startMove = (e: ReactPointerEvent<HTMLDivElement>, block: Block) => {
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      kind: 'move',
      block,
      x0: e.clientX,
      y0: e.clientY,
      grab: e.clientY - rect.top,
      len: (toMin(block.end) - toMin(block.start)) / slot,
      moved: false,
    }
  }

  // ----- details -----
  const detail = (() => {
    if (!selected) return null
    if (selected.kind === 'res') {
      const r = data.reservations.find((x) => x.id === selected.id)
      return r && { title: 'Reservation', lines: [['Court', courtName(r.courtId)], ['When', `${r.date} ${r.start}–${r.end}`], ['Player', data.names[r.playerId]], ['Partner', r.partnerId ? data.names[r.partnerId] : '—'], ['Status', r.status], ['Price', `${r.price} ${data.currency}`]] }
    }
    if (selected.kind === 'block') {
      const b = data.blocks.find((x) => x.id === selected.id)
      return b && { title: 'Block', lines: [['Court', courtName(b.courtId)], ['When', `${b.date} ${b.start}–${b.end}`], ['Reason', b.reason], ['Created by', data.names[b.createdBy]]] }
    }
    const l = data.lessons.find((x) => x.id === selected.id)
    return l && { title: 'Lesson', lines: [['Title', l.title], ['Court', courtName(l.courtId)], ['When', `${l.date} ${l.start}–${l.end}`], ['Coach', data.names[l.coachId]], ['Students', `${l.studentIds.length} / ${l.capacity}`], ['Status', l.status]] }
  })()
  const selectedRes = selected?.kind === 'res' ? data.reservations.find((x) => x.id === selected.id) : undefined

  const overlapping = pending
    ? data.reservations.filter((r) => r.status === 'booked' && r.courtId === pending.courtId && r.date === pending.date && r.start < pending.end && pending.start < r.end).length
    : 0

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-xl font-semibold">Calendar</h2>
        <button type="button" aria-label="Previous week" className="rounded border bg-white px-3 py-1.5" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>‹</button>
        <button type="button" className="rounded border bg-white px-3 py-1.5 text-sm" onClick={() => setWeekStart(startOfWeek(clock.now(), WEEK))}>This week</button>
        <button type="button" aria-label="Next week" className="rounded border bg-white px-3 py-1.5" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>›</button>
        <span className="text-sm text-slate-600">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
      </div>
      <p className="mb-2 text-xs text-slate-500">Drag on an empty area to block time. Drag a block to move it. Click any item for details.</p>
      <ul className="mb-2 flex flex-wrap gap-2 text-xs">
        <li className="rounded bg-green-200 px-2 py-0.5">Reservation</li>
        <li className="rounded bg-amber-200 px-2 py-0.5">No-show</li>
        <li className="rounded bg-purple-200 px-2 py-0.5">Lesson</li>
        <li className="rounded bg-slate-400 px-2 py-0.5 text-white">Block</li>
      </ul>

      <div className="overflow-auto rounded-lg border bg-white">
        <div className="flex w-max select-none">
          <div className="sticky left-0 z-20 w-12 shrink-0 border-r bg-white">
            <div className="h-[52px] border-b" />
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} style={{ height: ROW_H }} className="border-b pr-1 text-right text-[10px] text-slate-500">{timeOf(i)}</div>
            ))}
          </div>

          {days.map((date) => (
            <div key={date} className="border-r">
              <div style={{ width: courts.length * COL_W }} className={`h-[52px] border-b ${date === today ? 'bg-green-50' : ''}`}>
                <div className="py-1 text-center text-xs font-medium">{format(parseISO(date), 'EEE d')}</div>
                <div className="flex">
                  {courts.map((c) => (
                    <div key={c.id} style={{ width: COL_W }} title={c.name} className={`py-1 text-center text-[10px] text-slate-500 ${c.active ? '' : 'line-through opacity-50'}`}>
                      C{c.id.replace('court-', '')}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex">
                {courts.map((c) => (
                  <div
                    key={c.id}
                    data-col
                    data-date={date}
                    data-court={c.id}
                    style={{
                      width: COL_W,
                      height: rows * ROW_H,
                      touchAction: 'none',
                      backgroundImage: `linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
                      backgroundSize: `100% ${ROW_H}px`,
                    }}
                    className={`relative border-r border-slate-100 ${c.active ? '' : 'bg-slate-50'}`}
                    onPointerDown={(e) => startCreate(e, date, c.id)}
                  >
                    {data.reservations.filter((r) => r.date === date && r.courtId === c.id).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        title={`${data.names[r.playerId]} ${r.start}–${r.end}`}
                        style={{ ...place(r.start, r.end), left: 2, right: 2 }}
                        className={`absolute overflow-hidden rounded px-0.5 text-left text-[10px] leading-tight ${r.status === 'no-show' ? 'bg-amber-200 text-amber-900' : 'bg-green-200 text-green-900'}`}
                        onClick={() => setSelected({ kind: 'res', id: r.id })}
                      >
                        {data.names[r.playerId]?.split(' ')[0]}
                      </button>
                    ))}
                    {data.lessons.filter((l) => l.date === date && l.courtId === c.id).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        title={`${l.title} (${data.names[l.coachId]})`}
                        style={{ ...place(l.start, l.end), left: 2, right: 2 }}
                        className="absolute overflow-hidden rounded bg-purple-200 px-0.5 text-left text-[10px] leading-tight text-purple-900"
                        onClick={() => setSelected({ kind: 'lesson', id: l.id })}
                      >
                        {l.title}
                      </button>
                    ))}
                    {data.blocks.filter((b) => b.date === date && b.courtId === c.id).map((b) => (
                      <div
                        key={b.id}
                        role="button"
                        tabIndex={0}
                        title={`${b.reason} ${b.start}–${b.end} (drag to move)`}
                        style={{ ...place(b.start, b.end), left: 2, right: 2, touchAction: 'none' }}
                        className="absolute cursor-grab overflow-hidden rounded bg-slate-500 px-0.5 text-[10px] leading-tight text-white"
                        onPointerDown={(e) => startMove(e, b)}
                        onKeyDown={(e) => e.key === 'Enter' && setSelected({ kind: 'block', id: b.id })}
                      >
                        {b.reason}
                      </div>
                    ))}
                    {ghost && ghost.date === date && ghost.courtId === c.id && (
                      <div
                        style={{ top: ghost.top * ROW_H + 1, height: ghost.height * ROW_H - 2, left: 2, right: 2 }}
                        className="pointer-events-none absolute rounded border-2 border-dashed border-slate-700 bg-slate-300/50"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pending && (
        <Modal title="Block court time" testId="block-dialog" onClose={() => setPending(null)}>
          <p className="text-sm text-slate-600">
            {courtName(pending.courtId)} · {pending.date} · {pending.start}–{pending.end}
          </p>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-500">Reason</span>
            <select data-testid="block-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="w-full rounded border px-3 py-2">
              <option value="maintenance">Maintenance</option>
              <option value="tournament">Tournament</option>
            </select>
          </label>
          {overlapping > 0 && (
            <p data-testid="block-warning" className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-700">
              {overlapping} existing reservation{overlapping === 1 ? '' : 's'} will be cancelled and the player{overlapping === 1 ? '' : 's'} notified.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setPending(null)}>Cancel</button>
            <button
              type="button"
              data-testid="block-create"
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={async () => {
                const input = { ...pending, reason, createdBy: me.id }
                setPending(null)
                await run(() => api.createBlock(input), 'Block created')
              }}
            >
              Create block
            </button>
          </div>
        </Modal>
      )}

      {selected && detail && (
        <Modal title={detail.title} testId="item-dialog" onClose={() => setSelected(null)}>
          <dl className="space-y-1 text-sm">
            {detail.lines.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right capitalize">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            {selected.kind === 'block' && (
              <button
                type="button"
                data-testid="block-delete"
                className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
                onClick={async () => {
                  const id = selected.id
                  setSelected(null)
                  await run(() => api.deleteBlock(id), 'Block deleted')
                }}
              >
                Delete block
              </button>
            )}
            {selectedRes?.status === 'booked' && (
              <button
                type="button"
                data-testid="item-cancel-reservation"
                className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
                onClick={async () => {
                  const id = selectedRes.id
                  setSelected(null)
                  await run(() => api.cancelReservation(id, me.id, { force: true }), 'Reservation cancelled')
                }}
              >
                Cancel reservation
              </button>
            )}
          </div>
        </Modal>
      )}
    </section>
  )
}
