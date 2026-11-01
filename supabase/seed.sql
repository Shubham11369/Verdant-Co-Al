-- ============================================================================
-- VERDANT & CO. AI SUPPORT - SEED DATA FOR DEMO & ASSESSMENT SCENARIOS
-- File: supabase/seed.sql
-- ============================================================================

-- 1. SEED DEMO CUSTOMERS
insert into public.customers (id, external_customer_id, name, phone, created_at)
values
  ('10000000-0000-0000-0000-000000000001', 'cust_1042', 'Aisha Khan', '+919800000001', timezone('utc', now() - interval '2 days')),
  ('10000000-0000-0000-0000-000000000002', 'cust_1043', 'Rohit Sharma', '+919800000002', timezone('utc', now() - interval '1 day')),
  ('10000000-0000-0000-0000-000000000003', 'cust_1044', 'Priya Nair', '+919800000003', timezone('utc', now() - interval '12 hours')),
  ('10000000-0000-0000-0000-000000000004', 'cust_1045', 'Vikram Patel', '+919800000004', timezone('utc', now() - interval '6 hours')),
  ('10000000-0000-0000-0000-000000000005', 'cust_1046', 'Dr. Sneha Rao', '+919800000005', timezone('utc', now() - interval '2 hours'))
on conflict (external_customer_id) do update
set name = excluded.name, phone = excluded.phone;

-- 2. SEED OPEN CONVERSATIONS
insert into public.conversations (id, customer_id, status, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'open', timezone('utc', now() - interval '2 days'), timezone('utc', now() - interval '10 minutes')),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'open', timezone('utc', now() - interval '1 day'), timezone('utc', now() - interval '20 minutes')),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'open', timezone('utc', now() - interval '12 hours'), timezone('utc', now() - interval '30 minutes')),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'open', timezone('utc', now() - interval '6 hours'), timezone('utc', now() - interval '45 minutes')),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'open', timezone('utc', now() - interval '2 hours'), timezone('utc', now() - interval '5 minutes'))
on conflict (id) do nothing;

-- 3. SEED MESSAGES MATCHING ASSESSMENT SCENARIOS
insert into public.messages (id, external_message_id, conversation_id, sender_type, message_text, created_at)
values
  ('30000000-0000-0000-0000-000000000001', 'msg_88213', '20000000-0000-0000-0000-000000000001', 'customer', 'Hi, my order #4471 hasn''t arrived yet. Can I change the delivery address?', timezone('utc', now() - interval '10 minutes')),
  ('30000000-0000-0000-0000-000000000002', 'msg_88214', '20000000-0000-0000-0000-000000000002', 'customer', 'What is your return policy?', timezone('utc', now() - interval '20 minutes')),
  ('30000000-0000-0000-0000-000000000003', 'msg_88215', '20000000-0000-0000-0000-000000000003', 'customer', 'Do you deliver to Dubai?', timezone('utc', now() - interval '30 minutes')),
  ('30000000-0000-0000-0000-000000000004', 'msg_88216', '20000000-0000-0000-0000-000000000004', 'customer', 'Is cash on delivery available for a ₹3,500 order?', timezone('utc', now() - interval '45 minutes')),
  ('30000000-0000-0000-0000-000000000005', 'msg_88217', '20000000-0000-0000-0000-000000000005', 'customer', 'I think I''m allergic to the serum I bought. What should I do?', timezone('utc', now() - interval '5 minutes'))
on conflict (id) do nothing;

-- 4. SEED AI-GENERATED PENDING DRAFTS (POLICY-COMPLIANT)
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

-- 5. SEED SAMPLE WEBHOOK EVENT (AUDIT LOG)
insert into public.webhook_events (id, event_id, processing_status, error_message, received_at, processed_at)
values
  ('50000000-0000-0000-0000-000000000001', 'evt_7f3a91c2', 'processed', null, timezone('utc', now() - interval '10 minutes'), timezone('utc', now() - interval '10 minutes'))
on conflict (event_id) do nothing;
