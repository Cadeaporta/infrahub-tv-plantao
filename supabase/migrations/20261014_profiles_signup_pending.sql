-- Enforce corporate email domains and require manual approval for every new self-registered account.
-- Existing profiles, including the current administrator, are not modified.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(new.email, '')));
begin
  if normalized_email !~ '^[^@]+@(bragait\.com|hospitalcare\.com\.br|hospitalveracruz\.com\.br)$' then
    raise exception 'Cadastro permitido apenas para e-mails corporativos autorizados';
  end if;

  insert into public.profiles (id, full_name, role, ativo)
  values (
    new.id,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'tecnico',
    false
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
