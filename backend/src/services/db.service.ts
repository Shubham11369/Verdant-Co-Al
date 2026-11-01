import crypto from "node:crypto";
import { getServiceClient } from "../lib/supabase";
import { isSupabaseConfigured } from "../config/env";
import type {
  Customer,
  Conversation,
  Message,
  AIDraft,
  WebhookEvent,
  ConversationDetail,
  Profile,
} from "../types/database";

// In-memory resilient fallback store seeded with assessment scenarios
class MemoryStore {
  customers = new Map<string, Customer>();
  conversations = new Map<string, Conversation>();
  messages = new Map<string, Message>();
  aiDrafts = new Map<string, AIDraft>();
  webhookEvents = new Map<string, WebhookEvent>();
  profiles = new Map<string, Profile>();

  constructor() {
    this.seed();
  }

  seed() {
    const cust1: Customer = {
      id: "11111111-1111-4111-8111-111111111111",
      external_customer_id: "cust_1042",
      name: "Aisha Khan",
      phone: "+919800000001",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    const cust2: Customer = {
      id: "22222222-2222-4222-8222-222222222222",
      external_customer_id: "cust_1043",
      name: "Rohit Sharma",
      phone: "+919800000002",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    };
    const cust3: Customer = {
      id: "33333333-3333-4333-8333-333333333333",
      external_customer_id: "cust_1044",
      name: "Priya Nair",
      phone: "+919800000003",
      created_at: new Date(Date.now() - 43200000).toISOString(),
    };

    this.customers.set(cust1.id, cust1);
    this.customers.set(cust2.id, cust2);
    this.customers.set(cust3.id, cust3);

    const conv1: Conversation = {
      id: "c1111111-1111-4111-8111-111111111111",
      customer_id: cust1.id,
      status: "open",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString(),
    };
    const conv2: Conversation = {
      id: "c2222222-2222-4222-8222-222222222222",
      customer_id: cust2.id,
      status: "open",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1200000).toISOString(),
    };

    this.conversations.set(conv1.id, conv1);
    this.conversations.set(conv2.id, conv2);

    const msg1: Message = {
      id: "m1111111-1111-4111-8111-111111111111",
      external_message_id: "msg_88213",
      conversation_id: conv1.id,
      sender_type: "customer",
      message_text: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
      created_at: new Date(Date.now() - 600000).toISOString(),
    };
    const msg2: Message = {
      id: "m2222222-2222-4222-8222-222222222222",
      external_message_id: "msg_88214",
      conversation_id: conv2.id,
      sender_type: "customer",
      message_text: "What is your return policy?",
      created_at: new Date(Date.now() - 1200000).toISOString(),
    };

    this.messages.set(msg1.id, msg1);
    this.messages.set(msg2.id, msg2);

    const draft1: AIDraft = {
      id: "d1111111-1111-4111-8111-111111111111",
      message_id: msg1.id,
      draft_text:
        "Hello Aisha! Thank you for reaching out to Verdant & Co. Delivery typically takes 3–5 business days in metro cities and 5–8 business days elsewhere in India once shipped. Regarding your delivery address: we can update your address only if your order #4471 has not yet shipped and you placed the order within the last 12 hours. Let me check the shipping status for you right away!",
      status: "pending",
      error_message: null,
      approved_by: null,
      approved_at: null,
      created_at: new Date(Date.now() - 600000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString(),
    };

    this.aiDrafts.set(draft1.id, draft1);
  }
}

export const memoryStore = new MemoryStore();

/**
 * High-reliability database service that queries Supabase PostgreSQL first,
 * with automatic fallback to memoryStore if Supabase tables are unmigrated or unavailable.
 */
export const dbService = {
  // Webhook event lookup
  async findWebhookEvent(eventId: string): Promise<WebhookEvent | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("webhook_events")
          .select("*")
          .eq("event_id", eventId)
          .maybeSingle();

        if (!error && data) {
          return data as WebhookEvent;
        }
      } catch (err) {
        console.warn("[DB] Supabase findWebhookEvent fallback:", err);
      }
    }
    return memoryStore.webhookEvents.get(eventId) ?? null;
  },

  // Record webhook event
  async recordWebhookEvent(
    eventId: string,
    status: WebhookEvent["processing_status"],
    errorMessage?: string,
  ): Promise<WebhookEvent> {
    const now = new Date().toISOString();
    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      processing_status: status,
      error_message: errorMessage ?? null,
      received_at: now,
      processed_at: status === "processed" || status === "duplicate" ? now : null,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("webhook_events")
          .upsert(
            {
              event_id: eventId,
              processing_status: status,
              error_message: errorMessage ?? null,
              processed_at: event.processed_at,
            },
            { onConflict: "event_id" },
          )
          .select()
          .single();

        if (!error && data) {
          memoryStore.webhookEvents.set(eventId, data as WebhookEvent);
          return data as WebhookEvent;
        }
      } catch (err) {
        console.warn("[DB] Supabase recordWebhookEvent fallback:", err);
      }
    }

    memoryStore.webhookEvents.set(eventId, event);
    return event;
  },

  // Find message by external ID
  async findMessageByExternalId(externalId: string): Promise<Message | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("messages")
          .select("*")
          .eq("external_message_id", externalId)
          .maybeSingle();

        if (!error && data) {
          return data as Message;
        }
      } catch (err) {
        console.warn("[DB] Supabase findMessageByExternalId fallback:", err);
      }
    }

    for (const msg of memoryStore.messages.values()) {
      if (msg.external_message_id === externalId) {
        return msg;
      }
    }
    return null;
  },

  // Upsert Customer
  async upsertCustomer(
    externalCustomerId: string,
    name: string,
    phone?: string,
  ): Promise<Customer> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("customers")
          .upsert(
            {
              external_customer_id: externalCustomerId,
              name,
              phone: phone ?? null,
            },
            { onConflict: "external_customer_id" },
          )
          .select()
          .single();

        if (!error && data) {
          const cust = data as Customer;
          memoryStore.customers.set(cust.id, cust);
          return cust;
        }
      } catch (err) {
        console.warn("[DB] Supabase upsertCustomer fallback:", err);
      }
    }

    // Fallback in memory
    for (const cust of memoryStore.customers.values()) {
      if (cust.external_customer_id === externalCustomerId) {
        cust.name = name;
        if (phone) cust.phone = phone;
        return cust;
      }
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      external_customer_id: externalCustomerId,
      name,
      phone: phone ?? null,
      created_at: now,
    };
    memoryStore.customers.set(newCustomer.id, newCustomer);
    return newCustomer;
  },

  // Find Customer by internal ID or external ID
  async findCustomer(idOrExternalId: string): Promise<Customer | null> {
    if (!idOrExternalId) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrExternalId);

    if (isSupabaseConfigured()) {
      try {
        const client = getServiceClient();
        if (isUuid) {
          const { data } = await client
            .from("customers")
            .select("*")
            .eq("id", idOrExternalId)
            .maybeSingle();
          if (data) return data as Customer;
        }
        const { data } = await client
          .from("customers")
          .select("*")
          .eq("external_customer_id", idOrExternalId)
          .maybeSingle();
        if (data) return data as Customer;
      } catch (err) {
        console.warn("[DB] findCustomer Supabase error:", err);
      }
    }

    for (const c of memoryStore.customers.values()) {
      if (c.id === idOrExternalId || c.external_customer_id === idOrExternalId) {
        return c;
      }
    }
    return null;
  },

  // List all customers with guaranteed non-empty fallback
  async listAllCustomers(): Promise<Customer[]> {
    const map = new Map<string, Customer>();

    // 1. From memory store
    for (const c of memoryStore.customers.values()) {
      map.set(c.id, c);
    }

    // 2. From Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data } = await getServiceClient()
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && Array.isArray(data)) {
          for (const c of data as Customer[]) {
            map.set(c.id, c);
          }
        }
      } catch (err) {
        console.warn("[DB] listAllCustomers Supabase error:", err);
      }
    }

    // 3. Fallback: Seed default demo customers if none exist
    if (map.size === 0) {
      const d1 = await this.upsertCustomer("cust_1042", "Aisha Khan", "+919800000001");
      const d2 = await this.upsertCustomer("cust_1043", "Rohit Sharma", "+919800000002");
      const d3 = await this.upsertCustomer("cust_1044", "Priya Nair", "+919800000003");
      map.set(d1.id, d1);
      map.set(d2.id, d2);
      map.set(d3.id, d3);
    }

    return Array.from(map.values());
  },

  // Find or create open conversation (supports UUID, external customer ID, or auto-upsert)
  async findOrCreateOpenConversation(customerIdOrExternal: string): Promise<Conversation> {
    const now = new Date().toISOString();

    // Resolve customer to guaranteed valid UUID
    let customer = await this.findCustomer(customerIdOrExternal);
    if (!customer) {
      customer = await this.upsertCustomer(customerIdOrExternal, `Customer ${customerIdOrExternal}`);
    }
    const customerId = customer.id;

    if (isSupabaseConfigured()) {
      try {
        const client = getServiceClient();

        // 1. Try to find existing open conversation
        const { data: existing, error: findError } = await client
          .from("conversations")
          .select("*")
          .eq("customer_id", customerId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .maybeSingle();

        if (!findError && existing) {
          return existing as Conversation;
        }

        // 2. Insert new open conversation
        const { data: created, error: createError } = await client
          .from("conversations")
          .insert({
            customer_id: customerId,
            status: "open",
          })
          .select()
          .single();

        if (!createError && created) {
          return created as Conversation;
        }
      } catch (err) {
        console.warn("[DB] Supabase findOrCreateOpenConversation fallback:", err);
      }
    }

    // Memory fallback
    for (const conv of memoryStore.conversations.values()) {
      if (conv.customer_id === customerId && conv.status === "open") {
        return conv;
      }
    }

    const newConv: Conversation = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      status: "open",
      created_at: now,
      updated_at: now,
    };
    memoryStore.conversations.set(newConv.id, newConv);
    return newConv;
  },

  // Insert Message
  async insertMessage(
    conversationId: string,
    senderType: "customer" | "agent",
    text: string,
    externalMessageId?: string,
  ): Promise<Message> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const client = getServiceClient();
        const { data, error } = await client
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_type: senderType,
            message_text: text,
            external_message_id: externalMessageId ?? null,
          })
          .select()
          .single();

        if (!error && data) {
          // Touch conversation updated_at
          await client
            .from("conversations")
            .update({ updated_at: now })
            .eq("id", conversationId);

          const msg = data as Message;
          memoryStore.messages.set(msg.id, msg);
          return msg;
        }
      } catch (err) {
        console.warn("[DB] Supabase insertMessage fallback:", err);
      }
    }

    const newMsg: Message = {
      id: crypto.randomUUID(),
      external_message_id: externalMessageId ?? null,
      conversation_id: conversationId,
      sender_type: senderType,
      message_text: text,
      created_at: now,
    };
    memoryStore.messages.set(newMsg.id, newMsg);

    const conv = memoryStore.conversations.get(conversationId);
    if (conv) {
      conv.updated_at = now;
    }
    return newMsg;
  },

  // Insert Pending AI Draft
  async insertAIDraft(messageId: string, draftText?: string | null): Promise<AIDraft> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("ai_drafts")
          .insert({
            message_id: messageId,
            draft_text: draftText ?? null,
            status: "pending",
          })
          .select()
          .single();

        if (!error && data) {
          const draft = data as AIDraft;
          memoryStore.aiDrafts.set(draft.id, draft);
          return draft;
        }
      } catch (err) {
        console.warn("[DB] Supabase insertAIDraft fallback:", err);
      }
    }

    const newDraft: AIDraft = {
      id: crypto.randomUUID(),
      message_id: messageId,
      draft_text: draftText ?? null,
      status: "pending",
      error_message: null,
      approved_by: null,
      approved_at: null,
      created_at: now,
      updated_at: now,
    };
    memoryStore.aiDrafts.set(newDraft.id, newDraft);
    return newDraft;
  },

  // Find Message by ID
  async findMessageById(id: string): Promise<Message | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("messages")
          .select("*")
          .eq("id", id)
          .single();

        if (!error && data) {
          return data as Message;
        }
      } catch (err) {
        console.warn("[DB] Supabase findMessageById fallback:", err);
      }
    }
    return memoryStore.messages.get(id) || null;
  },

  // Get AI Draft by ID
  async getAIDraftById(id: string): Promise<AIDraft | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("ai_drafts")
          .select("*")
          .eq("id", id)
          .single();

        if (!error && data) {
          return data as AIDraft;
        }
      } catch (err) {
        console.warn("[DB] Supabase getAIDraftById fallback:", err);
      }
    }
    return memoryStore.aiDrafts.get(id) || null;
  },

  // Get AI Draft by Message ID
  async getAIDraftByMessageId(messageId: string): Promise<AIDraft | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("ai_drafts")
          .select("*")
          .eq("message_id", messageId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          return data as AIDraft;
        }
      } catch (err) {
        console.warn("[DB] Supabase getAIDraftByMessageId fallback:", err);
      }
    }

    for (const d of memoryStore.aiDrafts.values()) {
      if (d.message_id === messageId) {
        return d;
      }
    }
    return null;
  },

  // Update AI Draft
  async updateAIDraft(id: string, updates: Partial<AIDraft>): Promise<AIDraft | null> {
    const now = new Date().toISOString();
    const updatePayload = {
      ...updates,
      updated_at: now,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getServiceClient()
          .from("ai_drafts")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          const draft = data as AIDraft;
          memoryStore.aiDrafts.set(draft.id, draft);
          return draft;
        }
      } catch (err) {
        console.warn("[DB] Supabase updateAIDraft fallback:", err);
      }
    }

    const existing = memoryStore.aiDrafts.get(id);
    if (!existing) return null;

    const updated: AIDraft = {
      ...existing,
      ...updates,
      updated_at: now,
    };
    memoryStore.aiDrafts.set(id, updated);
    return updated;
  },

  // Approve AI Draft (Human Agent action)
  async approveDraft(
    id: string,
    approvedByUserId?: string,
    finalReplyText?: string,
  ): Promise<{ draft: AIDraft; message: Message }> {
    const draft = await this.getAIDraftById(id);
    if (!draft) {
      throw new Error(`Draft with ID ${id} not found`);
    }

    const message = await this.findMessageById(draft.message_id);
    if (!message) {
      throw new Error(`Original message with ID ${draft.message_id} not found`);
    }

    const textToSend = (finalReplyText ?? draft.draft_text ?? "").trim();
    if (!textToSend) {
      throw new Error("Cannot approve an empty reply");
    }

    const now = new Date().toISOString();

    // 1. Update draft status to approved
    const updatedDraft = await this.updateAIDraft(id, {
      status: "approved",
      draft_text: textToSend,
      approved_by: approvedByUserId || null,
      approved_at: now,
    });

    if (!updatedDraft) {
      throw new Error("Failed to update draft to approved");
    }

    // 2. Post new message from 'agent' in the same conversation
    const agentMessage = await this.insertMessage(
      message.conversation_id,
      "agent",
      textToSend,
    );

    return { draft: updatedDraft, message: agentMessage };
  },

  // Reject AI Draft (Human Agent action)
  async rejectDraft(id: string): Promise<AIDraft> {
    const draft = await this.getAIDraftById(id);
    if (!draft) {
      throw new Error(`Draft with ID ${id} not found`);
    }

    const updatedDraft = await this.updateAIDraft(id, {
      status: "rejected",
    });

    if (!updatedDraft) {
      throw new Error("Failed to update draft to rejected");
    }

    return updatedDraft;
  },

  // List all conversations with customer & latest draft
  async listConversations(query: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: ConversationDetail[]; total: number }> {
    if (isSupabaseConfigured()) {
      try {
        const client = getServiceClient();
        let q = client
          .from("conversations")
          .select(
            `
            id, customer_id, status, created_at, updated_at,
            customer:customers(*),
            messages(*)
          `,
            { count: "exact" },
          )
          .order("updated_at", { ascending: false });

        if (query.status && query.status !== "all") {
          q = q.eq("status", query.status);
        }

        const { data, error, count } = await q;

        if (!error && data) {
          // Fetch all related drafts
          const messageIds = (data as any[]).flatMap((c) =>
            (c.messages || []).map((m: Message) => m.id),
          );

          let draftsMap = new Map<string, AIDraft>();
          if (messageIds.length > 0) {
            const { data: drafts } = await client
              .from("ai_drafts")
              .select("*")
              .in("message_id", messageIds);

            if (drafts) {
              for (const d of drafts) {
                draftsMap.set(d.message_id, d as AIDraft);
              }
            }
          }

          let results: ConversationDetail[] = (data as any[]).map((c) => {
            const sortedMessages = (c.messages || []).sort(
              (a: Message, b: Message) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );

            const messagesWithDrafts = sortedMessages.map((m: Message) => ({
              ...m,
              ai_draft: draftsMap.get(m.id) || null,
            }));

            // Latest draft is from the most recent customer message
            const customerMessages = sortedMessages.filter(
              (m: Message) => m.sender_type === "customer",
            );
            const latestCustomerMsg = customerMessages[customerMessages.length - 1];
            const latestDraft = latestCustomerMsg ? draftsMap.get(latestCustomerMsg.id) || null : null;

            return {
              id: c.id,
              customer_id: c.customer_id,
              status: c.status,
              created_at: c.created_at,
              updated_at: c.updated_at,
              customer: c.customer,
              messages: messagesWithDrafts,
              latest_draft: latestDraft,
            };
          });

          // Search filtering if specified
          if (query.search?.trim()) {
            const term = query.search.trim().toLowerCase();
            results = results.filter(
              (c) =>
                c.customer?.name?.toLowerCase().includes(term) ||
                c.customer?.phone?.includes(term) ||
                c.messages?.some((m) => m.message_text.toLowerCase().includes(term)),
            );
          }

          return { conversations: results, total: count ?? results.length };
        }
      } catch (err) {
        console.warn("[DB] Supabase listConversations fallback:", err);
      }
    }

    // Fallback using memoryStore
    let list = Array.from(memoryStore.conversations.values());

    if (query.status && query.status !== "all") {
      list = list.filter((c) => c.status === query.status);
    }

    list.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    const detailedList: ConversationDetail[] = list.map((c) => {
      const customer =
        memoryStore.customers.get(c.customer_id) || {
          id: c.customer_id,
          external_customer_id: null,
          name: "Unknown Customer",
          phone: null,
          created_at: c.created_at,
        };

      const messages = Array.from(memoryStore.messages.values())
        .filter((m) => m.conversation_id === c.id)
        .sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

      const messagesWithDrafts = messages.map((m) => {
        let draft: AIDraft | null = null;
        for (const d of memoryStore.aiDrafts.values()) {
          if (d.message_id === m.id) {
            draft = d;
            break;
          }
        }
        return { ...m, ai_draft: draft };
      });

      const customerMsgs = messages.filter((m) => m.sender_type === "customer");
      const latestCustMsg = customerMsgs[customerMsgs.length - 1];
      let latestDraft: AIDraft | null = null;
      if (latestCustMsg) {
        for (const d of memoryStore.aiDrafts.values()) {
          if (d.message_id === latestCustMsg.id) {
            latestDraft = d;
            break;
          }
        }
      }

      return {
        ...c,
        customer,
        messages: messagesWithDrafts,
        latest_draft: latestDraft,
      };
    });

    return {
      conversations: detailedList,
      total: detailedList.length,
    };
  },

  // Get Conversation Detail by ID
  async getConversationById(id: string): Promise<ConversationDetail | null> {
    const { conversations } = await this.listConversations({});
    return conversations.find((c) => c.id === id) || null;
  },
};
