import type { Request, Response } from "express";
import { z } from "zod";
import { dbService } from "../services/db.service";
import { aiService } from "../services/ai/aiService";

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

const SendMessageSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  message_text: z.string().min(1, "Message cannot be empty"),
});

/**
 * GET /api/customer/customers
 * Returns available customers for demo / testing.
 */
export async function getDemoCustomers(_req: Request, res: Response): Promise<void> {
  try {
    const customers = await dbService.listAllCustomers();

    res.status(200).json({
      status: "success",
      customers,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
}

/**
 * POST /api/customer/create
 * Creates a new test customer with name & phone.
 */
export async function createCustomer(req: Request, res: Response): Promise<void> {
  const parseResult = CreateCustomerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parseResult.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  const { name, phone } = parseResult.data;
  const externalId = `cust_${Date.now().toString().slice(-6)}`;

  try {
    const customer = await dbService.upsertCustomer(externalId, name, phone ?? undefined);
    const conversation = await dbService.findOrCreateOpenConversation(customer.id);

    res.status(201).json({
      status: "success",
      customer,
      conversation_id: conversation.id,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create customer" });
  }
}

/**
 * GET /api/customer/conversation/:customerId
 * Fetches conversation and customer message history.
 * CRITICAL RULE: NEVER EXPOSE PENDING OR REJECTED AI DRAFTS TO CUSTOMERS.
 * ONLY APPROVED AGENT MESSAGES ARE INCLUDED.
 */
export async function getCustomerConversation(req: Request, res: Response): Promise<void> {
  const customerId = String(req.params.customerId);

  try {
    const conversation = await dbService.findOrCreateOpenConversation(customerId);
    const detailed = await dbService.getConversationById(conversation.id);

    if (!detailed) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Filter messages: Include customer messages and agent messages only.
    // Strip all internal ai_draft objects completely!
    const sanitizedMessages = (detailed.messages || []).map((m) => ({
      id: m.id,
      sender_type: m.sender_type,
      message_text: m.message_text,
      created_at: m.created_at,
    }));

    res.status(200).json({
      status: "success",
      conversation_id: detailed.id,
      customer: detailed.customer,
      messages: sanitizedMessages,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
}

/**
 * POST /api/customer/message
 * Customer sends a message.
 * Saves message and triggers AI draft generation for human agent review.
 */
export async function sendCustomerMessage(req: Request, res: Response): Promise<void> {
  const parseResult = SendMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parseResult.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  const { customer_id, message_text } = parseResult.data;

  try {
    const conversation = await dbService.findOrCreateOpenConversation(customer_id);

    // Persist customer message
    const message = await dbService.insertMessage(
      conversation.id,
      "customer",
      message_text,
    );

    // Trigger AI draft generation for agent dashboard
    try {
      await aiService.generateDraftForMessage(message.id);
    } catch (err) {
      console.warn("[CustomerMsg] AI draft generation fallback error:", err);
    }

    res.status(200).json({
      status: "success",
      message: {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_type: message.sender_type,
        message_text: message.message_text,
        created_at: message.created_at,
      },
    });
  } catch (err) {
    console.error("[CustomerMsg] Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
}
