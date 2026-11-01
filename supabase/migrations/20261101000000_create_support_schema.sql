-- ============================================================================
-- VERDANT & CO. AI SUPPORT - CORE SCHEMA MIGRATION
-- Migration: 20261101000000_create_support_schema.sql
-- ============================================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE (Agents and Admins)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz not null default timezone('utc', now())
);

-- 2. CUSTOMERS TABLE
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  external_customer_id text unique,
  name text not null,
  phone text,
  created_at timestamptz not null default timezone('utc', now())
);

-- 3. CONVERSATIONS TABLE
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Constraint: Each customer has at most ONE open conversation
create unique index if not exists unique_open_conversation_per_customer
  on public.conversations (customer_id)
  where status = 'open';

-- 4. MESSAGES TABLE
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  external_message_id text unique,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'agent')),
  message_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- 5. AI_DRAFTS TABLE
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

-- 6. WEBHOOK_EVENTS TABLE
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'duplicate', 'failed')),
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE & LOOKUPS
-- ============================================================================

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

-- ============================================================================
-- TRIGGERS & AUTOMATION
-- ============================================================================

-- Function to automatically bump updated_at timestamp
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

-- Auto-create profile when a user signs up via Supabase Auth
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
  set full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_created();
