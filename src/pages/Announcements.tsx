import { useState, type FormEvent } from 'react'
import { ANNOUNCEMENT_AUDIENCES, api, clock, isAnnouncementActive, useClub, type Announcement, type AnnouncementAudience } from 'club-store'
import Modal from '../components/Modal'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = { all: 'Everyone', players: 'Players', coaches: 'Coaches' }

/** Post club announcements for everyone, the players or the coaches, and manage the ones already posted. */
export default function Announcements() {
  const me = useMe()
  const { run, busy } = useRun()
  const list = useClub((s) => [...s.announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id, undefined, { numeric: true })))
  const names = useClub((s) => Object.fromEntries(s.users.map((u) => [u.id, u.name])))
  const today = clock.today()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<AnnouncementAudience>('all')
  const [pinned, setPinned] = useState(false)
  const [expiresOn, setExpiresOn] = useState('')
  const [toDelete, setToDelete] = useState<Announcement | null>(null)

  const post = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    const result = await run(() => api.createAnnouncement({ title, body, audience, pinned, expiresOn: expiresOn || undefined }, me.id), 'Announcement posted')
    if (result.ok) {
      setTitle('')
      setBody('')
      setAudience('all')
      setPinned(false)
      setExpiresOn('')
    }
  }

  const input = 'w-full rounded border px-3 py-2 text-sm'

  return (
    <section data-testid="announcements-page">
      <h2 className="mb-4 text-xl font-semibold">Announcements</h2>

      <form onSubmit={post} data-testid="announcement-form" className="mb-4 space-y-3 rounded-lg border bg-white p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Title</span>
          <input data-testid="announcement-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Club closed on Monday" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Message</span>
          <textarea data-testid="announcement-body" value={body} maxLength={500} rows={3} onChange={(e) => setBody(e.target.value)} className={input} />
          <span data-testid="announcement-body-count" className="text-xs text-slate-500">{body.length}/500</span>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Audience</span>
            <select data-testid="announcement-audience" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)} className="rounded border px-3 py-2">
              {ANNOUNCEMENT_AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Expires on (optional)</span>
            <input data-testid="announcement-expires" type="date" min={today} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className="rounded border px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input data-testid="announcement-pinned" type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin (cannot be dismissed)
          </label>
          <button data-testid="announcement-post" type="submit" disabled={busy || !title.trim() || !body.trim()} className="ml-auto rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            Post announcement
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table data-testid="announcements-table" className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Announcement</th>
              <th className="p-3">Audience</th>
              <th className="p-3">Status</th>
              <th className="p-3">Posted by</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5} data-testid="announcements-empty" className="p-6 text-center text-slate-500">No announcements yet.</td></tr>
            )}
            {list.map((a) => {
              const active = isAnnouncementActive(a, today)
              return (
                <tr key={a.id} data-testid={`announcement-row-${a.id}`} className="border-t align-top">
                  <td className="p-3">
                    <div data-testid={`announcement-row-title-${a.id}`} className="font-medium">{a.pinned && '📌 '}{a.title}</div>
                    <div className="text-slate-500">{a.body}</div>
                  </td>
                  <td data-testid={`announcement-row-audience-${a.id}`} className="p-3">{AUDIENCE_LABEL[a.audience]}</td>
                  <td data-testid={`announcement-row-status-${a.id}`} className="p-3">
                    {active ? 'Active' : 'Expired'}
                    {a.expiresOn && <div className="text-xs text-slate-500">until {a.expiresOn}</div>}
                  </td>
                  <td className="p-3">{names[a.authorId] ?? a.authorId}</td>
                  <td className="p-3 text-right">
                    <button type="button" data-testid={`announcement-delete-${a.id}`} className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => setToDelete(a)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {toDelete && (
        <Modal title="Delete announcement?" testId="announcement-delete-dialog" onClose={() => setToDelete(null)}>
          <p className="text-sm text-slate-600">“{toDelete.title}” will disappear for everyone who can see it.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-testid="announcement-delete-cancel" className="rounded border px-4 py-2 text-sm" onClick={() => setToDelete(null)}>Keep</button>
            <button
              type="button"
              data-testid="announcement-delete-confirm"
              className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              onClick={async () => {
                await run(() => api.deleteAnnouncement(toDelete.id, me.id), 'Announcement deleted')
                setToDelete(null)
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
