-- Hasuno Inventory Requests: schema + RLS
-- Roles enforced server-side via RLS, keyed off auth.uid(). See CLAUDE.md for the spec.

create type role as enum ('owner', 'manager', 'worker');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null unique,
  role role not null default 'worker',
  locked boolean not null default false,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  amount int not null default 1,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  amount int,
  requested_by_id uuid not null references profiles(id) on delete cascade,
  requested_by_name text not null,
  sent_at timestamptz not null default now(),
  reminder_at timestamptz,
  reminder_notified boolean not null default false,
  created_at timestamptz not null default now()
);

create table staff_reminders (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  scheduled_at timestamptz not null,
  created_by_name text not null,
  target_ids uuid[] not null default '{}',
  dismissed_by uuid[] not null default '{}',
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------

create or replace function current_role_is(target_role role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = target_role
  );
$$;

create or replace function current_is_owner_or_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('owner', 'manager')
  );
$$;

-- ---------- RLS ----------

alter table profiles enable row level security;
alter table items enable row level security;
alter table requests enable row level security;
alter table staff_reminders enable row level security;
alter table push_subscriptions enable row level security;

-- profiles: everyone signed-in can read the roster (needed for name displays, worker pickers);
-- only owner/manager can write, and only within their allowed scope (checked again in the API route).
create policy "profiles readable by signed-in users"
  on profiles for select
  using (auth.uid() is not null);

create policy "owner/manager can insert profiles"
  on profiles for insert
  with check (current_is_owner_or_manager());

create policy "owner/manager can update profiles"
  on profiles for update
  using (current_is_owner_or_manager());

create policy "owner/manager can delete non-owner profiles"
  on profiles for delete
  using (current_is_owner_or_manager() and role <> 'owner');

-- items: readable by all signed-in users, writable by owner/manager only.
create policy "items readable by signed-in users"
  on items for select
  using (auth.uid() is not null);

create policy "owner/manager manage items"
  on items for all
  using (current_is_owner_or_manager())
  with check (current_is_owner_or_manager());

-- requests: owner/manager see & delete all; workers see & delete only their own; anyone signed-in can insert their own request.
create policy "owner/manager read all requests"
  on requests for select
  using (current_is_owner_or_manager());

create policy "workers read own requests"
  on requests for select
  using (requested_by_id = auth.uid());

create policy "signed-in users insert own requests"
  on requests for insert
  with check (requested_by_id = auth.uid());

create policy "owner/manager update any request"
  on requests for update
  using (current_is_owner_or_manager());

create policy "workers update own requests"
  on requests for update
  using (requested_by_id = auth.uid());

create policy "owner/manager delete any request"
  on requests for delete
  using (current_is_owner_or_manager());

create policy "workers delete own requests"
  on requests for delete
  using (requested_by_id = auth.uid());

-- staff_reminders: owner/manager manage; workers can only read ones that target them, and update
-- (to dismiss) only the dismissed_by field on those - enforced via the API route since RLS can't
-- easily restrict which columns change, only which rows.
create policy "owner/manager manage staff reminders"
  on staff_reminders for all
  using (current_is_owner_or_manager())
  with check (current_is_owner_or_manager());

create policy "workers read reminders targeting them"
  on staff_reminders for select
  using (auth.uid() = any(target_ids));

create policy "workers dismiss reminders targeting them"
  on staff_reminders for update
  using (auth.uid() = any(target_ids));

-- push_subscriptions: users manage only their own.
create policy "users manage own push subscriptions"
  on push_subscriptions for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "owner/manager read all push subscriptions"
  on push_subscriptions for select
  using (current_is_owner_or_manager());

-- Workers can only ever touch their own dismissal via the update policy above;
-- this trigger stops them from also editing message/scheduled_at/targets in the same call.
create or replace function guard_staff_reminder_worker_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_is_owner_or_manager() then
    return new;
  end if;
  if new.message <> old.message
     or new.scheduled_at <> old.scheduled_at
     or new.created_by_name <> old.created_by_name
     or new.target_ids <> old.target_ids then
    raise exception 'workers may only dismiss reminders, not edit them';
  end if;
  return new;
end;
$$;

create trigger staff_reminders_worker_update_guard
  before update on staff_reminders
  for each row
  execute function guard_staff_reminder_worker_update();

-- Realtime: broadcast row changes for requests and staff_reminders.
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table staff_reminders;
