# Hasuno Inventory App — session handoff

Paste this into a new chat (or hand it to Claude Code) to pick up exactly where we left off. This is a **separate track** from the Hasuno maki training system in this project — it's an inventory-request app for the kitchen.

## What we're building

A phone-first web app for Hasuno kitchen staff to request inventory. A worker taps an item (or types a custom one); it posts a timestamped request to a shared log. Managers and the owner see requests in real time with a live "time since sent" counter, and can clear them. Managers/owner can also schedule reminders that nudge selected workers to place their orders.

### Requirements captured so far

- **Accounts are pre-provisioned. No public sign-up.** Users log in with **name + an assigned password**.
- **Roles:** `owner`, `manager`, `worker`.
  - Owner + managers can add / delete / lock accounts. Owner can manage managers; managers can only manage workers; no one deletes an owner.
  - Owner + managers can submit requests, see all requests, delete any request, manage the item catalog, and send worker reminders.
  - Workers submit requests, see + delete **their own**, and see reminders sent to them.
- **Requests** show the item, optional quantity, requester, a date that reads **weekday → month → day**, and **hours elapsed** since sent (green <1h, amber 1–3h, red >3h).
- **Item catalog:** owner/manager can create items, edit them, and give each an **amount** ("how many to get"). Workers can also request anything free-text under "Other."
- **Reminders:** per-request reminders (quick presets or custom time), plus a **"Remind Workers to Order"** feature — pick specific workers, pick when (now / 1h / tomorrow 9am / custom), write a message; targeted workers see it.
- **Contact fields:** every account has **phone + email** (captured, ready for real SMS/email later).

## What exists right now (files)

- `prototype/index.html` — a complete, clickable front-end prototype (single file). Shows every screen and all three roles. Demo logins on the sign-in screen: `Andy / owner2026`, `Manager / manager2026`, `Worker / worker2026`. **Do not ship these passwords.**
- `CLAUDE.md` — the build brief for Claude Code (roles, data model, screens, stack, build order).
- `README.md` — setup/deploy guide + plain-language answers on database, hosting, real-time, and cost.
- `assets/logo.png` + `assets/logo.svg` — gold lotus mark. **The official Hasuno `logo.png` never reached the session, so this was rebuilt to match. Swap in the real file (same name) when available.**
- `HANDOFF.md` — this file.

The prototype is also available on its own as `hasuno-inventory.html`, and everything is bundled as `hasuno-inventory-app.zip`.

## Prototype limitations (the reason for the real build)

1. Uses shared **browser storage**, so it's per-link and **not secure for real passwords**.
2. Only updates **while a page is open** — no real cross-device sync and no notifications to a closed/locked phone.

## Recommended real build (all free tier, one asterisk)

- **Next.js (App Router, TypeScript)** + **Supabase** (Postgres, Auth, Realtime, RLS, cron) + **Vercel** hosting + **PWA/Web Push**.
- Free covers a small restaurant. The **only paid piece is real SMS texts** (Twilio, pennies each). In-app + Web Push + email can all be free.
- **iPhone caveat:** Web Push requires each worker to "Add to Home Screen" once (iOS 16.4+).
- **"Local/free" clarification:** running locally is free but only reachable on that one machine while it's on. To use it with staff on their own phones it must be **hosted** (free for this size).

## Status: real app is built, not yet deployed

The Next.js + Supabase app described below is fully coded (screens, RLS, realtime, PWA/push, seed script) and builds clean locally. What's left is entirely account/deploy actions a human has to do — see `README.md`'s "Go live" section for the exact command sequence (Supabase project + keys, `supabase db push`, seed owner, deploy the `send-reminders` edge function + pg_cron, `vercel --prod`).

1. **Swap in the official `logo.png`** if a real one ever arrives (`assets/logo.png` **and** `public/logo.png`, same filename).
2. **Auth approach — decided**: Supabase Auth, with the UI's "name" mapped server-side to a synthetic `name@<AUTH_EMAIL_DOMAIN>` address (`lib/auth.ts`). Keeps RLS working off `auth.uid()` while login only ever shows names.
3. Decide later whether real SMS is worth leaving the free tier.

## Design system (keep consistent)

Fonts: Zen Kaku Gothic New (display/body), IBM Plex Mono (labels/data). Palette: ink `#1C2B2A`, paper `#F6F1E6`, card `#FBF8F1`, line `#D9CEB4`, accent `#B23A2E`, gold logo `#C9A24B`. Requests render as kitchen "chit"/ticket cards; restrained accent use.
