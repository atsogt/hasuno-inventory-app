# Hasuno Inventory Requests

Next.js + Supabase app, built from `CLAUDE.md`'s spec against the `prototype/index.html` reference. Code is done and builds clean — this is the checklist to actually go live.

## What's built

- Next.js 14 (App Router, TypeScript) + Tailwind, matching the prototype's visual system.
- Supabase Postgres schema + RLS (`supabase/migrations/0001_init.sql`): `profiles`, `items`, `requests`, `staff_reminders`, `push_subscriptions`.
- Auth: Supabase Auth, name-based login mapped to a synthetic email server-side (`lib/auth.ts`). No public signup — accounts are provisioned from the Accounts screen.
- All 5 screens (Login, Request, My Requests, Requests, Accounts) with server-enforced role checks (`app/actions/*.ts` + RLS as a second layer).
- Realtime: every screen re-syncs live via Supabase Postgres Changes (`components/RealtimeRefresh.tsx`).
- PWA: `public/manifest.json`, `public/sw.js`, an in-app "Enable notifications" prompt, and a Supabase Edge Function (`supabase/functions/send-reminders`) that pg_cron fires every minute to push due reminders.

## Go live

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

### 3. Apply the database schema
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
This runs both files in `supabase/migrations/`. **`0002_cron.sql` has two placeholders** (`<PROJECT_REF>`, `<CRON_SECRET>`) — edit that file with your real project ref and the `CRON_SECRET` from step 2 before pushing, or apply it manually in the SQL Editor after step 5 once you know both values for certain.

### 4. Seed the owner account
```bash
OWNER_NAME=Andy OWNER_PASSWORD='choose-a-real-password' npm run seed:owner
```
This is the only account that exists until you add more from the Accounts screen. Don't reuse the prototype's demo passwords.

### 5. Deploy the reminder push function
```bash
npx supabase functions deploy send-reminders
npx supabase secrets set VAPID_PUBLIC_KEY=<value> VAPID_PRIVATE_KEY=<value> VAPID_SUBJECT=<value> CRON_SECRET=<value>
```
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set those.) Then apply `0002_cron.sql` if you didn't already in step 3.

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
On each worker's iPhone: open the URL in Safari → Share → **Add to Home Screen** (required for Web Push on iOS 16.4+). Sign in, tap "Enable notifications," and send yourself a test reminder from the Accounts screen.

## Local development
```bash
npm install
npm run dev
```
Needs `.env.local` from step 2 pointed at a Supabase project with the schema applied.

## Notes
- `assets/` holds the source logo files; `public/logo.png` / `public/logo.svg` are the copies Next.js actually serves — keep both in sync if you swap in a different logo.
- The remaining `npm audit` finding (`GHSA-955p-x3mx-jcvp`, Server Action ID disclosure, no Next 14.x fix exists yet) is mitigated here by design: every Server Action re-checks the caller's session and role itself (`requireProfile`/`requireRole` in `lib/auth.ts`), so knowing an action's ID doesn't grant access. Revisit if/when upgrading to Next 15+.
