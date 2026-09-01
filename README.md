# Hasuno Inventory Requests

Next.js + Supabase app, built from `CLAUDE.md`'s spec against the `prototype/index.html` reference.

**Live at [hasuno-inventory-app.vercel.app](https://hasuno-inventory-app.vercel.app).** The steps below are the setup this deployment already went through — keep them around for standing up a fresh environment (staging, a rebuild, someone else's machine) rather than as an outstanding to-do list.

## What's built

- Next.js 14 (App Router, TypeScript) + Tailwind, matching the prototype's visual system — plus a full dark mode (toggle in the header, defaults to system preference).
- Supabase Postgres schema + RLS (`supabase/migrations/`): `profiles`, `items` (with station/category grouping), `requests` (with an urgent flag), `staff_reminders`, `reminder_history`, `push_subscriptions`.
- Auth: Supabase Auth, name-based login mapped to a synthetic email server-side (`lib/auth.ts`). No public signup — accounts are provisioned from the Accounts screens.
- Login, Request (searchable, grouped by station/category, tap-to-open inline qty stepper that auto-sends after a few seconds idle, floating quick-add), My Requests, Requests (grouped by requestor, plus an owner/manager "clear all"), and Accounts — split into three tabs (Remind / Manage Accounts / Add Account) — all with server-enforced role checks (`app/actions/*.ts` + RLS as a second layer).
- Reminder History: a popup on Accounts → Remind showing every worker reminder ever sent, backed by its own append-only `reminder_history` table (kept separate from `staff_reminders` so clearing history can never touch a live/scheduled reminder).
- Realtime: every screen re-syncs live via Supabase Postgres Changes (`components/RealtimeRefresh.tsx`).
- PWA: `public/manifest.json`, `public/sw.js`, an in-app "Enable notifications" prompt, and a Supabase Edge Function (`supabase/functions/send-reminders`) that pg_cron fires every minute to push due reminders — and, if `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are set, emails `profiles.email` at the same time as a fallback that doesn't depend on the PWA being installed.

See `ARCHITECTURE.md` for the full file-by-file map.

## Setting up a fresh environment

Run these in order. Each step's account/dashboard action is called out; everything else is a command.

### 1. Create the Supabase project
Sign up / log in at supabase.com → New Project. Note the **project ref**, and from Project Settings → API grab the **Project URL**, **anon key**, and **service_role key**.

### 2. Configure environment
```bash
cp .env.local.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from step 1.

Generate Web Push keys and fill `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`:
```bash
npx web-push generate-vapid-keys
```
Set `VAPID_SUBJECT` to `mailto:` + your email, and set `CRON_SECRET` to any random string (`openssl rand -hex 32`).

Optional email fallback: sign up free at [resend.com](https://resend.com) (no card required, 3,000 emails/month), verify a sending domain (or use their `onboarding@resend.dev` for testing), and fill `RESEND_API_KEY` / `RESEND_FROM_EMAIL`. Leave both blank to send push only.

### 3. Apply the database schema
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
This runs every file in `supabase/migrations/` in order (schema, cron, item categories + seed data, the urgent flag, reminder history, scoped profile write policies). **`0002_cron.sql` has two placeholders** (`<PROJECT_REF>`, `<CRON_SECRET>`) — edit that file with your real project ref and the `CRON_SECRET` from step 2 before pushing, or apply it manually in the SQL Editor after step 5 once you know both values for certain.

### 4. Seed the owner account
```bash
OWNER_NAME=Andy OWNER_PASSWORD='choose-a-real-password' npm run seed:owner
```
This is the only account that exists until you add more from **Accounts → Add Account**. Don't reuse the prototype's demo passwords.

### 5. Deploy the reminder push function
```bash
npx supabase functions deploy send-reminders
npx supabase secrets set VAPID_PUBLIC_KEY=<value> VAPID_PRIVATE_KEY=<value> VAPID_SUBJECT=<value> CRON_SECRET=<value>
```
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set those.) Then apply `0002_cron.sql` if you didn't already in step 3.

If you set up the Resend email fallback in step 2, also set those as Supabase secrets (they're read by the Edge Function, never by Next.js):
```bash
npx supabase secrets set RESEND_API_KEY=<value> RESEND_FROM_EMAIL=<value>
```

### 6. Deploy to Vercel
```bash
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add AUTH_EMAIL_DOMAIN production
npx vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
npx vercel env add VAPID_PRIVATE_KEY production
npx vercel env add VAPID_SUBJECT production
npx vercel --prod
```
That last command prints your live URL.

### 7. Verify on a phone
On each worker's iPhone: open the URL in Safari → Share → **Add to Home Screen** (required for Web Push on iOS 16.4+). Sign in, tap "Enable notifications," and send yourself a test reminder from **Accounts → Remind**.

## Local development
```bash
npm install
npm run dev
```
Needs `.env.local` from step 2 pointed at a Supabase project with the schema applied.

## Notes
- **`0005_reminder_history.sql` and `0006_scope_profile_writes.sql` have not been pushed to the live deployment yet.** Run `npx supabase db push` (or apply them manually in the SQL Editor). Until 0005 lands, Reminder History fails *silently* — the popup renders empty and the history insert is swallowed, so reminders sent in the meantime are permanently absent from the log. Until 0006 lands, a manager can change any profile row (including their own role) directly via PostgREST — see `DRIFT-LOG.md`.
- `assets/` holds the source logo files; `public/logo.png` / `public/logo.svg` are the copies Next.js actually serves — keep both in sync if you swap in a different logo.
- The remaining `npm audit` finding (`GHSA-955p-x3mx-jcvp`, Server Action ID disclosure, no Next 14.x fix exists yet) is mitigated here by design: every Server Action re-checks the caller's session and role itself (`requireProfile`/`requireRole` in `lib/auth.ts`), so knowing an action's ID doesn't grant access. Precisely: that covers *role*-gated actions. For row-level actions that take a caller-supplied id (`editRequest`, `deleteRequest`, `setRequestReminder`, `clearRequestReminder`) the thing stopping you touching someone else's row is RLS, not the action — the action only verifies you're signed in. Revisit if/when upgrading to Next 15+.
