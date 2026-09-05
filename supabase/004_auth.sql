-- Real authentication. Run after the earlier migrations.

-- 1. A practitioner row appears automatically when an account is created.
--    Previously this had to be inserted by hand, which is why the development
--    defaults below existed at all.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into practitioners (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Backfill anyone who already has an account.
insert into practitioners (id, display_name)
select id, coalesce(email, 'Practitioner') from auth.users
on conflict (id) do nothing;

-- 3. Remove the hardcoded practitioner id.
--    Every row was being filed under one account because the API bypassed
--    security entirely. Ownership now comes from the session.
alter table clients            alter column practitioner_id set default auth.uid();
alter table consultation_notes alter column practitioner_id set default auth.uid();

-- 4. Existing rows keep whichever practitioner they were filed under. If they
--    were created with the development default and that is not your account,
--    reassign them once:
--
--    update clients set practitioner_id = '<your-auth-uid>';
--    update consultation_notes set practitioner_id = '<your-auth-uid>';
