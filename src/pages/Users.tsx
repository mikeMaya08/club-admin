import { useState } from 'react'
import { api, useClub, type Role, type User } from 'club-store'
import Modal from '../components/Modal'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

const ROLES: Role[] = ['player', 'coach', 'admin']

export default function Users() {
  const me = useMe()
  const { run } = useRun()
  const users = useClub((s) => s.users)
  const [pending, setPending] = useState<User | null>(null)

  return (
    <section data-testid="users-page">
      <h2 className="mb-4 text-xl font-semibold">Users</h2>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table data-testid="users-table" className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Level</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === me.id
              return (
                <tr key={u.id} data-testid={`user-row-${u.id}`} data-active={u.active} className={`border-t ${u.active ? '' : 'bg-slate-50 text-slate-400'}`}>
                  <td data-testid={`user-name-${u.id}`} className="p-3 font-medium">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.level}</td>
                  <td className="p-3">
                    <select
                      data-testid={`user-role-${u.id}`}
                      aria-label={`Role of ${u.name}`}
                      value={u.role}
                      disabled={self}
                      title={self ? "You can't change your own role" : undefined}
                      className="rounded border px-2 py-1 disabled:opacity-50"
                      onChange={(e) => run(() => api.setUserRole(u.id, e.target.value as Role), 'Role updated')}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        role="switch"
                        data-testid={`user-active-${u.id}`}
                        aria-label={`Active: ${u.name}`}
                        checked={u.active}
                        disabled={self}
                        title={self ? "You can't deactivate yourself" : undefined}
                        onChange={() => setPending(u)}
                      />
                      <span data-testid={`user-status-${u.id}`}>{u.active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pending && (
        <Modal title={pending.active ? 'Deactivate user?' : 'Reactivate user?'} testId="user-confirm-dialog" onClose={() => setPending(null)}>
          <p data-testid="user-confirm-text" className="text-sm text-slate-600">
            {pending.active
              ? `${pending.name} will be logged out and all their future reservations will be cancelled.`
              : `${pending.name} will be able to use the club again.`}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-testid="user-confirm-cancel" className="rounded border px-4 py-2 text-sm" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              type="button"
              data-testid="user-confirm-ok"
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={async () => {
                const target = pending
                setPending(null)
                await run(() => api.setUserActive(target.id, !target.active), target.active ? 'User deactivated' : 'User reactivated')
              }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
