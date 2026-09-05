-- eSewa payments.
--
-- Every attempt is recorded before the customer leaves for the gateway, so the
-- callback has something to verify against. Without a pending row first, a
-- forged callback has nothing to contradict it.

create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- The id sent to eSewa and returned in the receipt.
  transaction_id text not null unique,
  tier          user_tier not null,
  amount        numeric(10, 2) not null,
  months        smallint not null,
  -- pending -> paid, or pending -> failed
  status        text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  esewa_ref     text,
  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);

create index if not exists payments_user_idx on payments (user_id, created_at desc);

alter table payments enable row level security;

-- A customer reads their own payment history and writes none of it. Rows are
-- created and settled by the server using the service role, because a client
-- that could write here could mark its own payment as paid.
create policy "read own payments" on payments
  for select using (user_id = auth.uid() or is_admin());
