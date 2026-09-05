-- Small corrections.

-- 1. display_name defaulted to the email address, so the Name field on the
--    account page arrived pre-filled with an email. Better empty than wrong.
create or replace function handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into practitioners (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Clear the ones already filled in with an address.
update profiles set display_name = null where display_name = email;

-- 2. Sweep abandoned payments. A pending row older than a day was never going to
--    settle - eSewa released the transaction long ago - and leaving it pending
--    makes the payment history unreadable.
update payments
set status = 'failed'
where status = 'pending'
  and created_at < now() - interval '1 day';
