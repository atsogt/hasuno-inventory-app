# Hasuno Inventory Requests — build brief

You are helping build a small production web app for a sushi restaurant (Hasuno, Indianapolis). A working front-end **prototype** lives in `prototype/index.html` — open it, click through all three roles, and treat it as the source of truth for screens, copy, roles, and visual style. This document is the spec for turning that prototype into a real, hosted, multi-device app.

## What the app does

Kitchen staff request inventory from their own phones. A worker taps an item (or types a custom one) and it posts a timestamped request to a shared log. Managers and the owner see every request in real time, with a live "time since sent" counter, and can clear them. Managers/owner can also schedule reminders that nudge selected workers to place their orders.

## Roles & permissions (enforce server-side, not just in the UI)

- **owner** — full access. Can create/delete/lock any account (except cannot delete other owners), including managers. Can manage the item catalog, submit requests, see all requests, delete any request, and send worker reminders.
- **manager** — same as owner but can only create/delete/lock **workers**, not other managers or the owner.
- **worker** — can submit requests, see and delete **their own** requests, and see reminders sent to them. Cannot manage accounts or the item catalog.

There is **no public sign-up**. Accounts are provisioned by the owner/manager. A user signs in with their **name + an assigned password**.

## Data model (Postgres)

- **profiles**: id, name (unique, used for login), role (`owner`|`manager`|`worker`), locked (bool), phone, email, created_at. Passwords handled by the auth layer (see below), not stored in plaintext.
- **items** (catalog): id, name (unique), amount (int, "how many to get"), created_at.
- **requests**: id, item_name, amount (nullable), requested_by_id (fk profiles), requested_by_name (denormalized for display), sent_at, created_at.
- **staff_reminders**: id, message, scheduled_at, created_by_name, target_ids (array of profile ids), dismissed_by (array of profile ids), created_at.

Match the field semantics in the prototype exactly (e.g. `amount` null on requests means "no specific quantity"; reminders become visible to a target once `scheduled_at` has passed and they haven't dismissed).

## Screens (all present in the prototype — mirror them)

1. **Login** — name + password. Show a clear error for wrong name, wrong password, or locked account. Lotus logo on this screen.
2. **Request** — item grid (tap to request, shows Qty), an "Other" free-text card, and for owner/manager a "Create New Item" card. A worker who has an active reminder sees a highlighted banner at the top.
3. **My Requests** (worker) — their own requests, each deletable, each with a "set reminder" affordance.
4. **Requests** (owner/manager) — all requests with requester name, live elapsed badge (green <1h, amber 1–3h, red >3h), delete on any.
5. **Accounts** (owner/manager) — add account (name, password, role, phone, email), list with contact info, lock/unlock, delete, edit contact, and the **Remind Workers to Order** panel (pick workers, pick when, message, send; list scheduled/sent with cancel).

## The two things the prototype can't do (this is why we're building the real app)

1. **Real persistence across devices** — the prototype uses shared browser storage. Replace with the Postgres DB.
2. **Real-time + real notifications** — the prototype only updates while a page is open. The real app needs:
   - Live updates: when a worker posts a request, managers' request lists update **without refreshing**. Use Supabase Realtime (Postgres changes over WebSocket) or equivalent.
   - Reminders that reach a phone even when the app is closed: implement **Web Push** (VAPID) via a PWA service worker, plus a scheduled job that fires due `staff_reminders`. Optionally email as a fallback.

## Recommended stack (all have free tiers — see README)

- **Next.js (App Router, TypeScript)** front end + API routes.
- **Supabase**: Postgres + Auth + Realtime + Row Level Security + Edge Functions + `pg_cron` for scheduled reminders.
- **Vercel** for hosting the Next.js app.
- **PWA**: manifest + service worker for home-screen install and Web Push.
- Keep it installable on iPhone via Safari "Add to Home Screen" (iOS Web Push requires the installed PWA, iOS 16.4+).

You may choose a different equivalent stack, but preserve: server-enforced roles, real-time request updates, and push-capable reminders — all within free tiers.

## Auth approach

Provision users as owner/manager-created accounts (no self-signup). Two acceptable options:
- **Supabase Auth** with email/password, where the "name" is a unique profile field and login maps name→account server-side. Roles + `locked` live in `profiles`, guarded by RLS.
- A custom credentials flow with securely hashed passwords (argon2/bcrypt) and short-lived sessions, if that better fits the name-based login.

Never store plaintext passwords. Enforce `locked` at sign-in.

## Security must-haves

- Row Level Security so a worker can only read/delete their own requests; managers/owner can read all; only owner/manager can write items and reminders; only owner/manager can manage accounts within their allowed scope.
- All permission checks server-side. The UI hides controls, but the server is the gate.

## Visual system (from the prototype — keep it)

- Fonts: Zen Kaku Gothic New (display/body), IBM Plex Mono (labels/data).
- Palette: ink `#1C2B2A`, paper `#F6F1E6`, card `#FBF8F1`, line `#D9CEB4`, accent `#B23A2E`, gold logo `#C9A24B`.
- Ticket/"chit" cards for requests, mono labels, restrained accent use. Logo lives in `assets/logo.png` (swap in the official Hasuno file if provided).

## Build order (suggested)

1. Scaffold Next.js + Supabase, env wiring, `assets/logo.png` into the app.
2. Schema + RLS migrations for the four tables.
3. Auth + provisioning (seed one owner account to start).
4. Screens, ported from the prototype, reading/writing the DB.
5. Realtime on requests.
6. PWA + Web Push + scheduled reminder job.
7. Deploy to Vercel; verify iPhone install + a test push.

Seed one owner to bootstrap (then delete the demo credentials): name `Andy`. Do **not** carry over the prototype's demo passwords into production.
