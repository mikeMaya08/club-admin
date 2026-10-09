import { useState } from 'react'
import { api, useClub } from 'club-store'
import { format, parseISO } from 'date-fns'
import { useMe } from '../lib/useMe'
import { useRun } from '../lib/useRun'

export default function NotificationBell() {
  const me = useMe()
  const [open, setOpen] = useState(false)
  const { run } = useRun()
  const items = useClub((s) =>
    s.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
  )
  const unread = items.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="notification-bell"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        className="relative rounded-md bg-green-800 px-3 py-1.5 text-sm hover:bg-green-900"
        onClick={() => setOpen((o) => !o)}
      >
        🔔
        {unread > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[11px] font-bold leading-[18px]"
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-dropdown"
          className="fixed inset-x-2 top-14 z-50 rounded-lg border bg-white text-slate-900 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <strong className="text-sm">Notifications</strong>
            <button
              type="button"
              data-testid="notifications-mark-all"
              disabled={unread === 0}
              className="text-xs font-medium text-green-700 disabled:text-slate-400"
              onClick={() => run(() => api.markAllNotificationsRead(me.id))}
            >
              Mark all as read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li data-testid="notifications-empty" className="px-3 py-6 text-center text-sm text-slate-500">
                No notifications
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                data-testid={`notification-${n.id}`}
                data-read={n.read}
                className={`flex items-start justify-between gap-2 border-b px-3 py-2 text-sm ${n.read ? 'text-slate-500' : 'bg-green-50 font-medium'}`}
              >
                <div>
                  <p data-testid={`notification-message-${n.id}`}>{n.message}</p>
                  <p className="text-xs text-slate-500">{format(parseISO(n.createdAt), 'MMM d, HH:mm')}</p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    data-testid={`notification-read-${n.id}`}
                    className="shrink-0 text-xs text-green-700 underline"
                    onClick={() => run(() => api.markNotificationRead(n.id))}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
