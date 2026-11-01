import { z } from "zod";

export const WebhookPayloadSchema = z.object({
  event_id: z.string().min(1, "event_id is required"),
  type: z.string().default("message.received"),
  brand_id: z.string().optional(),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  customer: z.object({
    id: z.string().min(1, "customer.id is required"),
    name: z.string().min(1, "customer.name is required"),
    phone: z.string().optional(),
  }),
  message: z.object({
    id: z.string().min(1, "message.id is required"),
    type: z.string().default("text"),
    text: z.string().min(1, "message.text is required"),
  }),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export const ConversationQuerySchema = z.object({
  status: z.enum(["open", "closed", "all"]).optional().default("all"),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;
