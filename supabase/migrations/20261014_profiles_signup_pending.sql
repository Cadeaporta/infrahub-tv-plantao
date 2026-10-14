-- New self-registered accounts must be explicitly approved by an administrator.
-- Existing profiles are preserved and are not modified by this trigger.
create or replace function public.handle_new_infra_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, ativo)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'tecnico',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_infra_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_infra_profile on auth.users;
create trigger on_auth_user_created_infra_profile
  after insert on auth.users
  for each row execute function public.handle_new_infra_user();
