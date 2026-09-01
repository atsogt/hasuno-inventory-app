# Architecture Reference

Machine-oriented map of this codebase. Read this before editing — it's denser and faster to parse than reading every file. `CLAUDE.md` is the original spec (what to build); `README.md` is the deploy runbook (how to ship it); this file is what's actually here.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind (class-based dark mode via CSS variables) · Supabase (Postgres + Auth + Realtime + Edge Functions + pg_cron) · Vercel · Web Push (VAPID). No ORM — raw `@supabase/supabase-js` queries.

## Mental model in one paragraph

Every mutation goes through a **Server Action** in `app/actions/*.ts`. Each action re-derives the caller's identity from their session (`requireProfile()` / `requireRole()`) and re-checks permission itself — it never trusts the client. Postgres **Row Level Security** enforces the same rules a second time at the database layer, so even a bug in an action can't leak data. Reads happen directly in Server Components (`app/**/page.tsx`) via a session-scoped Supabase client. Every screen also mounts `<RealtimeRefresh>`, which subscribes to Postgres change events and calls `router.refresh()` so all open screens stay in sync with no polling.

## Request lifecycle (concrete trace)

1. Worker taps an item on `/request` → `RequestScreen.tsx` opens an inline **qty stepper** in place of that grid cell (`beginOrBump`), pre-filled from `myOpenRequests` (passed down from the page) if they already have an open request for that item name, else from the item's catalog `amount`. Further taps, +/−, or typing a number adjust the pending quantity; a progress bar auto-sends it after `PENDING_SEND_MS` (3s) of no interaction, or "Send now"/"Cancel" resolve it immediately. Unmounting the screen mid-pending (e.g. switching tabs) flushes rather than drops it.
2. **No existing request:** on send, calls `submitRequest()` (`app/actions/requests.ts`), which resolves `requireProfile()` → inserts into `requests` with `requested_by_id = profile.id`.
3. **Existing request found:** calls `requestAgain()` instead, which updates the *same* row's `amount`, `urgent`, and bumps `sent_at` to now (rather than inserting a duplicate). The free-text "Other" field still uses the older confirm-dialog flow (`duplicate` state + `confirmRequestAgain()`) since it can't pre-open a stepper for an item that isn't in the grid.
4. RLS policies (`signed-in users insert own requests`, `workers update own requests`) re-verify `requested_by_id = auth.uid()` at the DB layer either way.
5. The write fires a Postgres change event on `requests` (it's in the `supabase_realtime` publication).
6. Every open `/requests`, `/my-requests`, and `/request` tab has a `<RealtimeRefresh>` subscribed via `lib/supabase/client.ts`; it receives the event and calls `router.refresh()` — no manual reload, on any device. `/request` subscribes to `requests` specifically so its `myOpenRequests` (which the stepper targets by row id) can't go stale behind a `clearAllRequests()` on another device.

Owner/manager can also wipe the whole `requests` table at once: `RequestsHeader.tsx` (mounted at the top of `/requests`) has a "clear all" link that confirms via `Modal` then calls `clearAllRequests()` (`app/actions/requests.ts`, `requireRole("owner","manager")`).

## Auth model

Login is by **name**, not email — but Supabase Auth requires an email, so `nameToEmail()` (`lib/auth.ts`) deterministically maps `"Andy"` → `andy@<AUTH_EMAIL_DOMAIN>` (never actually emailed). The login form still only ever shows/asks for a name.

- `app/actions/auth.ts` → `login()`: looks up `locked` status via the **admin client** (profiles aren't readable pre-auth under RLS), then calls `supabase.auth.signInWithPassword()`.
- `middleware.ts`: refreshes the Supabase session cookie on every request (required by `@supabase/ssr`).
- `lib/auth.ts` → `getCurrentProfile()` / `requireProfile()` / `requireRole(...roles)`: the gate every page and action calls first. `requireRole` redirects if the caller's role isn't in the allowed set.
- `lib/auth-client.ts` → `canManage(actor, target)`: pure role logic (owner manages everyone but owners; manager manages only workers). Duplicated as a client-safe export (no `next/headers` import) because it's also used in `ManageAccountsPanel.tsx` to hide buttons — **the server-side checks are the real gate**, this only drives UI.

## File map

### Routes (`app/`)
| Path | Renders | Notes |
|---|---|---|
| `app/page.tsx` | — | Redirects to `/login` or `/request` based on session |
| `app/login/page.tsx` | Login screen | Client component, calls `login()` action |
| `app/(app)/layout.tsx` | Topbar + Tabbar + PushRegister shell | Runs `requireProfile()`; wraps children in `<ToastProvider>` |
| `app/(app)/request/page.tsx` | Request screen | Fetches `items`, this user's active `staff_reminders`, and this user's own open `requests` (for duplicate detection) |
| `app/(app)/my-requests/page.tsx` | Worker's own requests | `requireProfile()` only (any role) |
| `app/(app)/requests/page.tsx` | `<RequestsHeader>` + all requests, grouped by requestor (most recently active first), each group collapsible, plus a Collapse all/Expand all toggle | `requireRole("owner","manager")`; `<RequestsHeader>` adds the "clear all" action |
| `app/(app)/accounts/layout.tsx` | `<AccountsSubnav>` (Remind / Manage Accounts / Add Account tabs) + children | `requireRole("owner","manager")` |
| `app/(app)/accounts/page.tsx` | — | Redirects to `/accounts/remind` |
| `app/(app)/accounts/remind/page.tsx` | `<RemindPanel>` (which itself renders `<ReminderHistoryButton>`) | Worker reminder scheduling + scheduled/sent list + reminder history popup; fetches `staff_reminders` and `reminder_history` in parallel |
| `app/(app)/accounts/manage/page.tsx` | `<ManageAccountsPanel>` | Account list: lock/unlock, delete, edit contact |
| `app/(app)/accounts/add/page.tsx` | `<AddAccountForm>` | Create an account |
| `app/api/push/subscribe/route.ts` | POST | Saves a browser's push subscription for the signed-in user |

### Server Actions (`app/actions/`) — the real permission boundary
| File | Exports | Guard |
|---|---|---|
| `auth.ts` | `login`, `logout` | n/a (pre-auth / self) |
| `requests.ts` | `submitRequest`, `editRequest` (amount + urgent), `requestAgain` (amount + urgent + resets `sent_at`), `deleteRequest`, `clearAllRequests` (wipes the whole table), `setRequestReminder`, `clearRequestReminder`, `addItemToCatalog`, `saveItemEdit`, `removeItemFromCatalog` | `requireProfile()`; `clearAllRequests` and catalog writes require `requireRole("owner","manager")` / `role !== "worker"` |
| `reminders.ts` | `scheduleStaffReminder` (also writes a `reminder_history` row — best-effort, doesn't block the reminder itself), `deleteStaffReminder`, `clearReminderHistory` (owner/manager), `dismissStaffReminder` (any target) | `requireRole("owner","manager")` or `requireProfile()` |
| `accounts.ts` | `addAccount`, `saveAccountContact`, `toggleLock`, `deleteAccount` | `requireRole("owner","manager")` + `canManage()`; account creation/deletion uses `createAdminClient()` (Supabase Auth admin API) |

### Shared logic (`lib/`)
| File | Purpose |
|---|---|
| `types.ts` | `Role`, `Profile`, `Station` (`"Sushi" \| "Kitchen"`), `Item`, `Request`, `StaffReminder`, `ReminderHistoryEntry` — mirrors the DB schema, except `StaffReminder` omits `pushed_at` (written only by the Edge Function, never read by the app) |
| `auth.ts` | `nameToEmail`, `getCurrentProfile`, `requireProfile`, `requireRole`, re-exports `canManage` (server-only: uses `next/headers`) |
| `auth-client.ts` | `canManage(actor, target)` — pure, safe to import from Client Components |
| `time.ts` | `fmtDate`, `elapsedInfo` (drives the green/amber/red elapsed badge), `elapsedClassMap` — all theme-token based, no hardcoded hex |
| `supabase/server.ts` | `createClient()` — session-scoped, for Server Components/Actions. **RLS applies as the calling user.** |
| `supabase/client.ts` | `createClient()` — browser client, used only by `RealtimeRefresh` and `PushRegister` |
| `supabase/admin.ts` | `createAdminClient()` — service-role key, bypasses RLS. Server-only. Used for: pre-auth login lookups, account provisioning/deletion (Auth admin API) |

### Components (`components/`) — all Client Components unless noted
| File | Purpose |
|---|---|
| `RequestScreen.tsx` | Search + Sushi/Kitchen filter pills, item grid grouped by station→category, tap-to-open inline qty stepper per item (auto-sends after idle, see lifecycle above), floating "+" quick-add button opening a sheet (free-text request + owner/manager catalog-add), duplicate-request dialog for the free-text path, item edit modal |
| `RequestsHeader.tsx` | `/requests`-only header: "Open Requests (n)" label + a "clear all" link (confirm modal → `clearAllRequests()`) |
| `RequestList.tsx` / `RequestChit.tsx` | Used on **both** `/my-requests` (worker, `showRequester=false`, flat list, `allowDeleteAll=false`, own reminder modal via `selfId`) and `/requests` (owner/manager, `showRequester=true`, `allowDeleteAll=true`, paired with `<RequestsHeader>`'s table-wide clear-all). When `showRequester` is true, `RequestList` groups chits by `requested_by_id` (order = first appearance, i.e. most recently active requestor first since `requests` is queried newest-first), each group collapsible via local `collapsed: Set<string>` state, plus a Collapse all/Expand all toggle. Each `RequestChit` still owns its own elapsed badge, urgent badge, quantity+urgent edit modal, delete. Deliberately the *same* `RequestChit` on both routes so edit/delete behavior and modal layout can't drift between roles. |
| `AccountsSubnav.tsx` | Segmented-control tabs for the three `/accounts/*` routes |
| `RemindPanel.tsx` | Worker picker + send-at options + message → `scheduleStaffReminder`; lists scheduled/sent reminders with cancel; renders `<ReminderHistoryButton>` above the picker |
| `ReminderHistoryButton.tsx` | Popup button (badge = history count) showing every reminder ever sent, sourced from `reminder_history` — independent of `staff_reminders`, so clearing history can't touch a live/scheduled reminder; "Clear all history" → `clearReminderHistory()` |
| `ManageAccountsPanel.tsx` | Account cards (avatar initial, role badge, contact info) with Contact/Lock/Delete actions gated by `canManage()` |
| `AddAccountForm.tsx` | Name/password/role/phone/email → `addAccount` |
| `ElapsedBadge.tsx` | Self-ticking (30s interval) green/amber/red time-since-sent badge |
| `RealtimeRefresh.tsx` | Subscribes to `postgres_changes` on given tables, calls `router.refresh()` |
| `PushRegister.tsx` | Registers `public/sw.js`, prompts + subscribes to Web Push, POSTs subscription to `/api/push/subscribe` |
| `ThemeToggle.tsx` | Toggles the `dark` class on `<html>`, persists choice to `localStorage` |
| `Toast.tsx` | `ToastProvider` + `useToast()` — app-wide toast context |
| `Modal.tsx` | Generic confirm/cancel modal — `fixed inset-0`, centered, used everywhere. Renders via `createPortal(..., document.body)`, so it's immune to being trapped by any ancestor's `backdrop-filter`/`transform`/`filter` (those properties make an element a containing block for `position: fixed` descendants — without the portal, nesting a Modal caller inside such an ancestor makes the modal render tiny/off-center relative to that ancestor instead of centered on the viewport, and its scrim stops blocking outside clicks). This bit twice before the portal fix: once with a scrapped grouped/collapsing Requests variant nested inside `.chit`, again when `.content-scrim` (see below) — which itself uses `backdrop-filter` and wraps every page's content, worker included — was added. The portal is **load-bearing**, not just defensive: `.content-scrim` is a real `position: fixed` containing block today, so removing the portal would immediately retrap every Modal caller on every screen. |
| `Topbar.tsx` (Server Component) / `Tabbar.tsx` | Chrome; `Tabbar` shows role-based tabs + a "has requests" badge dot; Accounts tab highlights active for any `/accounts/*` sub-route |

### Background photos & `.content-scrim` (`app/globals.css`)

`.aurora` (fixed, full-bleed, `z-index: -10`, mounted once in `app/layout.tsx`) renders a real photo per theme — `public/backgrounds/moss-rock-dark.jpg` in dark mode, `public/backgrounds/sky-light.jpg` in light — under a tinted gradient. It relies on `body` having **no background of its own**: an opaque `body` background would paint over a negative-`z-index` fixed child (normal in-flow boxes paint after negative-`z-index` descendants in the same stacking context), which is exactly why the photo was invisible until that rule was removed.

`.content-scrim` (wraps page content in `app/(app)/layout.tsx` and `app/login/page.tsx`) is the translucent layer between that photo and the actual UI: flat, full-width, hard-edged — `background: var(--glass-fill)` + `backdrop-filter: blur(...)` directly on the element, no mask, no fade. (An earlier version faded the scrim's edges via a masked `::before` pseudo-element so real content wouldn't fade with it; that was reverted in favor of a plain hard edge. If edge-fading comes back, redo it on a `::before`/`::after` layer, not on `.content-scrim` itself, or the mask will fade the real content sitting inside it too.)

### Database (`supabase/`)
| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | Base schema: 5 tables, RLS policies, 2 `SECURITY DEFINER` helper functions (`current_role_is`, `current_is_owner_or_manager`), 1 trigger (`guard_staff_reminder_worker_update` — stops a worker from editing a reminder's message/targets while dismissing it), adds `requests`+`staff_reminders` to the realtime publication |
| `migrations/0002_cron.sql` | Schedules `pg_cron` to POST to the `send-reminders` Edge Function every minute. **Ships with `<PROJECT_REF>`/`<CRON_SECRET>` placeholders** — the live DB already has the real values applied manually; this file is documentation, not idempotent-safe to rerun blindly |
| `migrations/0003_item_categories.sql` | Adds `items.station` (`'Sushi'\|'Kitchen'`, checked), `items.category` (free text), `items.is_prep` (bool); seeds the 89-item Hasuno v4 menu ingredient list, `on conflict (name) do nothing` |
| `migrations/0004_request_urgent.sql` | Adds `requests.urgent` (bool, default false) |
| `migrations/0005_reminder_history.sql` | Adds `reminder_history` — an append-only audit log of every `staff_reminders` insert, deliberately a separate table (not a soft-delete flag on `staff_reminders`) so clearing history can never affect a reminder that's still scheduled/live. Owner/manager RLS only; also adds `reminder_history` to the `supabase_realtime` publication (the remind page subscribes to it). **Not yet applied to the live DB as of the last sync — run `npx supabase db push` before `clearReminderHistory()`/reminder history will work in production.** |
| `migrations/0006_scope_profile_writes.sql` | Replaces 0001's unscoped `profiles` INSERT/UPDATE policies (and its DELETE policy) with role-scoped ones mirroring `canManage()` — 0001 let a manager promote themselves to owner via PostgREST. **Not yet applied to the live DB.** |
| `functions/send-reminders/index.ts` | Deno Edge Function. Finds `requests.reminder_at` and `staff_reminders.scheduled_at` that are due and unpushed, sends Web Push via `web-push` and, if `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are set, emails `profiles.email` via the Resend HTTP API (`notifyProfile()`, both fire in parallel — email is best-effort, no-ops silently if the secrets are unset), marks them notified (`reminder_notified` / `pushed_at`). Auth'd by a `CRON_SECRET` bearer header, not Supabase JWT |
| `config.toml` | Supabase CLI project config (from `supabase init`) |

### Root config
| File | Purpose |
|---|---|
| `middleware.ts` | Refreshes Supabase session cookie on every request except static assets |
| `scripts/seed-owner.ts` | One-off: `OWNER_NAME=x OWNER_PASSWORD=y npm run seed:owner` creates the first owner via the admin API |
| `.env.local.example` | Template for all required env vars (see below) — the only env file that's actually committed |
| `tailwind.config.ts` | `darkMode: "class"`; colors resolve through CSS variables (`rgb(var(--ink) / <alpha-value>)` etc.) so `.dark` on `<html>` swaps the whole palette, opacity modifiers included |
| `app/globals.css` | Defines the light palette on `:root` and the dark palette on `.dark`; `.chit` / `.panel-card` / `.btn*` / `.field-*` component classes; and the `.aurora` / `.content-scrim` background layers described above |

## Database schema (quick reference)

| Table | Key columns | RLS summary |
|---|---|---|
| `profiles` | `id (=auth.users.id)`, `name` (unique), `role`, `locked`, `phone`, `email` | Readable by any signed-in user; writable only by owner/manager |
| `items` | `name` (unique), `amount`, `station` (`Sushi`\|`Kitchen`), `category`, `is_prep` | Readable by any signed-in user; writable only by owner/manager |
| `requests` | `item_name`, `amount`, `requested_by_id`, `requested_by_name`, `sent_at`, `reminder_at`, `reminder_notified`, `urgent` | Owner/manager: full read/write. Worker: only rows where `requested_by_id = auth.uid()` |
| `staff_reminders` | `message`, `scheduled_at`, `target_ids[]`, `dismissed_by[]`, `pushed_at` | Owner/manager: full read/write. Worker: read/update (dismiss-only, trigger-enforced) rows where `auth.uid() = any(target_ids)` |
| `reminder_history` | `message`, `scheduled_at`, `created_by_name`, `target_ids[]` | Owner/manager: full read/write. Append-only in practice — every `scheduleStaffReminder()` call inserts a row here in addition to `staff_reminders`; nothing else writes to it besides `clearReminderHistory()`'s bulk delete |
| `push_subscriptions` | `profile_id`, `endpoint`, `p256dh`, `auth` | Users manage their own; owner/manager can read all (for the send-reminders function) |

`profiles.id` is a foreign key to `auth.users.id` — there is no separate "sign up" flow; a profile only exists because `addAccount()` or `seed-owner.ts` created the Auth user first via the admin API.

## Environment variables

| Var | Used in | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/{server,client}.ts` | Session-scoped client, RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts`, `scripts/seed-owner.ts` | Bypasses RLS — server-only, never imported client-side |
| `AUTH_EMAIL_DOMAIN` | `lib/auth.ts` `nameToEmail()` | Synthetic email suffix for name-based login |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `PushRegister.tsx` (browser subscribe) | Web Push public key, Vercel env var |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `supabase/functions/send-reminders` | Same keypair, **unprefixed**, set as Supabase secrets — note the function reads `VAPID_PUBLIC_KEY`, not the `NEXT_PUBLIC_` name |
| `CRON_SECRET` | Edge Function only (Supabase secret, not a Vercel env var) | Bearer token pg_cron sends to authorize the push run |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | `supabase/functions/send-reminders` (Supabase secrets, not Vercel env vars) | Optional email fallback alongside push — `notifyProfile()` skips email entirely if either is unset |

## Security model (defense in depth)

1. **Server Actions** re-check `requireProfile()`/`requireRole()` on every call — never trust a client-supplied *role*. Note the distinction: `editRequest`, `deleteRequest`, `setRequestReminder`, `clearRequestReminder` take a caller-supplied row id and verify only that the caller is signed in — **row ownership is enforced by RLS alone**, not a second time in the action. They do now assert the write matched a row (`NO_ROW`), so a blocked write reports failure instead of a false success, but the boundary itself is single-layer.
2. **RLS** enforces the same boundary at the database, independent of application code.
3. **A DB trigger** closes a gap RLS row-filtering can't: it stops a worker from editing a `staff_reminders` row's content while exercising their "dismiss" permission on it.
4. Passwords are never stored — Supabase Auth handles hashing; nothing in this codebase touches a plaintext password after form submission.

## Known gaps

- **Migrations `0005_reminder_history.sql` and `0006_scope_profile_writes.sql` have not been pushed to the live DB yet** — run `npx supabase db push`. Note the 0005 failure mode is *silent*, not an error: the remind page falls back to `(reminderHistory || [])` so history renders empty, and `scheduleStaffReminder()`'s history insert is deliberately unchecked, so every reminder sent before the push is permanently missing from the audit log. Only `clearReminderHistory()` surfaces an error.
- The free-text "Other" request path (`RequestScreen.tsx`'s quick-add sheet) still uses the older confirm-dialog duplicate flow instead of the qty stepper, since the stepper is keyed to a grid item's `id` and there's no grid cell for a typed-in name.
- No in-app password reset yet (only via Supabase dashboard → Authentication → Users).
- `assets/logo.png` is a placeholder; swap in the real Hasuno logo (same filename) in **both** `assets/` and `public/` when available.
- Real SMS reminders (Twilio) not implemented — Web Push + in-app only, per `CLAUDE.md`'s free-tier constraint.
- A stray test item ("Good Job SOfia Item") is sitting in the live `items` table from early testing — harmless, but flagged for cleanup whenever convenient.
