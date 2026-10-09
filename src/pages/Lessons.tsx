import { useState, type FormEvent } from 'react'
import { api, clock, useClub, type Lesson } from 'club-store'
import Modal from '../components/Modal'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

interface Form {
  title: string
  coachId: string
  courtId: string
  date: string
  start: string
  end: string
  capacity: string
}

const STATUS_STYLE: Record<Lesson['status'], string> = {
  scheduled: 'bg-indigo-100 text-indigo-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const input = 'w-full rounded border px-2 py-1.5 text-sm'

/** The lesson form fields, shared by the create form and the edit dialog (the coach can only be chosen on create). */
function Fields({ form, setForm, coaches, courts, showCoach }: {
  form: Form
  setForm: (f: Form) => void
  coaches: { id: string; name: string }[]
  courts: { id: string; name: string; active: boolean }[]
  showCoach: boolean
}) {
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">
        Title
        <input data-testid="lesson-title" value={form.title} onChange={set('title')} className={input} />
      </label>
      {showCoach && (
        <label className="text-sm">
          Coach
          <select data-testid="lesson-coach" value={form.coachId} onChange={set('coachId')} className={input}>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <label className="text-sm">
        Court
        <select data-testid="lesson-court" value={form.courtId} onChange={set('courtId')} className={input}>
          {courts.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="text-sm">
        Date
        <input data-testid="lesson-date" type="date" value={form.date} onChange={set('date')} className={input} />
      </label>
      <label className="text-sm">
        Capacity
        <input data-testid="lesson-capacity" type="number" min={1} value={form.capacity} onChange={set('capacity')} className={input} />
      </label>
      <label className="text-sm">
        Start
        <input data-testid="lesson-start" type="time" value={form.start} onChange={set('start')} className={input} />
      </label>
      <label className="text-sm">
        End
        <input data-testid="lesson-end" type="time" value={form.end} onChange={set('end')} className={input} />
      </label>
    </div>
  )
}

/** Lessons table: admins can create lessons for any coach, edit them and cancel them. */
export default function Lessons() {
  const me = useMe()
  const { run, busy } = useRun()
  const data = useClub((s) => ({
    // newest first, copied so the stored array is never reordered
    lessons: [...s.lessons].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)),
    coaches: s.users.filter((u) => u.role === 'coach' && u.active),
    courts: s.courts,
    names: Object.fromEntries(s.users.map((u) => [u.id, u.name])),
  }))
  const courtName = (id: string) => data.courts.find((c) => c.id === id)?.name ?? id

  const blank = (): Form => ({
    title: '',
    coachId: data.coaches[0]?.id ?? '',
    courtId: data.courts.find((c) => c.active)?.id ?? '',
    date: clock.today(),
    start: '10:00',
    end: '11:00',
    capacity: '4',
  })
  const [status, setStatus] = useState('')
  const [form, setForm] = useState<Form>(blank)
  const [editing, setEditing] = useState<{ lesson: Lesson; form: Form } | null>(null)
  const [toCancel, setToCancel] = useState<Lesson | null>(null)

  const rows = data.lessons.filter((l) => !status || l.status === status)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const result = await run(
      () => api.createLesson({ coachId: form.coachId, courtId: form.courtId, date: form.date, start: form.start, end: form.end, title: form.title.trim(), capacity: Number(form.capacity) }),
      'Lesson created',
    )
    if (result.ok) setForm(blank())
  }

  const save = async () => {
    if (!editing) return
    const { lesson, form: f } = editing
    const result = await run(
      () => api.updateLesson(lesson.id, { title: f.title.trim(), courtId: f.courtId, date: f.date, start: f.start, end: f.end, capacity: Number(f.capacity) }, me.id),
      'Lesson updated',
    )
    if (result.ok) setEditing(null)
  }

  return (
    <section data-testid="lessons-page">
      <h2 className="mb-4 text-xl font-semibold">Lessons</h2>

      <form onSubmit={create} data-testid="lesson-form" className="mb-4 rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">New lesson</h3>
        <Fields form={form} setForm={setForm} coaches={data.coaches} courts={data.courts} showCoach />
        <button data-testid="lesson-create" type="submit" disabled={busy || !form.title.trim()} className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          Create lesson
        </button>
      </form>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <label htmlFor="lesson-status-filter">Status</label>
        <select id="lesson-status-filter" data-testid="lesson-status-filter" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-1.5">
          <option value="">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table data-testid="lessons-table" className="w-full text-sm">
          <caption className="sr-only">Lessons</caption>
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="p-3">When</th>
              <th scope="col" className="p-3">Title</th>
              <th scope="col" className="p-3">Court</th>
              <th scope="col" className="p-3">Coach</th>
              <th scope="col" className="p-3">Enrolled</th>
              <th scope="col" className="p-3">Waitlist</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} data-testid="lessons-empty" className="p-6 text-center text-slate-500">No lessons.</td></tr>
            )}
            {rows.map((l) => (
              <tr key={l.id} data-testid={`lesson-row-${l.id}`} data-status={l.status} className="border-t">
                <td data-testid={`lesson-when-${l.id}`} className="p-3">{l.date} {l.start}–{l.end}</td>
                <td data-testid={`lesson-name-${l.id}`} className="p-3 font-medium">{l.title}</td>
                <td className="p-3">{courtName(l.courtId)}</td>
                <td className="p-3">{data.names[l.coachId]}</td>
                <td data-testid={`lesson-enrolled-${l.id}`} className="p-3">{l.studentIds.length} / {l.capacity}</td>
                <td data-testid={`lesson-waitlist-${l.id}`} className="p-3">{l.waitlist.length}</td>
                <td className="p-3"><span data-testid={`lesson-status-${l.id}`} className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status]}`}>{l.status}</span></td>
                <td className="space-x-2 p-3 text-right">
                  <button
                    type="button"
                    data-testid={`lesson-edit-${l.id}`}
                    disabled={l.status !== 'scheduled'}
                    className="rounded border px-2 py-1 disabled:opacity-40"
                    aria-label={`Edit ${l.title}`}
                    onClick={() => setEditing({ lesson: l, form: { title: l.title, coachId: l.coachId, courtId: l.courtId, date: l.date, start: l.start, end: l.end, capacity: String(l.capacity) } })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    data-testid={`lesson-cancel-${l.id}`}
                    disabled={l.status !== 'scheduled'}
                    className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-40"
                    aria-label={`Cancel ${l.title}`}
                    onClick={() => setToCancel(l)}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title="Edit lesson" testId="lesson-edit-dialog" onClose={() => setEditing(null)}>
          <Fields form={editing.form} setForm={(f) => setEditing({ ...editing, form: f })} coaches={data.coaches} courts={data.courts} showCoach={false} />
          <p className="mt-2 text-xs text-slate-500">Students are notified when the date, time or court changes.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setEditing(null)}>Close</button>
            <button type="button" data-testid="lesson-edit-save" disabled={busy || !editing.form.title.trim()} className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={save}>
              Save changes
            </button>
          </div>
        </Modal>
      )}

      {toCancel && (
        <Modal title="Cancel lesson?" testId="lesson-cancel-dialog" onClose={() => setToCancel(null)}>
          <p className="text-sm text-slate-600">
            {toCancel.title} on {toCancel.date}. The court is released and {toCancel.studentIds.length + toCancel.waitlist.length} enrolled or waiting player(s) are notified.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-testid="lesson-cancel-dismiss" className="rounded border px-4 py-2 text-sm" onClick={() => setToCancel(null)}>Keep lesson</button>
            <button
              type="button"
              data-testid="lesson-cancel-confirm"
              className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              onClick={async () => {
                const target = toCancel
                setToCancel(null)
                await run(() => api.cancelLesson(target.id, me.id), 'Lesson cancelled')
              }}
            >
              Cancel lesson
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
