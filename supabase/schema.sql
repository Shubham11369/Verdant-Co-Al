-- ============================================================================
-- VERDANT & CO. AI SUPPORT - COMPLETE CONSOLIDATED SQL SCRIPT
-- Run this in the Supabase Dashboard: SQL Editor > New query > Paste > Run
-- ============================================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- 1. DROP EXISTING CONSTRAINTS / TABLES IF RESETTING (CLEAN SLATE SAFE)
-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  external_customer_id text unique,
  name text not null,
  phone text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists unique_open_conversation_per_customer
  on public.conversations (customer_id)
  where status = 'open';

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  external_message_id text unique,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'agent')),
  message_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  draft_text text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'failed')),
  error_message text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'duplicate', 'failed')),
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

-- 2. INDEXES
create index if not exists idx_customers_external_id on public.customers (external_customer_id);
create index if not exists idx_customers_phone on public.customers (phone);

create index if not exists idx_conversations_customer_id on public.conversations (customer_id);
create index if not exists idx_conversations_status on public.conversations (status);
create index if not exists idx_conversations_updated_at on public.conversations (updated_at desc);

create index if not exists idx_messages_conversation_created on public.messages (conversation_id, created_at asc);
create index if not exists idx_messages_sender_type on public.messages (sender_type);
create index if not exists idx_messages_external_id on public.messages (external_message_id);

create index if not exists idx_ai_drafts_message_id on public.ai_drafts (message_id);
create index if not exists idx_ai_drafts_status on public.ai_drafts (status);
create index if not exists idx_ai_drafts_created_at on public.ai_drafts (created_at desc);

create index if not exists idx_webhook_events_event_id on public.webhook_events (event_id);

-- 3. TRIGGERS
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row
  execute function public.touch_updated_at();

drop trigger if exists trg_ai_drafts_updated_at on public.ai_drafts;
create trigger trg_ai_drafts_updated_at
  before update on public.ai_drafts
  for each row
  execute function public.touch_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'agent')
  )
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_created();

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.webhook_events enable row level security;

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

-- Profiles Policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Customers Policies
drop policy if exists "customers_select_staff" on public.customers;
create policy "customers_select_staff"
  on public.customers for select
  to authenticated
  using (public.is_staff());

drop policy if exists "customers_insert_staff" on public.customers;
create policy "customers_insert_staff"
  on public.customers for insert
  to authenticated
  with check (public.is_staff());

-- Conversations Policies
drop policy if exists "conversations_select_staff" on public.conversations;
create policy "conversations_select_staff"
  on public.conversations for select
  to authenticated
  using (public.is_staff());

drop policy if exists "conversations_update_staff" on public.conversations;
create policy "conversations_update_staff"
  on public.conversations for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Messages Policies
drop policy if exists "messages_select_staff" on public.messages;
create policy "messages_select_staff"
  on public.messages for select
  to authenticated
  using (public.is_staff());

drop policy if exists "messages_insert_staff" on public.messages;
create policy "messages_insert_staff"
  on public.messages for insert
  to authenticated
  with check (public.is_staff() and sender_type = 'agent');

-- AI Drafts Policies (strictly internal)
drop policy if exists "ai_drafts_select_staff" on public.ai_drafts;
create policy "ai_drafts_select_staff"
  on public.ai_drafts for select
  to authenticated
  using (public.is_staff());

drop policy if exists "ai_drafts_update_staff" on public.ai_drafts;
create policy "ai_drafts_update_staff"
  on public.ai_drafts for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "ai_drafts_insert_staff" on public.ai_drafts;
create policy "ai_drafts_insert_staff"
  on public.ai_drafts for insert
  to authenticated
  with check (public.is_staff());

-- Webhook Events Policies (admin only)
drop policy if exists "webhook_events_select_admin" on public.webhook_events;
create policy "webhook_events_select_admin"
  on public.webhook_events for select
  to authenticated
  using (public.is_admin());

-- 5. SEED DEMO CUSTOMERS & ASSESSMENT SCENARIOS
insert into public.customers (id, external_customer_id, name, phone, created_at)
values
  ('10000000-0000-0000-0000-000000000001', 'cust_1042', 'Aisha Khan', '+919800000001', timezone('utc', now() - interval '2 days')),
  ('10000000-0000-0000-0000-000000000002', 'cust_1043', 'Rohit Sharma', '+919800000002', timezone('utc', now() - interval '1 day')),
  ('10000000-0000-0000-0000-000000000003', 'cust_1044', 'Priya Nair', '+919800000003', timezone('utc', now() - interval '12 hours')),
  ('10000000-0000-0000-0000-000000000004', 'cust_1045', 'Vikram Patel', '+919800000004', timezone('utc', now() - interval '6 hours')),
  ('10000000-0000-0000-0000-000000000005', 'cust_1046', 'Dr. Sneha Rao', '+919800000005', timezone('utc', now() - interval '2 hours'))
on conflict (external_customer_id) do update
set name = excluded.name, phone = excluded.phone;

insert into public.conversations (id, customer_id, status, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'open', timezone('utc', now() - interval '2 days'), timezone('utc', now() - interval '10 minutes')),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'open', timezone('utc', now() - interval '1 day'), timezone('utc', now() - interval '20 minutes')),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'open', timezone('utc', now() - interval '12 hours'), timezone('utc', now() - interval '30 minutes')),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'open', timezone('utc', now() - interval '6 hours'), timezone('utc', now() - interval '45 minutes')),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'open', timezone('utc', now() - interval '2 hours'), timezone('utc', now() - interval '5 minutes'))
on conflict (id) do nothing;

insert into public.messages (id, external_message_id, conversation_id, sender_type, message_text, created_at)
values
  ('30000000-0000-0000-0000-000000000001', 'msg_88213', '20000000-0000-0000-0000-000000000001', 'customer', 'Hi, my order #4471 hasn''t arrived yet. Can I change the delivery address?', timezone('utc', now() - interval '10 minutes')),
  ('30000000-0000-0000-0000-000000000002', 'msg_88214', '20000000-0000-0000-0000-000000000002', 'customer', 'What is your return policy?', timezone('utc', now() - interval '20 minutes')),
  ('30000000-0000-0000-0000-000000000003', 'msg_88215', '20000000-0000-0000-0000-000000000003', 'customer', 'Do you deliver to Dubai?', timezone('utc', now() - interval '30 minutes')),
  ('30000000-0000-0000-0000-000000000004', 'msg_88216', '20000000-0000-0000-0000-000000000004', 'customer', 'Is cash on delivery available for a ₹3,500 order?', timezone('utc', now() - interval '45 minutes')),
  ('30000000-0000-0000-0000-000000000005', 'msg_88217', '20000000-0000-0000-0000-000000000005', 'customer', 'I think I''m allergic to the serum I bought. What should I do?', timezone('utc', now() - interval '5 minutes'))
on conflict (id) do nothing;

insert into public.ai_drafts (id, message_id, draft_text, status, created_at, updated_at)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Hello Aisha! Thank you for reaching out to Verdant & Co. Delivery typically takes 3–5 business days in metro cities and 5–8 business days elsewhere in India once shipped. Regarding your delivery address: we can update your address only if your order #4471 has not yet shipped and you placed the order within the last 12 hours. Let me check the shipping status for you right away!',
    'pending',
    timezone('utc', now() - interval '10 minutes'),
    timezone('utc', now() - interval '10 minutes')
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'Hi Rohit! We accept returns within 7 days of delivery for products that are unopened and unused. If a product arrived damaged or if you received the wrong item, we gladly accept returns on opened items as well. Approved refunds are credited to the original payment method within 5–7 business days after we receive the return.',
    'pending',
    timezone('utc', now() - interval '20 minutes'),
    timezone('utc', now() - interval '20 minutes')
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    'Hi Priya! Currently our standard shipping covers India (3–5 business days in metro cities and 5–8 business days elsewhere). Regarding deliveries to Dubai, I have escalated your inquiry to our senior support team so they can review international shipping availability and assist you directly.',
    'pending',
    timezone('utc', now() - interval '30 minutes'),
    timezone('utc', now() - interval '30 minutes')
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000004',
    'Hello Vikram! Cash on Delivery is available for orders under ₹3,000 with a ₹50 fee. Because your order is ₹3,500, Cash on Delivery is unfortunately not eligible. You can choose from our secure prepaid payment options such as UPI, debit/credit cards, or net banking.',
    'pending',
    timezone('utc', now() - interval '45 minutes'),
    timezone('utc', now() - interval '45 minutes')
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000005',
    'Hello Dr. Sneha, we are so sorry to hear this. Please discontinue using the serum immediately and gently rinse your skin with cool water. While all Verdant & Co. products are 100% vegan and fragrance-free, we cannot provide medical advice. If your symptoms persist, please consult a healthcare professional. I have also flagged this directly for our senior support team to assist with return and refund options.',
    'pending',
    timezone('utc', now() - interval '5 minutes'),
    timezone('utc', now() - interval '5 minutes')
  )
on conflict (id) do nothing;

insert into public.webhook_events (id, event_id, processing_status, error_message, received_at, processed_at)
values
  ('50000000-0000-0000-0000-000000000001', 'evt_7f3a91c2', 'processed', null, timezone('utc', now() - interval '10 minutes'), timezone('utc', now() - interval '10 minutes'))
on conflict (event_id) do nothing;
