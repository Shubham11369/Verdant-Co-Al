import type { Request, Response } from "express";
import { dbService } from "../services/db.service";
import { ConversationQuerySchema } from "../utils/validators";

/**
 * GET /api/conversations
 * List conversations with customer details and latest message/draft info.
 */
export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = ConversationQuerySchema.safeParse(req.query);
    const query = parseResult.success ? parseResult.data : {};

    const data = await dbService.listConversations(query);

    res.status(200).json({
      status: "success",
      count: data.conversations.length,
      total: data.total,
      conversations: data.conversations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load conversations";
    console.error("[API] getConversations error:", error);
    res.status(500).json({ error: "Internal Server Error", message });
  }
}

/**
 * GET /api/conversations/:id
 * Retrieve a single conversation's full thread, customer details, and drafts.
 */
export async function getConversationById(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const conversation = await dbService.getConversationById(id);
    if (!conversation) {
      res.status(404).json({
        error: "Not Found",
        message: `Conversation ${id} not found`,
      });
      return;
    }

    res.status(200).json({
      status: "success",
      conversation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load conversation";
    console.error(`[API] getConversationById ${id} error:`, error);
    res.status(500).json({ error: "Internal Server Error", message });
  }
}

/**
 * GET /api/customers/:id/conversations
 * Retrieve conversations for a specific customer ID.
 */
export async function getCustomerConversations(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const { conversations } = await dbService.listConversations({});
    const customerConversations = conversations.filter(
      (c) => c.customer_id === id || c.customer?.external_customer_id === id,
    );

    res.status(200).json({
      status: "success",
      count: customerConversations.length,
      conversations: customerConversations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customer conversations";
    res.status(500).json({ error: "Internal Server Error", message });
  }
}
