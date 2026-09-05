-- Subscription tiers and roles.
--
-- Entitlement lives in the database and is enforced by row level security and by
-- server routes. Nothing about a user's plan is ever decided in the browser: the
-- browser is told what it may show, but the server decides what it sends.

create type user_tier as enum ('free', 'basic', 'pro', 'max');
create type user_role as enum ('user', 'admin');

create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  display_name text,
  tier        user_tier not null default 'free',
  role        user_role not null default 'user',

  -- Stripe. Null until a subscription exists.
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- When the paid period ends. Past this, the tier is treated as free by the
  -- server regardless of what the column says, so a failed webhook cannot leave
  -- someone on a paid plan indefinitely.
  current_period_end     timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A profile appears automatically with the account.
create or replace function handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;

  insert into practitioners (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function handle_new_profile();

insert into profiles (id, email, display_name)
select id, email, coalesce(email, 'User') from auth.users
on conflict (id) do nothing;

/* ------------------------------- helpers -------------------------------- */

-- Used inside policies. security definer so a user can be checked against a
-- table they cannot themselves read.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

/* -------------------------------- policies ------------------------------- */

alter table profiles enable row level security;

-- A user reads their own profile and never writes it. Tier changes come from the
-- Stripe webhook using the service role, so nobody can promote themselves.
create policy "read own profile" on profiles
  for select using (id = auth.uid() or is_admin());

-- Admins see every client and note; everyone else sees only their own.
drop policy if exists "own clients" on clients;
create policy "own clients" on clients
  for all
  using (practitioner_id = auth.uid() or is_admin())
  with check (practitioner_id = auth.uid() or is_admin());

drop policy if exists "own notes" on consultation_notes;
create policy "own notes" on consultation_notes
  for all
  using (practitioner_id = auth.uid() or is_admin())
  with check (practitioner_id = auth.uid() or is_admin());

drop policy if exists "own analyses" on chart_analyses;
create policy "own analyses" on chart_analyses
  for all using (
    exists (
      select 1 from clients c
      where c.id = chart_analyses.client_id
        and (c.practitioner_id = auth.uid() or is_admin())
    )
  );

/* --------------------------- make yourself admin -------------------------- */
-- Run once, with your own address:
--
--   update profiles set role = 'admin', tier = 'max'
--   where email = 'you@example.com';
