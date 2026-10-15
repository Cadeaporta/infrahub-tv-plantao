-- Use explicit domain comparisons (no regex escaping ambiguity) and prevent direct RPC execution of a trigger-only function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(new.email, '')));
begin
  if pg_catalog.array_length(pg_catalog.string_to_array(normalized_email, '@'), 1) <> 2
     or pg_catalog.split_part(normalized_email, '@', 2) not in (
       'bragait.com',
       'hospitalcare.com.br',
       'hospitalveracruz.com.br'
     ) then
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
revoke all on function public.sync_maquinas_tv_status() from public, anon, authenticated;
