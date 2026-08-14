-- Reminder History: append-only audit log of every staff reminder ever scheduled.
-- Deliberately a separate table from staff_reminders (not a soft-delete flag on it) so
-- clearing the history log can never affect a reminder that's still actually scheduled/live.
-- current_is_owner_or_manager() is defined in 0001_init.sql.

create table reminder_history (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  scheduled_at timestamptz not null,
  created_by_name text not null,
  target_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table reminder_history enable row level security;

create policy "owner/manager manage reminder history"
  on reminder_history for all
  using (current_is_owner_or_manager())
  with check (current_is_owner_or_manager());

alter publication supabase_realtime add table reminder_history;
