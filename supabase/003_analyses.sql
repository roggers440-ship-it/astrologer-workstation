-- Cached written analyses. One row per client, mode and scope.
create table if not exists chart_analyses (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients (id) on delete cascade,
  -- 'overview' | 'house' | 'topic'
  mode        text not null,
  -- house number or topic id; 0 for whole-chart overview
  scope       smallint not null default 0,
  -- hash of the computed facts, so a corrected birth time invalidates the row
  fact_hash   text not null,
  content     text not null,
  model       text not null,
  created_at  timestamptz not null default now(),
  unique (client_id, mode, scope)
);

create index if not exists analyses_lookup on chart_analyses (client_id, mode, scope);

alter table chart_analyses enable row level security;

create policy "own analyses" on chart_analyses
  for all using (
    exists (
      select 1 from clients c
      where c.id = chart_analyses.client_id and c.practitioner_id = auth.uid()
    )
  );
