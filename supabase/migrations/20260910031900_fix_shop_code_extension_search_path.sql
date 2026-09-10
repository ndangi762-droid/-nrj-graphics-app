-- Keep the SECURITY DEFINER function's locked search_path while explicitly
-- resolving pgcrypto's gen_random_bytes() from the extensions schema.

create or replace function public.generate_shop_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  loop
    code := 'PRINTUP-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 5));
    exit when not exists (select 1 from public.shops where shop_code = code);
  end loop;
  return code;
end;
$$;

revoke execute on function public.generate_shop_code() from public, anon, authenticated;
grant execute on function public.generate_shop_code() to postgres, service_role;
