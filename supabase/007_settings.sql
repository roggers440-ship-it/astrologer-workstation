-- Account settings.

-- Appearance follows the account rather than the device, so a practitioner who
-- signs in on a second machine does not have to set it again.
alter table profiles add column if not exists theme text
  check (theme in ('dark', 'light')) default 'dark';

-- The last payment, so an upgrade can credit the unused part of it. Without
-- these the proration has nothing to work from.
alter table profiles add column if not exists last_paid_amount numeric(10, 2);
alter table profiles add column if not exists last_paid_months smallint;

-- A user may edit their own display name and theme, and nothing else. Tier and
-- role stay writable only by the service role, so nobody can promote themselves.
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
