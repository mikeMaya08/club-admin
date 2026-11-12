import { useState, type FormEvent } from 'react'
import { api, useClub, type Court } from 'club-store'
import Modal from '../components/Modal'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

export default function Courts() {
  const me = useMe()
  const { run, busy } = useRun()
  const courts = useClub((s) => s.courts)
  const [name, setName] = useState('')
  const [surface, setSurface] = useState<Court['surface']>('clay')
  const [lights, setLights] = useState(true)
  const [editing, setEditing] = useState<Court | null>(null)
  const [editName, setEditName] = useState('')
  const [toDelete, setToDelete] = useState<Court | null>(null)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const result = await run(() => api.createCourt({ name: name.trim(), surface, lights }, me.id), 'Court created')
    if (result.ok) setName('')
  }

  return (
    <section data-testid="courts-page">
      <h2 className="mb-4 text-xl font-semibold">Courts</h2>

      <form onSubmit={add} data-testid="court-form" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Name</span>
          <input data-testid="court-name-input" value={name} onChange={(e) => setName(e.target.value)} className="rounded border px-3 py-2" placeholder="Court 7" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Surface</span>
          <select data-testid="court-surface-select" value={surface} onChange={(e) => setSurface(e.target.value as Court['surface'])} className="rounded border px-3 py-2">
            <option value="clay">Clay</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input data-testid="court-lights-input" type="checkbox" checked={lights} onChange={(e) => setLights(e.target.checked)} />
          Lights
        </label>
        <button data-testid="court-add" type="submit" disabled={busy || !name.trim()} className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          Add court
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table data-testid="courts-table" className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Surface</th>
              <th className="p-3">Lights</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courts.map((c) => (
              <tr key={c.id} data-testid={`court-row-${c.id}`} className="border-t">
                <td data-testid={`court-name-${c.id}`} className="p-3 font-medium">{c.name}</td>
                <td data-testid={`court-surface-${c.id}`} className="p-3 capitalize">{c.surface}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    data-testid={`court-lights-${c.id}`}
                    aria-label={`Lights for ${c.name}`}
                    checked={c.lights}
                    onChange={(e) => run(() => api.updateCourt(c.id, { lights: e.target.checked }, me.id))}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    data-testid={`court-active-${c.id}`}
                    aria-label={`Active for ${c.name}`}
                    checked={c.active}
                    onChange={(e) => run(() => api.updateCourt(c.id, { active: e.target.checked }, me.id))}
                  />
                </td>
                <td className="space-x-2 p-3 text-right">
                  <button
                    type="button"
                    data-testid={`court-edit-${c.id}`}
                    className="rounded border px-2 py-1"
                    onClick={() => {
                      setEditing(c)
                      setEditName(c.name)
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" data-testid={`court-delete-${c.id}`} className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => setToDelete(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title="Rename court" testId="court-edit-dialog" onClose={() => setEditing(null)}>
          <input data-testid="court-edit-input" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button
              type="button"
              data-testid="court-edit-save"
              disabled={!editName.trim()}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={async () => {
                const r = await run(() => api.updateCourt(editing.id, { name: editName.trim() }, me.id), 'Court renamed')
                if (r.ok) setEditing(null)
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {toDelete && (
        <Modal title="Delete court?" testId="court-delete-dialog" onClose={() => setToDelete(null)}>
          <p className="text-sm text-slate-600">{toDelete.name} will be removed together with its blocks. Courts with future reservations cannot be deleted.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-testid="court-delete-cancel" className="rounded border px-4 py-2 text-sm" onClick={() => setToDelete(null)}>Keep</button>
            <button
              type="button"
              data-testid="court-delete-confirm"
              className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              onClick={async () => {
                await run(() => api.deleteCourt(toDelete.id, me.id), 'Court deleted')
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
