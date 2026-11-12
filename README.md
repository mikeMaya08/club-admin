# club-admin

Admin app of the **Baseline Tennis Club** sandbox, served at `/admin`. React 18 + Vite + TypeScript + Tailwind.
No backend: data lives in `localStorage` through the `club-store` package. `data-testid` is on roughly half of
the elements: tables, forms, filters and dialogs have them; the calendar and the dashboard do not.

## Features

- **Dashboard:** today's occupancy %, revenue (today / this week), no-shows this week, upcoming blocks, bookings-per-day chart (inline SVG).
- **Courts:** CRUD table, inline switches for *active* and *lights*, rename, delete (blocked with `COURT_IN_USE` when future reservations exist).
- **Calendar:** week view, one column per court inside each day. Drag on empty space to create a block (reason picker), drag a block to move it, click an item for details.
- **Reservations:** filters (date range, court, status, player), sortable columns, pagination (10/25/50), CSV export, row actions (no-show, cancel).
- **Users:** role change and active/inactive switch with confirm (you cannot change yourself).
- **Settings:** zod-validated form for every setting; saving updates the player app live.
- Hidden debug panel: **Ctrl+Shift+D**.

## Activity log

**Activity** (`/admin/activity`) shows every event in the club: filters by type group, user (or *System*) and date range, newest first, pagination (10/25/50) and **CSV export**. Admin actions now record the acting admin (moves, deletes, user, court and settings changes). It is the place to check side effects, e.g. a block shows `block.created` plus one `reservation.cancelled` per cancelled booking. The debug panel has a new bug, `missing-events`, that stops cancellations from being logged.

## Added in the product upgrade

- **Calendar:** drag a booked reservation to another court, day or hour (price and end time are recalculated and the player is notified), resize a block by its bottom edge, and use the *Move reservation* form in the details dialog as a keyboard-friendly alternative to dragging.
- **Lessons:** new page to create lessons for any coach, edit them (title, court, date, time, capacity; students are notified) and cancel them, with enrolled and waitlist counts.

## Dark mode and accessibility

- **Dark mode:** toggle in the header (🌙/☀️). The choice is saved in `localStorage['club:theme']`, which all apps share, and defaults to the operating system preference. It is implemented by remapping the Tailwind utilities in `src/index.css` under a `.dark` class (no `dark:` variants on each element).
- **Accessibility:** skip link, landmarks, visible focus ring, dialogs with `aria-labelledby`, focus moved into the dialog, kept inside it with Tab and restored on close. Audited with axe-core (WCAG 2 A/AA + best practices) on every page and dialog in light and dark themes: 0 violations at the time of writing.

## Scripts

| Script          | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm install`   | Install dependencies                          |
| `npm run dev`   | Dev server on <http://localhost:5102/admin/>  |
| `npm run build` | Typecheck + build into `dist/admin`           |

## How it connects to the other repos

- Depends on `club-store` (`"club-store": "file:../club-store"`): clone the repos side by side and run `npm install` in `club-store` first.
- All apps share data via `localStorage['club:v1']`, so open them through `club-shell`: <http://127.0.0.1:5000/admin/> (on macOS use `127.0.0.1`, port 5000 is taken by AirPlay on `localhost`).
- `base: '/admin/'`, router `basename="/admin"`, `resolve.dedupe` for React.

### Deploying

The committed dependency is the tagged git version (works on Vercel). For live development against a local `club-store`, temporarily use `"club-store": "file:../club-store"` and run `npm install`. Committed value:

```json
"club-store": "git+https://github.com/mikeMaya08/club-store.git#v0.1.0"
```

Deploy as its own **Vercel** project from this repo (config in `vercel.json`; the build writes to `dist/admin` so the files match the `/admin/` base path, and a rewrite gives deep links the SPA fallback). Name the project `club-admin` so `club-shell` can proxy `/admin/*` to `https://club-admin.vercel.app`. If the `club-store` repo is private, Vercel needs access to it (or switch to a public repo).

## Test hooks

`?reset=1&seed=demo|empty|full`, `?as=admin-1`, `?now=2026-10-10T18:30`, `?latency=800`, `?flaky=0.2`,
`?bug=double-booking,stale-ui,wrong-price,cancel-anytime,slow-render`; `window.__club` exposes
`{ state, reset(seed), setBugs([]), setNow(iso) }`. See the `club-store` README.

Example: <http://127.0.0.1:5000/admin/?reset=1&seed=demo&as=admin-1&now=2026-10-10T10:00>
