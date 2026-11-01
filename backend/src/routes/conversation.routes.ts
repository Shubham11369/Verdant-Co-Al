import { Router } from "express";
import { requireAgent } from "../middleware/requireAgent";
import {
  getConversations,
  getConversationById,
  getCustomerConversations,
} from "../controllers/conversation.controller";

export const conversationRouter = Router();

// Agent-authenticated endpoints
conversationRouter.get("/api/conversations", requireAgent, getConversations);
conversationRouter.get("/api/conversations/:id", requireAgent, getConversationById);
conversationRouter.get(
  "/api/customers/:id/conversations",
  requireAgent,
  getCustomerConversations,
);
