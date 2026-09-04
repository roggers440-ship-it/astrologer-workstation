-- Astrologer Diagnostic Workstation - Supabase schema
-- Client birth data and session notes are sensitive personal records. Row level
-- security is on by default and every policy is scoped to the owning practitioner.

create extension if not exists "pgcrypto";

create table if not exists practitioners (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at  timestamptz not null default now()
);

create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null default auth.uid() references practitioners (id) on delete cascade,
  full_name     text not null,
  dob           date not null,
  birth_time    time not null,
  birth_place   text,
  latitude      double precision not null,
  longitude     double precision not null,
  -- IANA zone name, e.g. 'Asia/Kathmandu'. Stored rather than an offset so that
  -- historical DST rules resolve correctly for older birth dates.
  timezone      text not null,
  -- Set when the birth time is uncertain; the UI should flag readings accordingly.
  time_confidence text check (time_confidence in ('exact', 'approximate', 'unknown')) default 'exact',
  -- Phone or email. Captured from the client table, not from the intake form.
  contact       text,
  created_at    timestamptz not null default now()
);

create table if not exists consultation_notes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients (id) on delete cascade,
  practitioner_id uuid not null default auth.uid() references practitioners (id) on delete cascade,
  session_date  timestamptz not null default now(),
  topic_ids     smallint[] not null default '{}',
  summary       text not null,
  -- What the client confirmed or corrected. The calibration record.
  client_confirmed text,
  follow_up_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists follow_ups (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references consultation_notes (id) on delete cascade,
  due_at      timestamptz not null,
  completed_at timestamptz,
  reminder    text not null
);

create index if not exists clients_practitioner_idx on clients (practitioner_id, created_at desc);
create index if not exists notes_client_idx on consultation_notes (client_id, session_date desc);
create index if not exists follow_ups_due_idx on follow_ups (due_at) where completed_at is null;

alter table practitioners       enable row level security;
alter table clients             enable row level security;
alter table consultation_notes  enable row level security;
alter table follow_ups          enable row level security;

create policy "own profile" on practitioners
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own clients" on clients
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

create policy "own notes" on consultation_notes
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

create policy "own follow ups" on follow_ups
  for all using (
    exists (
      select 1 from consultation_notes n
      where n.id = follow_ups.note_id and n.practitioner_id = auth.uid()
    )
  );
