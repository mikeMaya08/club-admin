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

```json
"club-store": "github:<org>/club-store#v0.1.0"
```

Create a Netlify site from this repo (`netlify.toml`; output goes to `dist/admin`) and point `club-shell`'s `_redirects` at it.

## Test hooks

`?reset=1&seed=demo|empty|full`, `?as=admin-1`, `?now=2026-10-10T18:30`, `?latency=800`, `?flaky=0.2`,
`?bug=double-booking,stale-ui,wrong-price,cancel-anytime,slow-render`; `window.__club` exposes
`{ state, reset(seed), setBugs([]), setNow(iso) }`. See the `club-store` README.

Example: <http://127.0.0.1:5000/admin/?reset=1&seed=demo&as=admin-1&now=2026-10-10T10:00>
