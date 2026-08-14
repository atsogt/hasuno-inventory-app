# Architecture Reference

Machine-oriented map of this codebase. Read this before editing — it's denser and faster to parse than reading every file. `CLAUDE.md` is the original spec (what to build); `README.md` is the deploy runbook (how to ship it); this file is what's actually here.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind · Supabase (Postgres + Auth + Realtime + Edge Functions + pg_cron) · Vercel · Web Push (VAPID). No ORM — raw `@supabase/supabase-js` queries.

## Mental model in one paragraph

Every mutation goes through a **Server Action** in `app/actions/*.ts`. Each action re-derives the caller's identity from their session (`requireProfile()` / `requireRole()`) and re-checks permission itself — it never trusts the client. Postgres **Row Level Security** enforces the same rules a second time at the database layer, so even a bug in an action can't leak data. Reads happen directly in Server Components (`app/**/page.tsx`) via a session-scoped Supabase client. Every screen also mounts `<RealtimeRefresh>`, which subscribes to Postgres change events and calls `router.refresh()` so all open screens stay in sync with no polling.

## Request lifecycle (concrete trace)

1. Worker taps an item on `/request` → `RequestScreen.tsx` calls the `submitRequest()` action (`app/actions/requests.ts`).
2. `submitRequest()` calls `requireProfile()` to resolve `auth.uid()` → a `profiles` row, then inserts into `requests` with `requested_by_id = profile.id`.
3. RLS policy `signed-in users insert own requests` re-verifies `requested_by_id = auth.uid()` at the DB layer.
4. The insert fires a Postgres change event on the `requests` table (it's in the `supabase_realtime` publication).
5. Every open `/requests` and `/my-requests` tab has a `<RealtimeRefresh tables={["requests"]}>` subscribed via `lib/supabase/client.ts`; it receives the event and calls `router.refresh()`.
6. The Server Component re-runs its Supabase query and the new request chit appears — no manual reload, on any device.

## Auth model

Login is by **name**, not email — but Supabase Auth requires an email, so `nameToEmail()` (`lib/auth.ts`) deterministically maps `"Andy"` → `andy@<AUTH_EMAIL_DOMAIN>` (never actually emailed). The login form still only ever shows/asks for a name.

- `app/actions/auth.ts` → `login()`: looks up `locked` status via the **admin client** (profiles aren't readable pre-auth under RLS), then calls `supabase.auth.signInWithPassword()`.
- `middleware.ts`: refreshes the Supabase session cookie on every request (required by `@supabase/ssr`).
- `lib/auth.ts` → `getCurrentProfile()` / `requireProfile()` / `requireRole(...roles)`: the gate every page and action calls first. `requireRole` redirects if the caller's role isn't in the allowed set.
- `lib/auth-client.ts` → `canManage(actor, target)`: pure role logic (owner manages everyone but owners; manager manages only workers). Duplicated as a client-safe export because it's also used in `AccountsScreen.tsx` to hide buttons — **the server-side checks are the real gate**, this only drives UI.

## File map

### Routes (`app/`)
| Path | Renders | Notes |
|---|---|---|
| `app/page.tsx` | — | Redirects to `/login` or `/request` based on session |
| `app/login/page.tsx` | Login screen | Client component, calls `login()` action |
| `app/(app)/layout.tsx` | Topbar + Tabbar + PushRegister shell | Runs `requireProfile()`; wraps children in `<ToastProvider>` |
| `app/(app)/request/page.tsx` | Request screen | Fetches `items` + this user's active `staff_reminders` |
| `app/(app)/my-requests/page.tsx` | Worker's own requests | `requireProfile()` only (any role) |
| `app/(app)/requests/page.tsx` | All requests (owner/manager) | `requireRole("owner","manager")` |
| `app/(app)/accounts/page.tsx` | Account management + reminder panel | `requireRole("owner","manager")` |
| `app/api/push/subscribe/route.ts` | POST | Saves a browser's push subscription for the signed-in user |

### Server Actions (`app/actions/`) — the real permission boundary
| File | Exports | Guard |
|---|---|---|
| `auth.ts` | `login`, `logout` | n/a (pre-auth / self) |
| `requests.ts` | `submitRequest`, `deleteRequest`, `setRequestReminder`, `clearRequestReminder`, `addItemToCatalog`, `saveItemEdit`, `removeItemFromCatalog` | `requireProfile()`; catalog writes additionally check `role !== "worker"` |
| `reminders.ts` | `scheduleStaffReminder`, `deleteStaffReminder` (owner/manager), `dismissStaffReminder` (any target) | `requireRole("owner","manager")` or `requireProfile()` |
| `accounts.ts` | `addAccount`, `saveAccountContact`, `toggleLock`, `deleteAccount` | `requireRole("owner","manager")` + `canManage()`; account creation/deletion uses `createAdminClient()` (Supabase Auth admin API) |

### Shared logic (`lib/`)
| File | Purpose |
|---|---|
| `types.ts` | `Role`, `Profile`, `Item`, `Request`, `StaffReminder` — mirrors the DB schema exactly |
| `auth.ts` | `nameToEmail`, `getCurrentProfile`, `requireProfile`, `requireRole`, re-exports `canManage` (server-only: uses `next/headers`) |
| `auth-client.ts` | `canManage(actor, target)` — pure, safe to import from Client Components |
| `time.ts` | `fmtDate`, `elapsedInfo` (drives the green/amber/red elapsed badge), `elapsedClassMap` |
| `supabase/server.ts` | `createClient()` — session-scoped, for Server Components/Actions. **RLS applies as the calling user.** |
| `supabase/client.ts` | `createClient()` — browser client, used only by `RealtimeRefresh` and `PushRegister` |
| `supabase/admin.ts` | `createAdminClient()` — service-role key, bypasses RLS. Server-only. Used for: pre-auth login lookups, account provisioning/deletion (Auth admin API) |

### Components (`components/`) — all Client Components unless noted
| File | Purpose |
|---|---|
| `RequestScreen.tsx` | Item grid, "Other" free-text, create/edit-item panel (owner/manager), staff-reminder banner |
| `RequestList.tsx` / `RequestChit.tsx` | Request cards with elapsed badge, delete, per-request reminder modal |
| `AccountsScreen.tsx` | Add-account form, account list with lock/delete/contact-edit, "Remind Workers to Order" panel |
| `ElapsedBadge.tsx` | Self-ticking (30s interval) green/amber/red time-since-sent badge |
| `RealtimeRefresh.tsx` | Subscribes to `postgres_changes` on given tables, calls `router.refresh()` |
| `PushRegister.tsx` | Registers `public/sw.js`, prompts + subscribes to Web Push, POSTs subscription to `/api/push/subscribe` |
| `Toast.tsx` | `ToastProvider` + `useToast()` — app-wide toast context |
| `Modal.tsx` | Generic confirm/cancel bottom-sheet modal, used everywhere |
| `Topbar.tsx` (Server Component) / `Tabbar.tsx` | Chrome; `Tabbar` shows role-based tabs + a "has requests" badge dot |

### Database (`supabase/`)
| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | Full schema: 5 tables, RLS policies (18), 2 `SECURITY DEFINER` helper functions (`current_role_is`, `current_is_owner_or_manager`), 1 trigger (`guard_staff_reminder_worker_update` — stops a worker from editing a reminder's message/targets while dismissing it), adds `requests`+`staff_reminders` to the realtime publication |
| `migrations/0002_cron.sql` | Schedules `pg_cron` to POST to the `send-reminders` Edge Function every minute. **Ships with `<PROJECT_REF>`/`<CRON_SECRET>` placeholders** — the live DB already has the real values applied manually; this file is documentation, not idempotent-safe to rerun blindly |
| `functions/send-reminders/index.ts` | Deno Edge Function. Finds `requests.reminder_at` and `staff_reminders.scheduled_at` that are due and unpushed, sends Web Push via `web-push`, marks them notified (`reminder_notified` / `pushed_at`). Auth'd by a `CRON_SECRET` bearer header, not Supabase JWT |
| `config.toml` | Supabase CLI project config (from `supabase init`) |

### Root config
| File | Purpose |
|---|---|
| `middleware.ts` | Refreshes Supabase session cookie on every request except static assets |
| `scripts/seed-owner.ts` | One-off: `OWNER_NAME=x OWNER_PASSWORD=y npm run seed:owner` creates the first owner via the admin API |
| `.env.local.example` | Template for all required env vars (see below) — the only env file that's actually committed |
| `tailwind.config.ts` | Design tokens: `ink #1C2B2A`, `paper #F6F1E6`, `card #FBF8F1`, `line #D9CEB4`, `accent #B23A2E` — lifted directly from `prototype/index.html` |

## Database schema (quick reference)

| Table | Key columns | RLS summary |
|---|---|---|
| `profiles` | `id (=auth.users.id)`, `name` (unique), `role`, `locked`, `phone`, `email` | Readable by any signed-in user; writable only by owner/manager |
| `items` | `name` (unique), `amount` | Readable by any signed-in user; writable only by owner/manager |
| `requests` | `item_name`, `amount`, `requested_by_id`, `requested_by_name`, `sent_at`, `reminder_at`, `reminder_notified` | Owner/manager: full read/write. Worker: only rows where `requested_by_id = auth.uid()` |
| `staff_reminders` | `message`, `scheduled_at`, `target_ids[]`, `dismissed_by[]`, `pushed_at` | Owner/manager: full read/write. Worker: read/update (dismiss-only, trigger-enforced) rows where `auth.uid() = any(target_ids)` |
| `push_subscriptions` | `profile_id`, `endpoint`, `p256dh`, `auth` | Users manage their own; owner/manager can read all (for the send-reminders function) |

`profiles.id` is a foreign key to `auth.users.id` — there is no separate "sign up" flow; a profile only exists because `addAccount()` or `seed-owner.ts` created the Auth user first via the admin API.

## Environment variables

| Var | Used in | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/{server,client}.ts` | Session-scoped client, RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts`, `scripts/seed-owner.ts` | Bypasses RLS — server-only, never imported client-side |
| `AUTH_EMAIL_DOMAIN` | `lib/auth.ts` `nameToEmail()` | Synthetic email suffix for name-based login |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `PushRegister.tsx` (public key only) / `supabase/functions/send-reminders` | Web Push signing keypair |
| `CRON_SECRET` | Edge Function only (Supabase secret, not a Vercel env var) | Bearer token pg_cron sends to authorize the push run |

## Security model (defense in depth)

1. **Server Actions** re-check `requireProfile()`/`requireRole()` on every call — never trust a client-supplied role.
2. **RLS** enforces the same boundary at the database, independent of application code.
3. **A DB trigger** closes a gap RLS row-filtering can't: it stops a worker from editing a `staff_reminders` row's content while exercising their "dismiss" permission on it.
4. Passwords are never stored — Supabase Auth handles hashing; nothing in this codebase touches a plaintext password after form submission.

## Known gaps

- No in-app password reset yet (only via Supabase dashboard → Authentication → Users).
- `assets/logo.png` is a placeholder; swap in the real Hasuno logo (same filename) in **both** `assets/` and `public/` when available.
- Real SMS reminders (Twilio) not implemented — Web Push + in-app only, per `CLAUDE.md`'s free-tier constraint.
