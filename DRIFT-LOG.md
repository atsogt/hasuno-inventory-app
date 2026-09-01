# Drift log

Disagreements found between the docs (`CLAUDE.md` → `ARCHITECTURE.md` → `README.md` /
`HANDOFF.md`) and the code, logged rather than reconciled silently. Precedence when they
conflict: **code > `ARCHITECTURE.md` > diagrams > `CLAUDE.md`**.

---

## Audit: 2026-08-14, against `d544cb6`

Scope: every checkable claim in `ARCHITECTURE.md` traced to a file. Verification:
`npx tsc --noEmit` → exit 0.

**Docs were accurate but uncommitted.** At audit time `ARCHITECTURE.md`, `README.md`, and
`HANDOFF.md` had uncommitted edits (mtime 12:41 local, 11 min after `d544cb6`) that
correctly described the qty stepper, `RequestsHeader`, `ReminderHistoryButton`, and
migration 0005. The *committed* versions at `HEAD` described none of it —
`git show HEAD:ARCHITECTURE.md | grep -c RequestsHeader` → `0`. Anyone cloning the repo
got a map of the previous app. **Action: commit the doc updates alongside the code they
describe, not after.**

Verified accurate and unchanged: the Server Action inventory, `requireRole` guards,
`nameToEmail`, the RLS policy names quoted in the request lifecycle, the
`guard_staff_reminder_worker_update` trigger, `PENDING_SEND_MS = 3000`, the unmount-flush
effect, `ElapsedBadge`'s 30s interval, `Modal`'s `createPortal(..., document.body)`,
`Topbar` as the lone Server Component, `.aurora` / `.content-scrim` mount points, and the
absence of the deleted `GlassBackdrop.tsx` / `GroupedRequestList.tsx`.

---

### D-1 · `/request` was not subscribed to `requests` — silent lost request · **FIXED**

- **Doc said:** lifecycle step 6 — "Every open `/requests`, `/my-requests`, and `/request`
  tab has a `<RealtimeRefresh>`".
- **Code said:** `app/(app)/request/page.tsx` →
  `<RealtimeRefresh tables={["staff_reminders", "items"]} />`. No `requests`.
- **Why it mattered:** that page fetches `myOpenRequests` and hands it to the stepper,
  which targets an existing row **by id**. Nothing invalidated it cross-device.
- **Compounding cause:** a PostgREST `.update().eq("id", id)` that matches **zero rows**
  returns no error. `firePending()` in `RequestScreen.tsx` therefore ran
  `if (result?.error) … else toast("Updated your request for X")` — a success toast for a
  write that never happened.
- **Failure trace:** manager taps "clear all" on `/requests` → worker's open `/request` tab
  never refreshes → worker taps an item whose row is gone → `requestAgain(staleId)` matches
  0 rows → `{ok: true}` → phone says *"Updated your request for Salmon"* → the request
  reaches nobody. Exactly the failure the app exists to prevent, invisible on both ends.
- **Fix:** added `"requests"` to that subscription; added `.select("id")` + a `NO_ROW`
  row-count check to `requestAgain`, `editRequest`, `deleteRequest`, `setRequestReminder`,
  `clearRequestReminder` in `app/actions/requests.ts`.
- **Residual:** the unmount-flush effect in `RequestScreen.tsx` still fires these actions
  without awaiting or inspecting the result, so a flush-on-tab-switch that fails is still
  silent. Bounded (the row check now at least prevents a *false success* toast, because no
  toast is shown on that path at all) but worth revisiting.

### D-2 · `reminder_history` fails silently, not loudly · **OPEN — needs `db push`**

- **Docs said** (all three): Reminder History "will error" until 0005 is applied.
- **Code says:** `remind/page.tsx` does `(reminderHistory || [])`, so a failed query renders
  an **empty history panel** that looks legitimately empty. `scheduleStaffReminder()`'s
  history insert is deliberately unchecked ("best-effort"), so it **fails silently**. Only
  `clearReminderHistory()` surfaces an error.
- **Consequence:** every reminder sent between now and the migration push is permanently
  absent from the audit log — there is no row to backfill from. The "best-effort" call is
  right in principle; combined with an unapplied migration it converts a loud failure into
  quiet data loss.
- **Action:** `npx supabase db push`. Doc wording corrected in the meantime.

### D-3 · RLS did not enforce the manager-scope rule · **FIXED IN 0006 — needs `db push`**

- **Doc said:** "RLS enforces the same rules a second time at the database layer, so even a
  bug in an action can't leak data."
- **Code said:** `canManage()` (manager manages workers only) lives in
  `lib/auth-client.ts` and is checked in `toggleLock` / `deleteAccount` / `addAccount`.
  In `0001_init.sql` the DELETE policy scoped itself (`and role <> 'owner'`) but:
  ```sql
  create policy "owner/manager can update profiles"
    on profiles for update
    using (current_is_owner_or_manager());   -- no target-role restriction, no WITH CHECK
  ```
- **Consequence:** at the DB layer a manager could update **any** profile row including
  their own `role` → self-promotion to owner, via one PostgREST call, bypassing
  `app/actions/accounts.ts` entirely. The anon key is public (it ships in the browser
  bundle) and a manager holds a valid session, so the Server Action was the *only* gate.
  Requires an insider manager — but it is precisely the boundary the doc claimed was
  covered twice and was covered once.
- **Fix:** `supabase/migrations/0006_scope_profile_writes.sql` replaces the INSERT/UPDATE/
  DELETE policies with role-scoped ones mirroring `canManage()`. `addAccount` /
  `deleteAccount` use the service-role client and are unaffected by design.

### D-4 · "Every Server Action re-checks permission" is true for role, not ownership · **DOC CORRECTED**

- **Docs said:** `ARCHITECTURE.md` §Security item 1, and README's `GHSA-955p-x3mx-jcvp`
  mitigation note ("knowing an action's ID doesn't grant access").
- **Code says:** `editRequest`, `deleteRequest`, `setRequestReminder`,
  `clearRequestReminder` accept a caller-supplied `id` and call only `requireProfile()` —
  signed-in, no ownership check. RLS is the sole gate.
- **Status:** RLS does hold (the `workers …own requests` policies work; an omitted
  `WITH CHECK` on UPDATE defaults to the `USING` clause, so `requested_by_id` can't be
  reassigned). Defensible design — but it is one layer where the docs describe two, and the
  README's CVE mitigation is load-bearing on RLS without saying so. Wording fixed in both.

### D-5 · Smaller stale claims in `ARCHITECTURE.md` · **FIXED**

| Claim | Reality |
|---|---|
| globals.css defines "`.starfield` background and `.sparkle` logo accents" | Neither survives the Glass redesign. (`.chit` / `.panel-card` / `.btn*` / `.field-*` do exist, inside `@layer`.) |
| `lib/types.ts` "mirrors the DB schema exactly" | Omits `ReminderHistoryEntry` (which exists); `StaffReminder` has no `pushed_at` though the table does and the Edge Function writes it |
| One env row for `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Two differently-named vars in two systems: the browser reads `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Vercel), the Edge Function reads **unprefixed** `VAPID_PUBLIC_KEY` (Supabase secret, README step 5). Would silently break a fresh environment. |
| 0005 row | Doesn't mention it also adds `reminder_history` to the `supabase_realtime` publication — which matters, `remind/page.tsx` subscribes to it |
| `.env.local.example`: `CRON_SECRET` "sent to `/api/push/send-reminders`" | No such route. pg_cron POSTs the Supabase Edge Function. `ARCHITECTURE.md` had this right; the example file was wrong. |

---

## Open actions

1. **`npx supabase db push`** — 0005 (silent data loss, running now) and 0006 (privilege
   scope). Neither is applied to the live DB.
2. **Commit the doc updates** with the code they describe.
3. Delete the `_to_delete/` folder (a stale `.git/index.lock` parked there; the device
   bridge can't unlink files directly).
4. Pre-existing, unchanged: no in-app password reset; placeholder `logo.png`; the
   "Good Job SOfia Item" test row in the live catalog; no real SMS.
