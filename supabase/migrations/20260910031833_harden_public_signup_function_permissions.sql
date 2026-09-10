-- PRINTUP Public SaaS Phase 1
-- Security hardening for shop-code generation.
-- The function is only needed internally by shop provisioning and must not be
-- callable directly through the Supabase Data API.

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
    code := 'PRINTUP-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 5));
    exit when not exists (select 1 from public.shops where shop_code = code);
  end loop;
  return code;
end;
$$;

revoke execute on function public.generate_shop_code() from public, anon, authenticated;
grant execute on function public.generate_shop_code() to postgres, service_role;
