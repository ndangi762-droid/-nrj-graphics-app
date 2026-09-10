-- PRINTUP Phase 1: the tenant membership helper is only needed by authenticated RLS checks.
-- Anonymous clients must not be able to invoke this SECURITY DEFINER function directly.
revoke execute on function public.is_shop_member(uuid) from public;
grant execute on function public.is_shop_member(uuid) to authenticated, service_role;
