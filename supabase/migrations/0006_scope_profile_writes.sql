-- Scope profile writes at the DB layer to match canManage() in lib/auth-client.ts.
--
-- 0001_init.sql granted any owner/manager UPDATE and INSERT on any profiles row with no
-- restriction on the target's role. The DELETE policy remembered to exclude owners
-- ("role <> 'owner'"); UPDATE and INSERT did not. Consequence: a signed-in manager could
-- PATCH any profiles row directly through PostgREST -- including setting their own
-- role to 'owner' -- bypassing app/actions/accounts.ts entirely. The anon key is public
-- (it ships in the browser bundle), so the Server Action was the only thing enforcing
-- "managers manage workers only". This restores the second layer.
--
-- Note: addAccount() and deleteAccount() go through createAdminClient() (service role) and
-- so bypass RLS by design -- their scope check stays in the Server Action. These policies
-- govern the session-scoped client, which is what an attacker would actually reach.

drop policy if exists "owner/manager can update profiles" on profiles;
drop policy if exists "owner/manager can insert profiles" on profiles;
drop policy if exists "owner/manager can delete non-owner profiles" on profiles;

-- USING = which existing rows you may touch. WITH CHECK = what the row may become.
-- Owner: any non-owner row, and may set any role on it (including promoting to owner).
-- Manager: worker rows only, and may not change them out of 'worker'.

create policy "owner/manager update profiles in scope"
  on profiles for update
  using (
    (current_role_is('owner') and role <> 'owner')
    or (current_role_is('manager') and role = 'worker')
  )
  with check (
    current_role_is('owner')
    or (current_role_is('manager') and role = 'worker')
  );

create policy "owner/manager insert profiles in scope"
  on profiles for insert
  with check (
    current_role_is('owner')
    or (current_role_is('manager') and role = 'worker')
  );

create policy "owner/manager delete profiles in scope"
  on profiles for delete
  using (
    (current_role_is('owner') and role <> 'owner')
    or (current_role_is('manager') and role = 'worker')
  );
