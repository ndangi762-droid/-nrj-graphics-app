# PRINTUP Public SaaS — Phase 1

## Goal
Add public account/shop tenancy without replacing existing billing, calculation, PDF, or UI functionality.

## Existing foundation
- FastAPI backend and existing session authentication remain intact.
- Existing Supabase tables: customers, jobs, job_items, payments, services.
- Existing tables retain their data.

## Tenant model
- profiles: one application profile per Supabase Auth user.
- shops: business identity and unique PRINTUP-XXXXX shop code.
- shop_members: user-to-shop membership and role (owner/admin/staff).
- Existing business records receive shop_id ownership.
- RLS is enabled and tenant policies require authenticated membership.

## Phase 1 sequence
1. Public signup UI/API.
2. Mobile OTP verification through Supabase Auth.
3. Create profile and first shop after verification.
4. Establish owner membership.
5. Create authenticated app session.
6. Preserve existing passkey/WebAuthn compatibility.
7. Add login/logout/session recovery paths.
8. Test tenant isolation with two test users/shops.
9. Only after tests pass, deploy the auth changes.

## Safety rules
- Do not remove existing billing/calculation code.
- Do not migrate existing records until an explicit owner/shop mapping exists.
- Never expose Supabase service-role keys in frontend code.
- RLS, not frontend filtering, is the security boundary.
- Existing single-owner deployment remains available until public authentication is proven.
