import { addDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns'
import { clock, slotsFor, useClub } from 'club-store'

const WEEK = { weekStartsOn: 1 } as const

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

/** Dependency-free SVG bar chart: bookings per day of the current week. */
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const W = 420
  const H = 160
  const bar = W / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Bookings per day this week" className="w-full">
      {data.map((d, i) => {
        const h = (d.value / max) * H
        return (
          <g key={d.label}>
            <rect x={i * bar + 8} y={H - h} width={bar - 16} height={h} rx={4} className="fill-green-600" />
            <text x={i * bar + bar / 2} y={H - h - 4} textAnchor="middle" className="fill-slate-600 text-[11px]">
              {d.value}
            </text>
            <text x={i * bar + bar / 2} y={H + 16} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Dashboard() {
  const d = useClub((s) => {
    const now = clock.now()
    const today = clock.today()
    const weekStart = format(startOfWeek(now, WEEK), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(now, WEEK), 'yyyy-MM-dd')
    const paid = (r: { status: string }) => r.status === 'booked' || r.status === 'completed'
    const inWeek = (date: string) => date >= weekStart && date <= weekEnd

    const activeCourts = s.courts.filter((c) => c.active).length
    const capacity = activeCourts * slotsFor(s.settings).length
    const occupied =
      s.reservations.filter((r) => r.date === today && r.status !== 'cancelled').length +
      s.lessons.filter((l) => l.date === today && l.status !== 'cancelled').length

    const days = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd'))
    return {
      occupancy: capacity ? Math.round((occupied / capacity) * 100) : 0,
      occupied,
      capacity,
      revenueToday: s.reservations.filter((r) => r.date === today && paid(r)).reduce((sum, r) => sum + r.price, 0),
      revenueWeek: s.reservations.filter((r) => inWeek(r.date) && paid(r)).reduce((sum, r) => sum + r.price, 0),
      noShows: s.reservations.filter((r) => inWeek(r.date) && r.status === 'no-show').length,
      currency: s.settings.currency,
      blocks: s.blocks
        .filter((b) => !b.lessonId && b.date >= today)
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
        .slice(0, 5)
        .map((b) => ({ ...b, court: s.courts.find((c) => c.id === b.courtId)?.name ?? b.courtId })),
      chart: days.map((date) => ({
        label: format(parseISO(date), 'EEE'),
        value: s.reservations.filter((r) => r.date === date && r.status !== 'cancelled').length,
      })),
    }
  })

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Occupancy today" value={`${d.occupancy}%`} hint={`${d.occupied} of ${d.capacity} slots`} />
        <Stat label="Revenue today" value={`${d.revenueToday} ${d.currency}`} />
        <Stat label="Revenue this week" value={`${d.revenueWeek} ${d.currency}`} />
        <Stat label="No-shows this week" value={String(d.noShows)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold">Bookings this week</h3>
          <BarChart data={d.chart} />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold">Upcoming blocks</h3>
          {d.blocks.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming blocks.</p>
          ) : (
            <ul className="divide-y text-sm">
              {d.blocks.map((b) => (
                <li key={b.id} className="flex justify-between py-2">
                  <span>
                    {b.court} · <span className="capitalize">{b.reason}</span>
                  </span>
                  <span className="text-slate-500">
                    {format(parseISO(b.date), 'EEE, MMM d')} {b.start}–{b.end}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
