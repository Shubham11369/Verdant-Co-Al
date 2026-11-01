-- ============================================================================
-- VERDANT & CO. AI SUPPORT - ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261101000001_create_rls_policies.sql
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.webhook_events enable row level security;

-- 2. HELPER SECURITY DEFINER FUNCTIONS
-- Checks if current authenticated user has an active profile
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
  );
$$;

-- Checks if current authenticated user has 'admin' role
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 3. PROFILES POLICIES
-- Authenticated users can view their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Admins can view all staff profiles
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Only admins can update agent profiles / change roles
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. CUSTOMERS POLICIES
-- Authenticated staff (agents and admins) can view customer information
drop policy if exists "customers_select_staff" on public.customers;
create policy "customers_select_staff"
  on public.customers for select
  to authenticated
  using (public.is_staff());

-- Staff can insert customer records
drop policy if exists "customers_insert_staff" on public.customers;
create policy "customers_insert_staff"
  on public.customers for insert
  to authenticated
  with check (public.is_staff());

-- Anonymous/Public access is intentionally BLOCKED by RLS:
-- Customer chat operations are mediated through authenticated backend APIs using service_role.

-- 5. CONVERSATIONS POLICIES
-- Staff can view all customer conversations
drop policy if exists "conversations_select_staff" on public.conversations;
create policy "conversations_select_staff"
  on public.conversations for select
  to authenticated
  using (public.is_staff());

-- Staff can update conversation status (e.g. close/reopen)
drop policy if exists "conversations_update_staff" on public.conversations;
create policy "conversations_update_staff"
  on public.conversations for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 6. MESSAGES POLICIES
-- Staff can view all message history
drop policy if exists "messages_select_staff" on public.messages;
create policy "messages_select_staff"
  on public.messages for select
  to authenticated
  using (public.is_staff());

-- Staff can insert agent replies
drop policy if exists "messages_insert_staff" on public.messages;
create policy "messages_insert_staff"
  on public.messages for insert
  to authenticated
  with check (public.is_staff() and sender_type = 'agent');

-- 7. AI_DRAFTS POLICIES (STRICT INTERNAL ACCESS)
-- Only authenticated staff can view AI drafts.
-- Customers and unauthenticated public have NO access to this table.
drop policy if exists "ai_drafts_select_staff" on public.ai_drafts;
create policy "ai_drafts_select_staff"
  on public.ai_drafts for select
  to authenticated
  using (public.is_staff());

-- Staff can edit draft text, approve, or reject drafts
drop policy if exists "ai_drafts_update_staff" on public.ai_drafts;
create policy "ai_drafts_update_staff"
  on public.ai_drafts for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Staff can create retry drafts
drop policy if exists "ai_drafts_insert_staff" on public.ai_drafts;
create policy "ai_drafts_insert_staff"
  on public.ai_drafts for insert
  to authenticated
  with check (public.is_staff());

-- 8. WEBHOOK_EVENTS POLICIES
-- Only Admins can view audit logs of webhook events
drop policy if exists "webhook_events_select_admin" on public.webhook_events;
create policy "webhook_events_select_admin"
  on public.webhook_events for select
  to authenticated
  using (public.is_admin());

-- Backend service_role key has full bypass permissions for backend ingestion.
