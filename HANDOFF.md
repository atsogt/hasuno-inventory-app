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

## Status: live and in active use

The app is deployed at **hasuno-inventory-app.vercel.app**, seeded with a real owner account, and has been through several rounds of feature work beyond the original spec. For "what's actually here right now," read `ARCHITECTURE.md` — it's kept in sync with the codebase and is more reliable than this file for implementation detail. This file stays as the origin story / big-picture context.

What's shipped beyond the original build brief:
- **Item catalog categorization** — `items` gained `station` (Sushi/Kitchen) and `category`, seeded with the full 89-item Hasuno v4 menu list. The Request screen groups by station/category with search and station filters.
- **Accounts split into three tabs** — Remind, Manage Accounts, Add Account are now separate routes under a sub-nav, instead of one long page.
- **Duplicate-request handling** — re-requesting an item you've already asked for opens an update dialog (change quantity, mark **urgent**) instead of creating a second row.
- **Dark mode** — full palette via CSS variables, toggle in the header, defaults to system preference.
- **Background photos** — dark mode shows a moss/rock photo, light mode a sky/clouds photo, both full-bleed behind a `.content-scrim` glass layer that fades to the photo at its edges. Content on top of the scrim (chits, fields, buttons) never fades — only the backdrop tint/blur does.
- **Requests screen grouped by requestor** — collapsible per-person sections (most recently active first) plus a Collapse all/Expand all toggle, instead of one flat newest-first list.
- **A few real bugs caught along the way**: a critical Next.js CVE (patched via version bump), a hardcoded secret that almost got committed, a git repo that turned out to be rooted at the whole home directory instead of just this project, several paddings silently doing nothing because they used spacing classes (`p-5.5`, `pt-4.5`) that don't exist in Tailwind's default scale, a `body` background silently painting over the fixed `.aurora` backdrop so it (and later the background photos) never actually rendered, and a modal-trapped-in-`backdrop-filter` bug that recurred twice — a scrapped grouped Requests variant, then the new `.content-scrim` wrapper — fixed for good by rendering `Modal` through a React portal to `document.body` instead of relying on where it happens to sit in the DOM.

Open items:
1. **Swap in the official `logo.png`** if a real one ever arrives (`assets/logo.png` **and** `public/logo.png`, same filename).
2. No in-app password reset yet — only via the Supabase dashboard.
3. A leftover test item ("Good Job SOfia Item") is sitting in the live catalog from early testing.
4. Decide later whether real SMS is worth leaving the free tier.

## Design system (keep consistent)

Fonts: Zen Kaku Gothic New (display/body), IBM Plex Mono (labels/data). The original ink/paper/red-accent palette from the prototype was superseded by the "Hasuno Glass" theme: a frosted-glass system (blurred, translucent panels over a full-bleed background photo — moss/rock in dark mode, sky/clouds in light) with a teal identity accent (`#37c8a0`) and a dedicated red `--urgent` token reserved exclusively for urgent requests and destructive actions — never used for brand/identity. Requests still render as "chit" ticket cards. Page content sits on a `.content-scrim` layer whose tint/blur fades softly into the photo at all four edges; the chits/fields/buttons on top of it never fade, only the backdrop does. See `ARCHITECTURE.md`'s "Background photos & `.content-scrim`" section for the implementation.
