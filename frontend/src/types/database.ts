export type UserRole = "admin" | "agent";
export type ConversationStatus = "open" | "closed";
export type SenderType = "customer" | "agent";
export type DraftStatus = "pending" | "approved" | "rejected" | "failed";
export type WebhookProcessingStatus = "received" | "processed" | "duplicate" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: string;
  external_customer_id: string | null;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  external_message_id: string | null;
  conversation_id: string;
  sender_type: SenderType;
  message_text: string;
  created_at: string;
}

export interface AIDraft {
  id: string;
  message_id: string;
  draft_text: string | null;
  status: DraftStatus;
  error_message: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  event_id: string;
  processing_status: WebhookProcessingStatus;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

export interface ConversationDetail extends Conversation {
  customer: Customer;
  messages: Array<Message & { ai_draft?: AIDraft | null }>;
  latest_draft?: AIDraft | null;
}
