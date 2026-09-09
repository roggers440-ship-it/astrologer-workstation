-- Manual payments.
--
-- Cash, bank transfer and comped accounts go into the same ledger as eSewa
-- rather than a table of their own. One ledger means the customer sees the
-- payment in their own history, proration credits it on a later upgrade, and
-- there is a single place to answer "what has this person paid".

alter table payments add column if not exists method text
  not null default 'esewa'
  check (method in ('esewa', 'cash', 'bank', 'comp'));

-- Who recorded a manual payment. Null for anything taken through the gateway.
alter table payments add column if not exists recorded_by uuid references auth.users (id);
alter table payments add column if not exists note text;

-- A manual entry has no gateway transaction, so the id is generated locally and
-- the uniqueness constraint still holds.
comment on column payments.method is
  'esewa for gateway payments; cash, bank or comp for entries recorded by an admin.';

create index if not exists payments_method_idx on payments (method, created_at desc);
